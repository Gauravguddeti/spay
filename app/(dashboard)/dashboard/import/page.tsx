"use client"

import { useCallback, useRef, useState } from "react"
import { FileText, Upload, X } from "lucide-react"
import { toast } from "sonner"

import {
  ReviewDetectedSubscriptions,
  type DetectedItem,
} from "@/components/import/ReviewDetectedSubscriptions"
import { Button } from "@/components/ui/button"

type UploadState = "idle" | "uploading" | "done" | "error"

export default function ImportPage() {
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [detected, setDetected] = useState<DetectedItem[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.type.includes("pdf")) {
      toast.error("Please upload a PDF file")
      return
    }

    setFileName(file.name)
    setUploadState("uploading")
    setDetected(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/import/pdf", {
        method: "POST",
        body: formData,
      })

      const data = (await res.json()) as {
        subscriptions?: DetectedItem[]
        error?: string
      }

      if (!res.ok) {
        toast.error(data.error ?? "Failed to parse PDF")
        setUploadState("error")
        return
      }

      setDetected(data.subscriptions ?? [])
      setUploadState("done")

      if ((data.subscriptions?.length ?? 0) === 0) {
        toast.info("No known SaaS charges detected in this statement")
      } else {
        toast.success(`${data.subscriptions!.length} subscriptions detected`)
      }
    } catch {
      toast.error("Upload failed — please try again")
      setUploadState("error")
    }
  }, [])

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void processFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
  }

  function handleReset() {
    setUploadState("idle")
    setFileName(null)
    setDetected(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <section className="space-y-4">
      {/* Page header */}
      <div className="rounded-3xl border border-border/70 bg-card px-6 py-5 shadow-sm">
        <p className="text-xs font-mono text-muted-foreground">IMPORT</p>
        <h1 className="mt-2 font-serif text-3xl">Upload Bank Statement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auto-detect SaaS charges from your bank statement PDF
        </p>
      </div>

      {/* Upload zone */}
      {uploadState !== "done" && (
        <label
          className={`flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed bg-card px-6 py-16 text-center shadow-sm transition-colors cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          } ${uploadState === "uploading" ? "pointer-events-none opacity-60" : ""}`}
          htmlFor="pdf-upload"
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            accept=".pdf"
            className="sr-only"
            disabled={uploadState === "uploading"}
            id="pdf-upload"
            onChange={handleFileInput}
            ref={fileInputRef}
            type="file"
          />

          {uploadState === "uploading" ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div>
                <p className="font-medium text-sm">Analysing {fileName}…</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Scanning for SaaS subscription charges
                </p>
              </div>
            </>
          ) : uploadState === "error" ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-red-700">Parse failed</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Click to try again with a different file
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  Drop your bank statement PDF here, or click to browse
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Supports HDFC, ICICI, SBI, Axis, Kotak, Yes Bank
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PDF only · Max 10 MB</p>
              </div>
            </>
          )}
        </label>
      )}

      {/* Results */}
      {uploadState === "done" && detected !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-muted-foreground">
              Analysis complete — {fileName}
            </p>
            <Button
              className="rounded-full"
              onClick={handleReset}
              size="sm"
              variant="outline"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload another
            </Button>
          </div>
          <ReviewDetectedSubscriptions
            detectedVia="pdf"
            items={detected}
            onImportDone={handleReset}
          />
        </div>
      )}
    </section>
  )
}
