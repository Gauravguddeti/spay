import { type NextRequest, NextResponse } from "next/server"

import { auth } from "@/auth"
import { parseBankStatement } from "@/lib/parsers/bankStatementParser"
import { stripHtmlTags } from "@/lib/security/sanitize"

export const runtime = "nodejs"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const PDF_MAGIC_HEADER = "%PDF"

type LegacyPdfParseFunction = (buf: Buffer) => Promise<{ text: string }>

type ModernPdfParser = {
  getText: () => Promise<{ text: string }>
  destroy?: () => Promise<void> | void
}

type ModernPdfParseCtor = new (options: { data: Uint8Array }) => ModernPdfParser

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParseModule = await import("pdf-parse")

  const legacyParser = (pdfParseModule as { default?: unknown }).default
  if (typeof legacyParser === "function") {
    const parsed = await (legacyParser as LegacyPdfParseFunction)(buffer)
    return parsed.text
  }

  const modernParserCtor = (pdfParseModule as { PDFParse?: unknown }).PDFParse
  if (typeof modernParserCtor !== "function") {
    throw new Error("PDF parser is unavailable")
  }

  const parser = new (modernParserCtor as ModernPdfParseCtor)({
    data: new Uint8Array(buffer),
  })

  try {
    const parsed = await parser.getText()
    return parsed.text
  } finally {
    await parser.destroy?.()
  }
}

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

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 })
    }

    if (!file.type.includes("pdf")) {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 415 })
    }

    // Read the file as a Buffer (works in serverless — avoids filesystem writes)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const magicHeader = buffer.subarray(0, 4).toString("utf8")
    if (magicHeader !== PDF_MAGIC_HEADER) {
      return NextResponse.json({ error: "File must be a valid PDF" }, { status: 415 })
    }

    const extractedText = await extractPdfText(buffer)
    const detected = parseBankStatement(extractedText)
    const sanitizedDetected = detected.map((item) => ({
      ...item,
      name: stripHtmlTags(item.name),
      vendorKey: stripHtmlTags(item.vendorKey),
      category: stripHtmlTags(item.category),
      date: item.date ? stripHtmlTags(item.date) : null,
    }))

    return NextResponse.json({ subscriptions: sanitizedDetected })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
