export function formatDisplayDate(value: string | Date | null): string {
  if (!value) {
    return "-"
  }

  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function toInputDate(value: string | Date | null): string {
  if (!value) {
    return ""
  }

  const date = value instanceof Date ? value : new Date(value)
  return date.toISOString().slice(0, 10)
}
