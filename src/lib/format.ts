/** "45 min", "2 hrs", "3 days" */
export function hoursLabel(h: number) {
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 24) return `${Math.round(h)} hr${Math.round(h) === 1 ? '' : 's'}`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'}`
}

/** "2026-11-06" → "Nov 6, 2026". One date style everywhere. */
export function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
