import { redirect } from "next/navigation"

/**
 * Phase 5: /dashboard/import/email redirects to /dashboard/connect
 * which already implements the full Gmail OAuth → scan → review → import flow.
 */
export default function ImportEmailPage() {
  redirect("/dashboard/connect")
}
