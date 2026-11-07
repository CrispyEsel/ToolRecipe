/**
 * Scoring weights, connection values, assumptions, and feature flags.
 * Changing a weight here changes every recommendation, so the How we rank
 * page reads from this file too. Later: per-industry weights or owner sliders.
 */

/** Points available for each part of the Match score (adds up to 100) */
export const WEIGHTS = {
  problem: 30,
  compat: 25,
  budget: 15,
  effort: 10,
  trust: 20,
} as const

/** Points for the best connection between a tool and the owner's software */
export const COMPAT_POINTS = {
  native: 25,
  zapier: 15,
  alongside: 15,
  unknown: 8,
  none: 0,
  /** owner tapped no relevant software */
  emptyStandalone: 15,
  empty: 10,
} as const

/** Monthly volume assumed for each business size, used to estimate usage fees */
export const USAGE_VOLUME = {
  calls: { solo: 40, small: 100, medium: 250 },
  callers: { solo: 40, small: 120, medium: 300 },
  conversations: { solo: 40, small: 100, medium: 250 },
} as const

export const SIZE_LABEL = { solo: 'Just me', small: '2–10 people', medium: '11–50 people' } as const

/** Features that can be switched on or off without code changes */
export const FEATURES = {
  testDrive: true,
  advisorShare: true,
  vendorForm: true,
  unmetNeeds: true,
  outcomes: true,
  implementers: false,
  aiAssistant: false,
} as const

/** A tool whose price hasn't been re-checked in this many days is marked stale and can't be the "Best start". */
export const STALE_DAYS = 90
