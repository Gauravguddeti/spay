const HTML_TAG_PATTERN = /<[^>]*>/g

export function stripHtmlTags(value: string): string {
  return value.replace(HTML_TAG_PATTERN, "").trim()
}
