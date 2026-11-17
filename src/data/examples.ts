import { upcomingSeasons } from './seasons'
import type { Profile } from '../types'

/**
 * Example businesses for judges, demos, and curious owners. Numbers are
 * deliberately conservative (a handful of missed calls a week, about 3 in 10
 * missed callers buying), so the money-leak line stays believable.
 */
export interface Example {
  id: string
  label: string
  sub: string
  build: (date?: Date) => Profile
}

const base = { size: 'small' as const, comfort: 2 as const, setupTime: 2 as const, dataCare: 2 as const, example: true, other: undefined, budgetSet: true }

export const EXAMPLES: Example[] = [
  {
    id: 'hvac',
    label: 'Comfort Air',
    sub: 'HVAC · misses calls on jobs',
    build: () => ({
      ...base,
      businessName: 'Comfort Air Heating & Cooling',
      industry: 'hvac',
      category: 'phones',
      problems: ['missed-calls', 'slow-estimates'],
      freeText: 'I miss calls when I’m on a job, and estimates eat my evenings.',
      systems: ['housecallpro', 'quickbooks', 'google'],
      budget: 200,
      sim: { missedPerWeek: 6, avgValue: 325, captureRate: 0.8, bookRate: 0.3, hoursPerWeek: 3, timeSaved: 0.5, hourlyValue: 40 },
    }),
  },
  {
    id: 'salon',
    label: 'Studio Nine',
    sub: 'Salon · no time for marketing',
    // Picks marketing problems that the upcoming seasonal card does NOT already cover,
    // so the card shows its "Show me tools for this" button in any month.
    build: (date) => {
      const seasonal = new Set(upcomingSeasons('salon', date).map((s) => s.problem))
      const pool = ['social-posts', 'reviews', 'writing', 'no-shows'].filter((p) => !seasonal.has(p))
      return {
        ...base,
        businessName: 'Studio Nine Salon',
        industry: 'salon',
        category: 'marketing',
        problems: pool.slice(0, 2),
        freeText: 'I never have time to post, and reviews pile up.',
        systems: ['vagaro', 'social', 'google'],
        budget: 150,
        sim: { missedPerWeek: 5, avgValue: 75, captureRate: 0.8, bookRate: 0.3, hoursPerWeek: 2, timeSaved: 0.5, hourlyValue: 30 },
      }
    },
  },
  {
    id: 'restaurant',
    label: 'Main Street Kitchen',
    sub: 'Restaurant · phone rings during the rush',
    build: () => ({
      ...base,
      businessName: 'Main Street Kitchen',
      industry: 'restaurant',
      category: 'phones',
      problems: ['missed-calls', 'phone-orders'],
      freeText: 'The phone rings nonstop during the lunch rush and we can’t pick up.',
      systems: ['toast', 'google'],
      budget: 300,
      sim: { missedPerWeek: 10, avgValue: 38, captureRate: 0.8, bookRate: 0.3, hoursPerWeek: 3, timeSaved: 0.5, hourlyValue: 22 },
    }),
  },
  {
    id: 'grooming',
    label: 'Paws & Suds',
    sub: 'Dog grooming · a profession we haven’t added',
    build: () => ({
      ...base,
      businessName: 'Paws & Suds Dog Grooming',
      industry: 'salon',
      other: { profession: 'Dog grooming', type: 'appointments' },
      category: 'phones',
      problems: ['missed-calls', 'no-shows'],
      freeText: 'I can’t answer the phone with a dog on the table, and people forget appointments.',
      systems: ['square', 'google'],
      budget: 120,
      sim: { missedPerWeek: 5, avgValue: 70, captureRate: 0.8, bookRate: 0.3, hoursPerWeek: 2, timeSaved: 0.5, hourlyValue: 30 },
    }),
  },
]
