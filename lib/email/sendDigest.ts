import { Resend } from "resend"
import { buildWeeklyDigestHtml } from "./digestTemplate"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWeeklyDigest({
  to,
  userName,
  monthlySpend,
  renewals,
  savingOpportunity,
  appUrl,
}: {
  to: string
  userName: string
  monthlySpend: number
  renewals: Array<{ name: string; amountInr: number; renewalDate: string }>
  savingOpportunity: { name: string; amountInr: number; unusedDays: number } | null
  appUrl: string
}) {
  const date = new Date()
  const label = date.toLocaleDateString("en-IN", { month: "long", day: "numeric" })

  const html = buildWeeklyDigestHtml({ userName, monthlySpend, renewals, savingOpportunity, appUrl })

  return resend.emails.send({
    from: "SPAY <digest@spay.app>",
    to,
    subject: `Your SPAY Weekly — ${label}`,
    html,
  })
}
