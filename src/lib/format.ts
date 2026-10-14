/** "1h 44min", "42min". */
export function formatDuration(seconds: number | undefined): string {
  if (!seconds || !Number.isFinite(seconds)) {
    return ""
  }
  const minutes = Math.max(1, Math.round(seconds / 60))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) {
    return `${rest}min`
  }
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`
}

/** "32:10", "1:02:10". */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = String(total % 60).padStart(2, "0")
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}`
    : `${minutes}:${secs}`
}

export function formatSize(bytes: number): string {
  const gigabytes = bytes / 1024 ** 3
  const format = (value: number, digits: number) =>
    value.toLocaleString("pt-BR", { maximumFractionDigits: digits })
  return gigabytes >= 1
    ? `${format(gigabytes, 1)} GB`
    : `${format(bytes / 1024 ** 2, 0)} MB`
}

export function formatResolution(height: number | undefined): string {
  if (!height) {
    return ""
  }
  if (height >= 2000) {
    return "4K"
  }
  return `${height}p`
}
