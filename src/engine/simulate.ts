import { problemById } from '../lib/repo'
import { defaultsFor } from '../lib/business'
import type { BusinessTypeId, IndustryId, Profile } from '../types'
import { readText } from './match'
import type { Recipe } from './recipes'

export interface SimInputs {
  missedPerWeek: number
  avgValue: number
  captureRate: number
  bookRate: number
  hoursPerWeek: number
  timeSaved: number
  hourlyValue: number
}

export interface SimResult {
  callsCaught: number
  newSales: number
  callValue: number
  hoursSaved: number
  timeValue: number
  weeklyValue: number
  monthlyValue: number
  monthlyCost: number
  monthlyNet: number
}

/** Conservative starting guesses for missed calls a week, by business size. Owners replace them with their own. */
const MISSED_BY_SIZE: Record<string, number> = { solo: 5, small: 8, medium: 15 }

/** Starting numbers: the owner's saved numbers, then what they typed, then defaults. */
export function simInputs(p: Profile): SimInputs {
  const d = defaultsFor(p)
  const said = readText(p.freeText, p.industry, p.category)
  return {
    missedPerWeek: said.callsMentioned ?? MISSED_BY_SIZE[p.size] ?? 8,
    avgValue: d.avgValue,
    captureRate: 0.8,
    bookRate: 0.3,
    hoursPerWeek: said.hoursMentioned ?? 3,
    timeSaved: 0.5,
    hourlyValue: d.hourlyValue,
    ...p.sim,
  }
}

export interface Leak {
  monthly: number
  callMonthly: number
  timeMonthly: number
  basis: string[]
  usingDefaults: boolean
}

/** What the owner's problems may be costing today, before any tools. */
export function leakEstimate(p: Profile): Leak | null {
  const inp = simInputs(p)
  const calls = p.problems.some((id) => problemById(id)?.measure === 'missedCalls')
  const hourProblems = p.problems.filter((id) => problemById(id)?.measure === 'hours').length
  const callMonthly = calls ? inp.missedPerWeek * inp.bookRate * inp.avgValue * 4.33 : 0
  const timeMonthly = hourProblems * inp.hoursPerWeek * inp.hourlyValue * 4.33
  const monthly = callMonthly + timeMonthly
  if (monthly <= 0) return null
  const basis: string[] = []
  if (calls) basis.push(`${inp.missedPerWeek} missed calls a week, ${Math.round(inp.bookRate * 100)}% of them buying, at $${inp.avgValue} (${defaultsFor(p).valueLabel.toLowerCase()})`)
  if (hourProblems) basis.push(`${inp.hoursPerWeek} hours a week on ${hourProblems === 1 ? 'your task' : `each of ${hourProblems} tasks`} at $${inp.hourlyValue} an hour`)
  const said = readText(p.freeText, p.industry, p.category)
  const usingDefaults = !p.sim && said.callsMentioned === null && said.hoursMentioned === null
  return { monthly, callMonthly, timeMonthly, basis, usingDefaults }
}

/** Every number here comes from the owner's inputs and the assumptions on screen. */
export function simulate(inp: SimInputs, recipe: Recipe): SimResult {
  const covered = recipe.covered
  const callProblems = covered.filter((id) => problemById(id)?.measure === 'missedCalls')
  const hourProblems = covered.filter((id) => problemById(id)?.measure === 'hours')

  const callsCaught = callProblems.length ? inp.missedPerWeek * inp.captureRate : 0
  const newSales = callsCaught * inp.bookRate
  const callValue = newSales * inp.avgValue
  const hoursSaved = hourProblems.length * inp.hoursPerWeek * inp.timeSaved
  const timeValue = hoursSaved * inp.hourlyValue
  const weeklyValue = callValue + timeValue
  const monthlyValue = weeklyValue * 4.33
  const monthlyCost = recipe.knownTotal
  return {
    callsCaught,
    newSales,
    callValue,
    hoursSaved,
    timeValue,
    weeklyValue,
    monthlyValue,
    monthlyCost,
    monthlyNet: monthlyValue - monthlyCost,
  }
}

export interface DayEvent {
  time: string
  problem: string | null
  before: string
  after: string
}

/** A typical day for each industry. Events tied to a problem change when the recipe covers it. */
export const DAY_TIMELINES: Record<IndustryId, DayEvent[]> = {
  restaurant: [
    { time: '9:30 am', problem: 'food-costs', before: 'Types supplier invoices into a spreadsheet', after: '{tool} reads the invoice photos; you check the totals' },
    { time: '11:00 am', problem: 'staff-scheduling', before: 'A server calls out; texts 6 people to cover', after: '{tool} posts the open shift to the team' },
    { time: '12:15 pm', problem: 'missed-calls', before: 'Lunch rush: 3 calls ring out to voicemail', after: '{tool} answers all 3 and handles the questions' },
    { time: '6:45 pm', problem: 'phone-orders', before: 'Dinner rush: a host is stuck on the phone taking orders', after: '{tool} takes the orders and sends them to the kitchen' },
    { time: '9:30 pm', problem: 'after-hours', before: 'Closed: callers asking about tomorrow hang up', after: '{tool} answers after close and books tables' },
    { time: '10:30 pm', problem: 'social-posts', before: 'Means to post tonight’s special; too tired', after: '{tool} drafts the post; you approve it in a minute' },
    { time: '11:30 pm', problem: 'reviews', before: 'Replies to reviews one by one at midnight', after: '{tool} drafts the replies; you approve them' },
  ],
  hvac: [
    { time: '7:30 am', problem: 'booking-jobs', before: 'Juggles the day’s jobs on paper and texts techs', after: '{tool} books calls straight onto the schedule' },
    { time: '10:00 am', problem: 'missed-calls', before: 'In an attic: 2 calls go to voicemail, one calls a competitor', after: '{tool} answers both and books the repair' },
    { time: '1:00 pm', problem: 'slow-estimates', before: 'Writes an estimate in the truck for 40 minutes', after: '{tool} drafts it; you adjust and send' },
    { time: '4:00 pm', problem: 'invoice-chasing', before: 'Calls customers about unpaid invoices', after: '{tool} sends polite payment reminders' },
    { time: '8:30 pm', problem: 'after-hours', before: 'No heat call at night goes to voicemail', after: '{tool} answers and flags the emergency' },
    { time: '9:30 pm', problem: 'reviews', before: 'Forgets to ask happy customers for reviews', after: '{tool} asks for a review after each job' },
  ],
  salon: [
    { time: '9:00 am', problem: 'no-shows', before: 'A 9 am no-show leaves the chair empty', after: '{tool} sent a reminder and filled the slot' },
    { time: '11:30 am', problem: 'missed-calls', before: 'With a client: 2 booking calls go unanswered', after: '{tool} answers and books both' },
    { time: '2:00 pm', problem: 'social-posts', before: 'Means to post the morning’s color work; no time', after: '{tool} turns the photo into a post' },
    { time: '5:30 pm', problem: 'no-shows', before: 'Clients leave without booking their next visit', after: '{tool} sends a rebooking text a few weeks later' },
    { time: '8:00 pm', problem: 'after-hours', before: 'Evening calls for appointments go to voicemail', after: '{tool} answers and books the appointment' },
    { time: '9:00 pm', problem: 'reviews', before: 'Unanswered reviews pile up', after: '{tool} asks for reviews and drafts replies' },
  ],
  landscaping: [
    { time: '7:00 am', problem: 'booking-jobs', before: 'Rebuilds the crew schedule after a rain day', after: '{tool} books new jobs onto the schedule' },
    { time: '10:30 am', problem: 'missed-calls', before: 'Mowing: 3 calls for quotes go to voicemail', after: '{tool} answers and collects the property details' },
    { time: '1:00 pm', problem: 'slow-estimates', before: 'Drives to a property to measure it for a quote', after: '{tool} measures it from aerial images' },
    { time: '4:00 pm', problem: 'invoice-chasing', before: 'Chases last month’s unpaid invoices', after: '{tool} sends payment reminders' },
    { time: '8:00 pm', problem: 'social-posts', before: 'Means to post before-and-after photos; doesn’t', after: '{tool} turns them into a post' },
    { time: '9:00 pm', problem: 'reviews', before: 'Never gets around to asking for reviews', after: '{tool} asks after each finished job' },
  ],
}

/** Neutral days for professions we haven't added yet ("Something else"), by business type. */
export const GENERIC_TIMELINES: Record<BusinessTypeId, DayEvent[]> = {
  appointments: [
    { time: '9:00 am', problem: 'no-shows', before: 'A 9 am no-show leaves a gap in the schedule', after: '{tool} sent a reminder the day before; the slot stays full' },
    { time: '11:30 am', problem: 'missed-calls', before: 'With a client: 2 booking calls go unanswered', after: '{tool} answers and books both' },
    { time: '2:00 pm', problem: 'social-posts', before: 'Means to post an update; no time', after: '{tool} drafts the post; you approve it' },
    { time: '5:30 pm', problem: 'no-shows', before: 'Clients leave without booking their next visit', after: '{tool} sends a rebooking text a few weeks later' },
    { time: '8:00 pm', problem: 'after-hours', before: 'Evening calls for appointments go to voicemail', after: '{tool} answers and books the appointment' },
    { time: '9:00 pm', problem: 'reviews', before: 'Unanswered reviews pile up', after: '{tool} asks for reviews and drafts replies' },
  ],
  field: [
    { time: '7:30 am', problem: 'booking-jobs', before: 'Juggles the day’s jobs on paper and texts', after: '{tool} books calls straight onto the schedule' },
    { time: '10:00 am', problem: 'missed-calls', before: 'On a job: 2 calls go to voicemail, one calls a competitor', after: '{tool} answers both and books the visit' },
    { time: '1:00 pm', problem: 'slow-estimates', before: 'Writes an estimate in the truck for 40 minutes', after: '{tool} drafts it; you adjust and send' },
    { time: '4:00 pm', problem: 'invoice-chasing', before: 'Calls customers about unpaid invoices', after: '{tool} sends polite payment reminders' },
    { time: '8:30 pm', problem: 'after-hours', before: 'An urgent call at night goes to voicemail', after: '{tool} answers and flags it for the morning' },
    { time: '9:30 pm', problem: 'reviews', before: 'Forgets to ask happy customers for reviews', after: '{tool} asks for a review after each job' },
  ],
  shop: [
    { time: '10:00 am', problem: 'writing', before: 'Rewrites the same customer emails and signs by hand', after: '{tool} drafts them in a minute' },
    { time: '12:15 pm', problem: 'missed-calls', before: 'Busy hour: 3 calls ring out to voicemail', after: '{tool} answers all 3 and handles the questions' },
    { time: '4:00 pm', problem: 'invoice-chasing', before: 'Chases a customer who still owes for a big order', after: '{tool} sends payment reminders' },
    { time: '6:30 pm', problem: 'after-hours', before: 'Closed: callers asking about tomorrow hang up', after: '{tool} answers after close' },
    { time: '9:30 pm', problem: 'social-posts', before: 'Means to post today’s new items; too tired', after: '{tool} drafts the post; you approve it in a minute' },
    { time: '10:30 pm', problem: 'reviews', before: 'Replies to reviews one by one late at night', after: '{tool} drafts the replies; you approve them' },
  ],
}

export function timelineFor(p: Profile): DayEvent[] {
  if (p.other) return GENERIC_TIMELINES[p.other.type]
  return DAY_TIMELINES[p.industry ?? 'restaurant']
}
