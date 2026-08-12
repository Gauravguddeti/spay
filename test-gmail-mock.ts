import { scanGmailForSubscriptions } from "./lib/integrations/gmail"

const mockEmails = [
  // Known vendors (in VENDOR_MAP)
  { from: "billing@github.com", subject: "Payment Receipt for GitHub", snippet: "You have been charged $4.00 USD for your monthly subscription." },
  { from: "no-reply@zoom.us", subject: "Zoom Invoice #INV-123", snippet: "Total: $15.99" },
  { from: "billing@figma.com", subject: "Your Figma invoice", snippet: "Total amount $15.00" },
  { from: "invoices@vercel.com", subject: "Vercel Invoice", snippet: "Total: 20.00 USD" },
  
  // Unknown vendors (NOT in VENDOR_MAP)
  { from: "billing@acmecorp.com", subject: "Acme Corp Receipt", snippet: "We received your payment of $49.00 USD." },
  { from: "no-reply@midjourney.com", subject: "Midjourney Subscription Receipt", snippet: "Total paid: $30.00" },
  { from: "support@mailchimp.com", subject: "Mailchimp Payment Confirmation", snippet: "Total Paid: $13.50 USD" },
  
  // Foreign currencies
  { from: "billing@spotify.com", subject: "Spotify Receipt", snippet: "Total: 10.99 EUR" },
  { from: "no-reply@netflix.com", subject: "Netflix Invoice", snippet: "We charged you £15.99 GBP" },
  
  // False positive checks (not receipts)
  { from: "updates@figma.com", subject: "What's new in Figma", snippet: "Check out our new features." },
]

// Expose the internal functions for testing by mocking the fetch API
global.fetch = async (url: string) => {
  if (url.includes('messages?q=')) {
    return {
      ok: true,
      json: async () => ({ messages: mockEmails.map((_, i) => ({ id: i.toString(), threadId: i.toString() })) })
    }
  }
  
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
            { name: "Date", value: new Date().toUTCString() }
          ]
        },
        snippet: email.snippet
      })
    }
  }
  
  return { ok: false }
}

async function runTest() {
  console.log("Running Gmail Mock Test...")
  const results = await scanGmailForSubscriptions("fake-token")
  console.log(`Detected ${results.length} subscriptions out of ${mockEmails.length} emails.`)
  console.log(JSON.stringify(results, null, 2))
}

runTest().catch(console.error)
