import { STALE_DAYS } from './config'
import type { Tool } from '../types'

const DAY = 24 * 60 * 60 * 1000

/** Whole days since a YYYY-MM-DD date (0 if in the future or unreadable) */
export function daysSince(date: string, now: Date = new Date()): number {
  const t = Date.parse(date + 'T00:00:00')
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((now.getTime() - t) / DAY))
}

export const isStale = (t: Tool, now?: Date) => daysSince(t.checked, now) > STALE_DAYS

/** "today", "yesterday", "12 days ago" */
export function agoText(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}
