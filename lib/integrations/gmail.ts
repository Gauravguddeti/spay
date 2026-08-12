/**
 * Gmail integration utility for SPAY.
 *
 * Handles:
 * - Access token refresh
 * - Scaled Gmail API search with pagination
 * - Fuzzy vendor matching + heuristics
 * - Deduplication across scans
 * - Live currency conversion to INR
 */

import { distance } from "fastest-levenshtein"
import { db } from "@/lib/db"
import { subscriptions } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DetectedSubscription = {
  name: string
  vendorKey: string
  originalAmount: number
  originalCurrency: string
  amountInr: number
  isApproximateAmount?: boolean
  billingDate: string | null
  confidence: number // 0–1
}

export type GmailTokens = {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: number
}

export type RefreshedTokens = {
  accessToken: string
  accessTokenExpiresAt: number
}

// ---------------------------------------------------------------------------
// Static INR conversion rates (Fallback)
// ---------------------------------------------------------------------------
const INR_RATES: Record<string, number> = {
  INR: 1,
  USD: 84,
  EUR: 91,
  GBP: 107,
  AUD: 55,
  CAD: 62,
  SGD: 63,
  JPY: 0.56,
}

type ExchangeRates = Record<string, number>

async function fetchExchangeRates(): Promise<ExchangeRates | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD")
    if (!res.ok) return null
    const data = await res.json()
    return data?.rates ?? null
  } catch (error) {
    return null
  }
}

function convertToInr(amount: number, currency: string, liveRates?: ExchangeRates | null): number {
  const curr = currency.toUpperCase()
  if (liveRates && liveRates["INR"] && liveRates[curr]) {
    const amountInUsd = amount / liveRates[curr]
    return Math.round(amountInUsd * liveRates["INR"] * 100) / 100
  }
  const rate = INR_RATES[curr] ?? 84 // default to USD rate if unknown
  return Math.round(amount * rate * 100) / 100
}

// ---------------------------------------------------------------------------
// Vendor map (Expanded)
// ---------------------------------------------------------------------------
const VENDOR_MAP: Record<string, { name: string; domains: string[] }> = {
  notion: { name: "Notion", domains: ["notion.so", "notion.com"] },
  figma: { name: "Figma", domains: ["figma.com"] },
  slack: { name: "Slack", domains: ["slack.com"] },
  zoom: { name: "Zoom", domains: ["zoom.us", "zoom.com"] },
  linear: { name: "Linear", domains: ["linear.app"] },
  loom: { name: "Loom", domains: ["loom.com"] },
  vercel: { name: "Vercel", domains: ["vercel.com"] },
  github: { name: "GitHub", domains: ["github.com", "github.githubassets.com"] },
  openai: { name: "OpenAI", domains: ["openai.com", "chatgpt.com"] },
  claude: { name: "Claude / Anthropic", domains: ["anthropic.com", "claude.ai"] },
  canva: { name: "Canva", domains: ["canva.com"] },
  adobe: { name: "Adobe", domains: ["adobe.com"] },
  atlassian: { name: "Atlassian", domains: ["atlassian.com", "atlassian.net"] },
  aws: { name: "AWS", domains: ["amazon.com", "amazonaws.com", "aws.amazon.com"] },
  googleworkspace: { name: "Google Workspace", domains: ["google.com", "workspace.google.com"] },
  microsoft365: { name: "Microsoft 365", domains: ["microsoft.com", "office.com"] },
  calendly: { name: "Calendly", domains: ["calendly.com"] },
  typeform: { name: "Typeform", domains: ["typeform.com"] },
  intercom: { name: "Intercom", domains: ["intercom.com", "intercom.io"] },
  mixpanel: { name: "Mixpanel", domains: ["mixpanel.com"] },
  hotjar: { name: "Hotjar", domains: ["hotjar.com"] },
  netflix: { name: "Netflix", domains: ["netflix.com"] },
  spotify: { name: "Spotify", domains: ["spotify.com"] },
  youtube: { name: "YouTube Premium", domains: ["youtube.com"] },
  disney: { name: "Disney+", domains: ["disneyplus.com"] },
  primevideo: { name: "Prime Video", domains: ["primevideo.com", "amazon.com"] },
  midjourney: { name: "Midjourney", domains: ["midjourney.com"] },
}

function fuzzySimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - distance(a.toLowerCase(), b.toLowerCase()) / maxLen
}

function matchVendor(
  fromAddress: string,
  subject: string,
  existingSubscriptions: Array<{ name: string }>,
): { key: string; name: string; confidence: number } | null {
  const fromLower = fromAddress.toLowerCase()
  const subjectLower = subject.toLowerCase()

  // 1. Check exact matches in VENDOR_MAP
  for (const [key, vendor] of Object.entries(VENDOR_MAP)) {
    // High confidence: domain matches sender
    const domainMatch = vendor.domains.some((d) => fromLower.includes(`@${d}`) || fromLower.includes(`.${d}`))
    if (domainMatch) {
      return { key, name: vendor.name, confidence: 0.95 }
    }
    // Medium confidence: vendor name exactly in subject
    const nameInSubject = subjectLower.includes(key) || subjectLower.includes(vendor.name.toLowerCase())
    if (nameInSubject) {
      return { key, name: vendor.name, confidence: 0.7 }
    }
  }

  // Fallback: extract generic vendor name from sender display name or domain
  const emailMatch = fromAddress.match(/<([^>]+)>/)
  const emailPart = emailMatch ? emailMatch[1] : fromAddress

  let vendorName = "Unknown Vendor"
  let vendorKey = "unknown"

  // Try to extract from the display name part
  const nameMatch = fromAddress.match(/^"?(.*?)"?\s*</)
  if (nameMatch && nameMatch[1].trim()) {
    vendorName = nameMatch[1].trim()
    vendorKey = vendorName.toLowerCase().replace(/[^a-z0-9]/g, "")
  } else {
    // Try to extract from the domain
    const domainMatch = emailPart.match(/@([^.]+)\./)
    if (domainMatch && domainMatch[1]) {
      const domain = domainMatch[1]
      vendorName = domain.charAt(0).toUpperCase() + domain.slice(1)
      vendorKey = domain.toLowerCase()
    }
  }

  // Filter out common generic domains if we relied on them
  const genericDomains = ["gmail", "yahoo", "hotmail", "outlook", "stripe", "paypal", "apple"]
  if (!vendorKey || genericDomains.includes(vendorKey)) {
     return null
  }

  // 2. Fuzzy match against existing subscriptions and known vendors to dedupe aliases
  let bestMatch = { name: vendorName, key: vendorKey, confidence: 0.3 }
  let maxSim = 0

  // Fuzzy match against VENDOR_MAP
  for (const [key, vendor] of Object.entries(VENDOR_MAP)) {
    const sim = fuzzySimilarity(vendorName, vendor.name)
    if (sim > maxSim && sim >= 0.75) {
      maxSim = sim
      bestMatch = { name: vendor.name, key: key, confidence: 0.7 }
    }
  }

  // Fuzzy match against existing subscriptions
  for (const sub of existingSubscriptions) {
    const sim = fuzzySimilarity(vendorName, sub.name)
    if (sim > maxSim && sim >= 0.75) {
      maxSim = sim
      // Use existing subscription name for consistency
      const subKey = sub.name.toLowerCase().replace(/[^a-z0-9]/g, "")
      bestMatch = { name: sub.name, key: subKey, confidence: 0.7 }
    }
  }

  return bestMatch
}

// ---------------------------------------------------------------------------
// Amount + currency extraction
// ---------------------------------------------------------------------------
const AMOUNT_REGEX = /(?:USD|EUR|GBP|AUD|CAD|SGD|INR|Rs\.?|₹|\$|€|£)\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*(?:USD|EUR|GBP|AUD|CAD|SGD|INR)/gi

const CURRENCY_SYMBOLS: Record<string, string> = {
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  "₹": "INR",
  "Rs": "INR",
  "Rs.": "INR",
}

function extractAmountAndCurrency(text: string): {
  amount: number
  currency: string
} | null {
  const matches = text.match(AMOUNT_REGEX)
  if (!matches || matches.length === 0) return null

  const raw = matches[0].trim()

  const codeMatch = raw.match(/USD|EUR|GBP|AUD|CAD|SGD|INR/i)
  let currency = codeMatch ? codeMatch[0].toUpperCase() : "USD"

  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (raw.startsWith(symbol)) {
      currency = code
      break
    }
  }

  const numStr = raw.replace(/[^0-9.]/g, "")
  const amount = parseFloat(numStr)

  if (isNaN(amount) || amount <= 0) return null
  return { amount, currency }
}

// ---------------------------------------------------------------------------
// Token refresh logic
// ---------------------------------------------------------------------------
export async function refreshAccessTokenIfNeeded(tokens: GmailTokens): Promise<RefreshedTokens> {
  const FIVE_MINUTES_MS = 5 * 60 * 1000
  const isExpiringSoon = tokens.accessTokenExpiresAt - Date.now() < FIVE_MINUTES_MS
  const googleClientId = process.env.GOOGLE_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID ?? ""
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? process.env.AUTH_GOOGLE_SECRET ?? ""

  if (!isExpiringSoon) {
    return {
      accessToken: tokens.accessToken,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    }
  }

  if (!googleClientId || !googleClientSecret) {
    throw Object.assign(new Error("Google OAuth environment variables are missing"), {
      code: "GMAIL_AUTH_EXPIRED",
    })
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: googleClientId,
      client_secret: googleClientSecret,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error("[gmail] Token refresh failed:", body)
    throw Object.assign(new Error("Please reconnect your Gmail account"), {
      code: "GMAIL_AUTH_EXPIRED",
    })
  }

  const data = (await response.json()) as {
    access_token: string
    expires_in: number
  }

  return {
    accessToken: data.access_token,
    accessTokenExpiresAt: Date.now() + data.expires_in * 1000,
  }
}

// ---------------------------------------------------------------------------
// Gmail scan
// ---------------------------------------------------------------------------
type GmailMessage = {
  id: string
  threadId: string
}

type GmailMessageDetail = {
  id: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body?: { data?: string }
    parts?: Array<{ mimeType: string; body?: { data?: string } }>
  }
  snippet: string
  internalDate: string
}

function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ""
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function scanGmailForSubscriptions(
  accessToken: string,
  orgId?: string,
): Promise<DetectedSubscription[]> {
  const liveRates = await fetchExchangeRates()

  // Fetch existing subscriptions for fuzzy matching
  let existingSubs: Array<{ name: string }> = []
  if (orgId) {
    existingSubs = await db
      .select({ name: subscriptions.name })
      .from(subscriptions)
      .where(eq(subscriptions.orgId, orgId))
  }

  // Pre-filter tightly: (receipt OR invoice ...) AND (from:billing OR from:receipts OR ...) AND within last year
  const query = encodeURIComponent(
    '(receipt OR invoice OR payment OR subscription OR renewal OR billing) (from:billing OR from:receipts OR from:noreply OR from:no-reply) newer_than:1y',
  )

  const messages: GmailMessage[] = []
  let pageToken: string | undefined = undefined
  let totalFetched = 0
  const MAX_CANDIDATES = 1000

  // 1. Paginate list requests to gather all matching candidates
  do {
    const pageTokenParam = pageToken ? `&pageToken=${pageToken}` : ""
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=100${pageTokenParam}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!listRes.ok) {
      const body = await listRes.text()
      throw new Error(`Gmail list failed: ${listRes.status} ${body}`)
    }

    const listData = (await listRes.json()) as { messages?: GmailMessage[]; nextPageToken?: string }
    
    if (listData.messages) {
      messages.push(...listData.messages)
      totalFetched += listData.messages.length
    }
    
    pageToken = listData.nextPageToken
  } while (pageToken && totalFetched < MAX_CANDIDATES)

  if (messages.length === 0) return []

  // 2. Fetch message details in controlled batches
  const dedupeMap = new Map<string, DetectedSubscription>()
  
  const BATCH_SIZE = 50
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE)
    
    const fetchPromises = batch.map(async (msg) => {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      if (!detailRes.ok) return null
      return (await detailRes.json()) as GmailMessageDetail
    })

    const batchResults = await Promise.all(fetchPromises)

    for (const detail of batchResults) {
      if (!detail) continue

      const headers = detail.payload.headers
      const from = getHeader(headers, "From")
      const subject = getHeader(headers, "Subject")
      const dateStr = getHeader(headers, "Date")

      const vendor = matchVendor(from, subject, existingSubs)
      if (!vendor) continue

      const extracted = extractAmountAndCurrency(`${subject} ${detail.snippet}`)
      if (!extracted) continue

      const amountInr = convertToInr(extracted.amount, extracted.currency, liveRates)
      const isApproximateAmount = extracted.currency.toUpperCase() !== "INR"

      let billingDate: string | null = null
      try {
        billingDate = dateStr ? new Date(dateStr).toISOString().slice(0, 10) : null
      } catch {
        billingDate = null
      }

      const dedupeKey = `${vendor.key}-${extracted.amount}`
      const existing = dedupeMap.get(dedupeKey)

      // Deduplicate: Keep the most recent billing date
      if (!existing || (billingDate && existing.billingDate && billingDate > existing.billingDate)) {
        dedupeMap.set(dedupeKey, {
          name: vendor.name,
          vendorKey: vendor.key,
          originalAmount: extracted.amount,
          originalCurrency: extracted.currency,
          amountInr,
          isApproximateAmount,
          billingDate,
          confidence: vendor.confidence,
        })
      }
    }

    // Add small delay to respect Google's rate limits (max 250 quota units per second)
    if (i + BATCH_SIZE < messages.length) {
      await delay(500)
    }
  }

  return Array.from(dedupeMap.values()).sort((a, b) => b.confidence - a.confidence)
}
