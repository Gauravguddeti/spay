/**
 * Gmail integration utility for SPAY.
 *
 * Handles:
 * - Access token refresh (Google tokens expire after 1 hour)
 * - Gmail API search for subscription-related emails
 * - Vendor matching against a hardcoded map
 * - Currency conversion to INR
 *
 * TODO (v2): Replace static INR conversion rates with live exchange rate API
 * e.g. https://exchangerate-api.com/ free tier
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DetectedSubscription = {
  name: string
  vendorKey: string
  originalAmount: number
  originalCurrency: string
  amountInr: number
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
// Static INR conversion rates
// TODO: replace with live exchange rate API (e.g. exchangerate-api.com free tier) in v2
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

function convertToInr(amount: number, currency: string): number {
  const rate = INR_RATES[currency.toUpperCase()] ?? 84 // default to USD rate if unknown
  return Math.round(amount * rate * 100) / 100
}

// ---------------------------------------------------------------------------
// Vendor map — used to match email senders/subjects to known SaaS tools
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
  openai: { name: "OpenAI / ChatGPT", domains: ["openai.com"] },
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
}

function matchVendor(
  fromAddress: string,
  subject: string,
): { key: string; name: string; confidence: number } | null {
  const fromLower = fromAddress.toLowerCase()
  const subjectLower = subject.toLowerCase()

  for (const [key, vendor] of Object.entries(VENDOR_MAP)) {
    // High confidence: domain matches sender
    const domainMatch = vendor.domains.some((d) => fromLower.includes(d))
    if (domainMatch) {
      return { key, name: vendor.name, confidence: 0.95 }
    }

    // Medium confidence: vendor name in subject
    const nameInSubject = subjectLower.includes(key) || subjectLower.includes(vendor.name.toLowerCase())
    if (nameInSubject) {
      return { key, name: vendor.name, confidence: 0.7 }
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Amount + currency extraction from email subject/snippet
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

  // Try to extract currency code
  const codeMatch = raw.match(/USD|EUR|GBP|AUD|CAD|SGD|INR/i)
  let currency = codeMatch ? codeMatch[0].toUpperCase() : "USD"

  // Try symbol-to-currency
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

export async function scanGmailForSubscriptions(
  accessToken: string,
): Promise<DetectedSubscription[]> {
  const query = encodeURIComponent(
    "subject:(receipt OR invoice OR subscription OR \"payment confirmation\") newer_than:90d",
  )

  // 1. List matching message IDs (max 50)
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!listRes.ok) {
    const body = await listRes.text()
    throw new Error(`Gmail list failed: ${listRes.status} ${body}`)
  }

  const listData = (await listRes.json()) as { messages?: GmailMessage[] }
  const messages = listData.messages ?? []

  if (messages.length === 0) return []

  // 2. Fetch each message detail (in batches of 10 to avoid rate limits)
  const results: DetectedSubscription[] = []
  const seen = new Set<string>()

  for (const msg of messages.slice(0, 30)) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!detailRes.ok) continue

    const detail = (await detailRes.json()) as GmailMessageDetail
    const headers = detail.payload.headers
    const from = getHeader(headers, "From")
    const subject = getHeader(headers, "Subject")
    const dateStr = getHeader(headers, "Date")

    const vendor = matchVendor(from, subject)
    if (!vendor) continue

    // De-duplicate per vendor
    if (seen.has(vendor.key)) continue
    seen.add(vendor.key)

    const extracted = extractAmountAndCurrency(`${subject} ${detail.snippet}`)
    if (!extracted) continue

    const amountInr = convertToInr(extracted.amount, extracted.currency)

    // Try to parse the billing date
    let billingDate: string | null = null
    try {
      billingDate = dateStr ? new Date(dateStr).toISOString().slice(0, 10) : null
    } catch {
      billingDate = null
    }

    results.push({
      name: vendor.name,
      vendorKey: vendor.key,
      originalAmount: extracted.amount,
      originalCurrency: extracted.currency,
      amountInr,
      billingDate,
      confidence: vendor.confidence,
    })
  }

  return results.sort((a, b) => b.confidence - a.confidence)
}
