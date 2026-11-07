import type { IndustryId } from '../types'

/**
 * Seasonal "coming up" prompts. Each one points at a problem in the catalog,
 * so the owner can add it to their ToolRecipe in one tap. Months are 1–12; a
 * season shows during its months and the month before it starts.
 * Wording uses "usually": these are common patterns, not measured statistics.
 */
export interface Season {
  id: string
  industry: IndustryId
  months: number[]
  emoji: string
  title: string
  why: string
  problem: string
}

export const SEASONS: Season[] = [
  // Restaurants and cafés
  { id: 'r-holiday', industry: 'restaurant', months: [11, 12], emoji: '🎄', title: 'Holiday party season is coming', why: 'Calls for party bookings and catering usually pick up, often during your busiest service hours.', problem: 'missed-calls' },
  { id: 'r-valentine', industry: 'restaurant', months: [2], emoji: '💝', title: 'Valentine’s Day is coming', why: 'Reservation calls usually pile up in the days before, including after you close.', problem: 'after-hours' },
  { id: 'r-mothers', industry: 'restaurant', months: [5], emoji: '💐', title: 'Mother’s Day and graduations are coming', why: 'Usually some of the busiest brunch weekends of the year, so staffing gets tight.', problem: 'staff-scheduling' },
  { id: 'r-summer', industry: 'restaurant', months: [6, 7, 8], emoji: '☀️', title: 'Summer patio season', why: 'More new and visiting guests usually means more reviews to answer.', problem: 'reviews' },
  { id: 'r-fall', industry: 'restaurant', months: [9, 10], emoji: '🍂', title: 'Fall menu season', why: 'A good time to show off new dishes, which means more posts to make.', problem: 'social-posts' },

  // HVAC and trades
  { id: 'h-cold', industry: 'hvac', months: [10, 11], emoji: '🥶', title: 'The first cold snap is coming', why: 'Furnace calls usually spike on the first cold nights, often after hours.', problem: 'after-hours' },
  { id: 'h-holiday', industry: 'hvac', months: [12, 1], emoji: '❄️', title: 'Holiday breakdowns', why: 'Heat calls on holidays and weekends usually go to voicemail when the office is closed.', problem: 'missed-calls' },
  { id: 'h-spring', industry: 'hvac', months: [3, 4], emoji: '🌱', title: 'Spring tune-up season is coming', why: 'Maintenance visits usually fill the calendar fast, so booking gets messy.', problem: 'booking-jobs' },
  { id: 'h-heat', industry: 'hvac', months: [5, 6, 7], emoji: '🔥', title: 'Summer heat is coming', why: 'AC calls usually surge on the first hot days, while every tech is out on a job.', problem: 'missed-calls' },
  { id: 'h-replace', industry: 'hvac', months: [8, 9], emoji: '🧾', title: 'Replacement season', why: 'Systems that struggled all summer usually turn into replacement quotes.', problem: 'slow-estimates' },

  // Salons
  { id: 's-holiday', industry: 'salon', months: [11, 12], emoji: '✨', title: 'Holiday party and New Year’s looks', why: 'Booking calls usually jump while you’re busy with clients in the chair.', problem: 'missed-calls' },
  { id: 's-valentine', industry: 'salon', months: [2], emoji: '💝', title: 'Valentine’s Day is coming', why: 'A good moment to post date-night looks and fill open slots.', problem: 'social-posts' },
  { id: 's-prom', industry: 'salon', months: [3, 4, 5], emoji: '💃', title: 'Prom season is coming', why: 'Group bookings usually cluster on the same weekends, and a no-show is hard to refill.', problem: 'no-shows' },
  { id: 's-wedding', industry: 'salon', months: [6, 7, 8, 9], emoji: '💍', title: 'Wedding season', why: 'Bridal parties book far ahead; reminders and deposits usually protect those slots.', problem: 'no-shows' },
  { id: 's-school', industry: 'salon', months: [8], emoji: '🎒', title: 'Back-to-school is coming', why: 'Families usually book cuts in the same few weeks, so it’s worth posting early.', problem: 'social-posts' },

  // Landscaping
  { id: 'l-snow', industry: 'landscaping', months: [12, 1, 2], emoji: '🌨️', title: 'Snow removal season is coming', why: 'Storm calls usually come early in the morning and after hours.', problem: 'after-hours' },
  { id: 'l-spring', industry: 'landscaping', months: [3, 4], emoji: '🌷', title: 'The spring cleanup rush is coming', why: 'Quote requests usually arrive all at once, and the first to quote often wins.', problem: 'slow-estimates' },
  { id: 'l-mowing', industry: 'landscaping', months: [5, 6, 7], emoji: '🌿', title: 'Peak mowing season', why: 'Routes and crews are usually full, so booking new jobs gets messy.', problem: 'booking-jobs' },
  { id: 'l-fall', industry: 'landscaping', months: [10, 11], emoji: '🍁', title: 'Fall leaf cleanup is coming', why: 'Calls usually come in while the crew is out, from customers who want it done this week.', problem: 'missed-calls' },
  { id: 'l-reviews', industry: 'landscaping', months: [11, 12], emoji: '⭐', title: 'Off-season is coming', why: 'Asking happy customers for reviews now usually pays off when spring searches start.', problem: 'reviews' },
]

/** Seasons that are happening now or start next month, for this industry. */
export function upcomingSeasons(industry: IndustryId | null, date = new Date()): Season[] {
  if (!industry) return []
  const m = date.getMonth() + 1
  const next = (m % 12) + 1
  const now = SEASONS.filter((s) => s.industry === industry && s.months.includes(m))
  const soon = SEASONS.filter((s) => s.industry === industry && !s.months.includes(m) && s.months[0] === next)
  return [...now, ...soon].slice(0, 2)
}
