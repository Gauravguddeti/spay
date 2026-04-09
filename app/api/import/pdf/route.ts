import { type NextRequest, NextResponse } from "next/server"

import { auth } from "@/auth"
import { parseBankStatement } from "@/lib/parsers/bankStatementParser"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    if (!file.type.includes("pdf")) {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 })
    }

    // Read the file as a Buffer (works in serverless — avoids filesystem writes)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const pdfData = await pdfParse(buffer)
    const detected = parseBankStatement(pdfData.text)

    return NextResponse.json({ subscriptions: detected })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse PDF"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
