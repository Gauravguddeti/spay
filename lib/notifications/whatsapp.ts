/**
 * WhatsApp notification utility via Twilio.
 *
 * Required environment variables (add to .env.local):
 * - TWILIO_ACCOUNT_SID  — from https://console.twilio.com/ → Account Info
 * - TWILIO_AUTH_TOKEN   — from https://console.twilio.com/ → Account Info
 * - TWILIO_WHATSAPP_FROM — Twilio WhatsApp sender e.g. "whatsapp:+14155238886"
 *   (activate sandbox at: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
 */

import twilio from "twilio"

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error(
      "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in .env.local",
    )
  }

  return twilio(accountSid, authToken)
}

/**
 * Sends a WhatsApp message via Twilio.
 * @param to   Recipient number in E.164 format, e.g. "+919876543210"
 * @param message  Message body (plain text)
 */
export async function sendWhatsAppAlert(to: string, message: string): Promise<void> {
  const from = process.env.TWILIO_WHATSAPP_FROM
  if (!from) {
    throw new Error("TWILIO_WHATSAPP_FROM must be set in .env.local")
  }

  const client = getTwilioClient()

  await client.messages.create({
    from, // e.g. "whatsapp:+14155238886"
    to: `whatsapp:${to}`, // e.g. "whatsapp:+919876543210"
    body: message,
  })
}
