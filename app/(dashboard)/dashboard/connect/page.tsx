import { ConnectPageClient } from "@/components/dashboard/connect-page"

export default function ConnectPage() {
  const gmailEnabled = Boolean(
    (process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID) &&
      (process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET),
  )

  return <ConnectPageClient gmailEnabled={gmailEnabled} />
}
