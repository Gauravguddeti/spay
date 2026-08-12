import { scanGmailForSubscriptions } from "./lib/integrations/gmail"

// Mock database query for fuzzy match
const mockExistingSubs = [
  { name: "Google Workspace" },
  { name: "My Startup OpenAI" },
]

// Expose mock db
jestMockDb()

function jestMockDb() {
  const { db } = require("./lib/db")
  // Extremely hacky override for testing
  db.select = () => ({
    from: () => ({
      where: async () => mockExistingSubs,
    }),
  })
}

// Generate 500 mock emails
const mockEmails: Array<{from: string, subject: string, snippet: string}> = []

// 1. Noise emails (300)
for (let i = 0; i < 300; i++) {
  mockEmails.push({
    from: "marketing@random.com",
    subject: "Check out our new features",
    snippet: "We just launched something amazing."
  })
}

// 2. Exact known vendors duplicated across 12 months (Netflix)
for (let i = 1; i <= 12; i++) {
  mockEmails.push({
    from: "billing@netflix.com",
    subject: `Netflix Invoice for Month ${i}`,
    snippet: "We charged you $15.99 USD."
  })
}

// 3. Exact known vendors (Figma) - 5 months
for (let i = 1; i <= 5; i++) {
  mockEmails.push({
    from: "billing@figma.com",
    subject: "Figma Receipt",
    snippet: "Total $25.00 USD"
  })
}

// 4. Fuzzy known vendor ("Netflix Inc" from unknown domain)
mockEmails.push({
  from: '"Netflix Inc." <noreply@netflix-billing.com>',
  subject: "Your Netflix Receipt",
  snippet: "Total $15.99 USD"
})

// 5. Fuzzy existing subscription ("Google Workspace")
mockEmails.push({
  from: '"GSuite Workspace" <billing@google.com>',
  subject: "GSuite Payment",
  snippet: "Total $6.00 USD"
})

// 6. Unknown heuristic generic domain (Acme Corp) - 3 months
for (let i = 1; i <= 3; i++) {
  mockEmails.push({
    from: '"Acme Corp Billing" <billing@acmecorp.com>',
    subject: "Acme Corp Subscription",
    snippet: "Total $49.00 USD"
  })
}

// Fill remaining to 500
const remaining = 500 - mockEmails.length
for (let i = 0; i < remaining; i++) {
  mockEmails.push({
    from: "noreply@github.com", // This will be ignored unless it has an amount
    subject: "Security update",
    snippet: "Please update your password."
  })
}

// Shuffle array
mockEmails.sort(() => Math.random() - 0.5)

global.fetch = async (url: string) => {
  // Exchange rate API
  if (url.includes('open.er-api.com')) {
    return {
      ok: true,
      json: async () => ({ rates: { USD: 1, INR: 84, EUR: 0.9, GBP: 0.8 } })
    }
  }

  // Gmail List
  if (url.includes('messages?q=')) {
    // Pagination logic
    const pageToken = new URL(url).searchParams.get("pageToken")
    const page = pageToken ? parseInt(pageToken) : 0
    const start = page * 100
    const batch = mockEmails.slice(start, start + 100)
    
    return {
      ok: true,
      json: async () => ({
        messages: batch.map((_, i) => ({ id: (start + i).toString(), threadId: "t" })),
        nextPageToken: start + 100 < mockEmails.length ? (page + 1).toString() : undefined
      })
    }
  }
  
  // Gmail Detail
  if (url.includes('messages/')) {
    const id = parseInt(url.split('messages/')[1].split('?')[0])
    const email = mockEmails[id]
    if (!email) return { ok: false }
    
    return {
      ok: true,
      json: async () => ({
        id: id.toString(),
        payload: {
          headers: [
            { name: "From", value: email.from },
            { name: "Subject", value: email.subject },
            // Ensure sequential date for dedupe test (earliest first in array generation)
            { name: "Date", value: new Date(Date.now() - (500 - id) * 86400000).toUTCString() }
          ]
        },
        snippet: email.snippet
      })
    }
  }
  
  return { ok: false }
}

async function runTest() {
  console.log("Running Gmail Scale Test...")
  const start = Date.now()
  const results = await scanGmailForSubscriptions("fake-token", "fake-org-id")
  const duration = Date.now() - start
  
  console.log(`Scan completed in ${duration}ms.`)
  console.log(`Detected ${results.length} deduplicated subscriptions out of ${mockEmails.length} mock emails.`)
  
  results.forEach(r => {
    console.log(`- [${r.confidence.toFixed(2)}] ${r.name} (${r.amountInr} INR / ${r.originalAmount} ${r.originalCurrency})`)
  })
}

runTest().catch(console.error)
