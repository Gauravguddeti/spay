/**
 * Bank Statement Parser for Spendly
 *
 * Parses raw text extracted from PDF bank statements (HDFC, ICICI, SBI, Axis, Kotak, Yes Bank).
 * Detects SaaS vendor charges, extracts amounts, converts USD→INR, assigns categories.
 */

export type DetectedTransaction = {
  name: string
  vendorKey: string
  amountInr: number
  originalAmount: number
  originalCurrency: string
  date: string | null
  confidence: "high" | "medium" | "low"
  category: string
}

// ---------------------------------------------------------------------------
// Vendor map — keyword → { display name, category }
// ---------------------------------------------------------------------------
const VENDOR_MAP: Record<string, { name: string; category: string; aliases: string[] }> = {
  notion:       { name: "Notion",        category: "Productivity",    aliases: ["notion"] },
  slack:        { name: "Slack",         category: "Communication",   aliases: ["slack"] },
  figma:        { name: "Figma",         category: "Design",          aliases: ["figma"] },
  zoom:         { name: "Zoom",          category: "Communication",   aliases: ["zoom"] },
  github:       { name: "GitHub",        category: "DevTools",        aliases: ["github", "git hub"] },
  gitlab:       { name: "GitLab",        category: "DevTools",        aliases: ["gitlab"] },
  netlify:      { name: "Netlify",       category: "DevTools",        aliases: ["netlify"] },
  vercel:       { name: "Vercel",        category: "DevTools",        aliases: ["vercel"] },
  aws:          { name: "AWS",           category: "DevTools",        aliases: ["amazon web services", "aws", "amazonaws"] },
  googlecloud:  { name: "Google Cloud",  category: "DevTools",        aliases: ["google cloud", "gcp"] },
  digitalocean: { name: "DigitalOcean", category: "DevTools",        aliases: ["digitalocean", "digital ocean"] },
  heroku:       { name: "Heroku",        category: "DevTools",        aliases: ["heroku"] },
  linear:       { name: "Linear",        category: "Productivity",    aliases: ["linear app", "linear.app"] },
  loom:         { name: "Loom",          category: "Productivity",    aliases: ["loom"] },
  calendly:     { name: "Calendly",      category: "Productivity",    aliases: ["calendly"] },
  typeform:     { name: "Typeform",      category: "Marketing",       aliases: ["typeform"] },
  airtable:     { name: "Airtable",      category: "Productivity",    aliases: ["airtable"] },
  webflow:      { name: "Webflow",       category: "Design",          aliases: ["webflow"] },
  framer:       { name: "Framer",        category: "Design",          aliases: ["framer"] },
  canva:        { name: "Canva",         category: "Design",          aliases: ["canva"] },
  adobe:        { name: "Adobe",         category: "Design",          aliases: ["adobe"] },
  spotify:      { name: "Spotify",       category: "Other",           aliases: ["spotify"] },
  chatgpt:      { name: "ChatGPT",       category: "Productivity",    aliases: ["chatgpt", "chat gpt"] },
  openai:       { name: "OpenAI",        category: "Productivity",    aliases: ["openai", "open ai"] },
  anthropic:    { name: "Anthropic",     category: "Productivity",    aliases: ["anthropic", "claude"] },
  postman:      { name: "Postman",       category: "DevTools",        aliases: ["postman"] },
  jira:         { name: "Jira",          category: "Productivity",    aliases: ["jira", "atlassian"] },
  confluence:   { name: "Confluence",    category: "Productivity",    aliases: ["confluence"] },
  dropbox:      { name: "Dropbox",       category: "Productivity",    aliases: ["dropbox"] },
  onepassword:  { name: "1Password",     category: "Other",           aliases: ["1password", "agilebits"] },
  intercom:     { name: "Intercom",      category: "Marketing",       aliases: ["intercom"] },
  hubspot:      { name: "HubSpot",       category: "Marketing",       aliases: ["hubspot", "hub spot"] },
  mailchimp:    { name: "Mailchimp",     category: "Marketing",       aliases: ["mailchimp", "mail chimp"] },
  stripe:       { name: "Stripe",        category: "Finance",         aliases: ["stripe"] },
  razorpay:     { name: "Razorpay",      category: "Finance",         aliases: ["razorpay"] },
  freshdesk:    { name: "Freshdesk",     category: "Communication",   aliases: ["freshdesk"] },
  zoho:         { name: "Zoho",          category: "Productivity",    aliases: ["zoho"] },
  hotjar:       { name: "Hotjar",        category: "Marketing",       aliases: ["hotjar"] },
  mixpanel:     { name: "Mixpanel",      category: "Marketing",       aliases: ["mixpanel"] },
  segment:      { name: "Segment",       category: "Marketing",       aliases: ["segment"] },
  amplitude:    { name: "Amplitude",     category: "Marketing",       aliases: ["amplitude"] },
  microsoft365: { name: "Microsoft 365", category: "Productivity",   aliases: ["microsoft 365", "office 365", "microsoft office"] },
  googleworkspace: { name: "Google Workspace", category: "Productivity", aliases: ["google workspace", "g suite", "gsuite"] },
}

// USD→INR static rate (same as gmail.ts)
const USD_TO_INR = 84

// Amount regex — matches ₹, Rs, USD, or plain numbers after common currency words
const AMOUNT_REGEX =
  /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)|(?:USD|\$)\s*([\d,]+(?:\.\d{1,2})?)|(?:amount|debit|dr)\s*:?\s*([\d,]+(?:\.\d{1,2})?)/gi

// Date regex — matches dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd  
const DATE_REGEX =
  /(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})|(\d{4})[\/\-](\d{2})[\/\-](\d{2})/

function matchVendor(
  line: string,
): { key: string; name: string; category: string; confidence: "high" | "medium" | "low" } | null {
  const lower = line.toLowerCase()

  for (const [key, vendor] of Object.entries(VENDOR_MAP)) {
    for (const alias of vendor.aliases) {
      if (lower.includes(alias)) {
        // Exact keyword match = high confidence
        const isExactWord = new RegExp(`\\b${alias.replace(/\./g, "\\.")}\\b`).test(lower)
        return {
          key,
          name: vendor.name,
          category: vendor.category,
          confidence: isExactWord ? "high" : "medium",
        }
      }
    }
  }

  return null
}

function extractAmount(line: string): { amount: number; currency: string } | null {
  AMOUNT_REGEX.lastIndex = 0
  const matches = [...line.matchAll(AMOUNT_REGEX)]

  for (const match of matches) {
    // INR/₹ match
    const inrRaw = match[1]
    if (inrRaw) {
      const amount = parseFloat(inrRaw.replace(/,/g, ""))
      if (!isNaN(amount) && amount > 0) return { amount, currency: "INR" }
    }

    // USD/$ match
    const usdRaw = match[2]
    if (usdRaw) {
      const amount = parseFloat(usdRaw.replace(/,/g, ""))
      if (!isNaN(amount) && amount > 0) return { amount, currency: "USD" }
    }

    // Plain number (debit/amount label)
    const plainRaw = match[3]
    if (plainRaw) {
      const amount = parseFloat(plainRaw.replace(/,/g, ""))
      if (!isNaN(amount) && amount > 0) return { amount, currency: "INR" }
    }
  }

  return null
}

function extractDate(line: string): string | null {
  const match = line.match(DATE_REGEX)
  if (!match) return null
  try {
    // Try to construct an ISO date for storage
    const full = match[0]
    const parts = full.split(/[\/\-]/)
    if (parts.length !== 3) return null

    let year: string, month: string, day: string
    if (parts[0].length === 4) {
      // yyyy-mm-dd
      ;[year, month, day] = parts
    } else {
      // dd/mm/yyyy or dd/mm/yy
      ;[day, month, year] = parts
      if (year.length === 2) year = `20${year}`
    }

    const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
    if (isNaN(date.getTime())) return null
    return date.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------

export function parseBankStatement(text: string): DetectedTransaction[] {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5)

  const results: DetectedTransaction[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const vendor = matchVendor(line)
    if (!vendor) continue

    // Deduplicate per vendor key
    if (seen.has(vendor.key)) continue

    const amountData = extractAmount(line)
    if (!amountData) continue

    const { amount: originalAmount, currency: originalCurrency } = amountData
    const amountInr =
      originalCurrency === "USD"
        ? Math.round(originalAmount * USD_TO_INR * 100) / 100
        : originalAmount

    seen.add(vendor.key)

    results.push({
      name: vendor.name,
      vendorKey: vendor.key,
      amountInr,
      originalAmount,
      originalCurrency,
      date: extractDate(line),
      confidence: vendor.confidence,
      category: vendor.category,
    })
  }

  // Sort: high confidence first
  return results.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.confidence] - order[b.confidence]
  })
}
