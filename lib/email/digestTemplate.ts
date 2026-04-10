export function buildWeeklyDigestHtml({
  userName,
  monthlySpend,
  renewals,
  savingOpportunity,
  appUrl,
}: {
  userName: string
  monthlySpend: number
  renewals: Array<{ name: string; amountInr: number; renewalDate: string }>
  savingOpportunity: { name: string; amountInr: number; unusedDays: number } | null
  appUrl: string
}): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)

  const weekLabel = new Date().toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })

  const renewalHtml =
    renewals.length === 0
      ? `<p style="color:#94a3b8">Nothing renewing this week — you're clear! ✅</p>`
      : renewals
          .map(
            (r) =>
              `<div style="padding:10px 0;border-bottom:1px solid #1e293b">
                <strong style="color:#f1f5f9">${r.name}</strong>
                <span style="color:#94a3b8"> · ${fmt(r.amountInr)}</span>
                <span style="color:#64748b;font-size:12px;display:block">${r.renewalDate}</span>
              </div>`,
          )
          .join("")

  const savingHtml = savingOpportunity
    ? `<p style="color:#f1f5f9">
        <strong>${savingOpportunity.name}</strong> costs ${fmt(savingOpportunity.amountInr)}/month and hasn't been used in
        ${savingOpportunity.unusedDays} days. Consider cancelling.
      </p>`
    : `<p style="color:#94a3b8">All your tools look active — great job! 🎉</p>`

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your SPAY Weekly</title></head>
<body style="background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#cbd5e1;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#1e293b;border:1px solid #334155">
  <tr><td style="padding:36px 40px">
    <p style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#475569;margin:0 0 8px">SPAY WEEKLY</p>
    <h1 style="font-size:26px;color:#f1f5f9;margin:0 0 4px">Your SPAY snapshot</h1>
    <p style="font-size:13px;color:#64748b;margin:0 0 32px">${weekLabel}</p>

    <p style="font-size:15px;color:#e2e8f0">Hey ${userName} 👋</p>
    <p style="font-size:14px;color:#94a3b8">Here's your SPAY snapshot for this week:</p>

    <div style="background:#0f172a;border:1px solid #334155;padding:20px 24px;margin:24px 0">
      <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#475569">💰 MONTHLY SAAS SPEND</p>
      <p style="margin:8px 0 0;font-size:28px;font-weight:700;color:#f1f5f9">${fmt(monthlySpend)}</p>
    </div>

    <div style="margin:24px 0">
      <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#475569;margin:0 0 12px">🔔 RENEWING THIS WEEK</p>
      ${renewalHtml}
    </div>

    <div style="margin:24px 0">
      <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#475569;margin:0 0 12px">💡 TOP SAVING OPPORTUNITY</p>
      ${savingHtml}
    </div>

    <a href="${appUrl}/dashboard" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;padding:12px 24px;font-size:14px;font-weight:600;margin-top:8px">
      View your dashboard →
    </a>

    <hr style="border:none;border-top:1px solid #1e293b;margin:36px 0 24px">
    <p style="font-size:12px;color:#475569;margin:0">
      SPAY · <a href="${appUrl}" style="color:#475569">spay.app</a>
    </p>
  </td></tr>
</table>
</body>
</html>`
}
