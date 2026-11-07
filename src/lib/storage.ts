/**
 * Browser storage helpers and the event log. Storage can be missing or full,
 * so nothing here is allowed to throw. Later: track() posts to an analytics
 * endpoint and check-ins become the shared outcome data.
 */

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return fallback && typeof fallback === 'object' && !Array.isArray(fallback) ? { ...fallback, ...parsed } : parsed
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

export type TrackEvent =
  | 'profile_completed'
  | 'recipe_viewed'
  | 'recipe_started'
  | 'step_checked'
  | 'checkin_answered'
  | 'test_drive_played'
  | 'vendor_submitted'
  | 'need_submitted'
  | 'stack_changed'
  | 'season_added'
  | 'profession_requested'
  | 'example_opened'

export function track(event: TrackEvent, data: Record<string, unknown> = {}) {
  const log = load<{ event: string; at: string; data: Record<string, unknown> }[]>('tb.events', [])
  log.push({ event, at: new Date().toISOString(), data })
  save('tb.events', log.slice(-500))
}

export function getEvents() {
  return load<{ event: string; at: string; data: Record<string, unknown> }[]>('tb.events', [])
}
