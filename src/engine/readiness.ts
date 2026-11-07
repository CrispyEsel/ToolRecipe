import type { Profile } from '../types'

export interface Readiness {
  score: number
  level: 'Starter' | 'Ready' | 'Advanced'
  headline: string
  plan: string
  reasons: { label: string; points: number; max: number; note: string }[]
}

/**
 * AI starting point. This is not a grade: every level leads to a recipe. It
 * decides which recipe is shown first and how much setup help is suggested.
 */
export function readiness(p: Profile): Readiness {
  const digital = p.systems.filter((s) => s !== 'paper').length
  const digitalPts = Math.min(30, digital * 10)
  const comfortPts = [0, 8, 20, 30][p.comfort]
  const timePts = [0, 6, 16, 25][p.setupTime]
  const budgetPts = p.budget === null ? 8 : p.budget >= 150 ? 15 : p.budget >= 50 ? 10 : 5

  const reasons = [
    {
      label: 'Software you already use',
      points: digitalPts,
      max: 30,
      note: digital === 0 ? 'Starting from paper is fine. We’ll pick tools that work on their own.' : `${digital} system${digital > 1 ? 's' : ''} for AI tools to plug into.`,
    },
    {
      label: 'Comfort with new apps',
      points: comfortPts,
      max: 30,
      note: p.comfort === 1 ? 'We’ll favor tools with done-for-you setup.' : p.comfort === 2 ? 'Point-and-click setup will suit you.' : 'You can handle tools with more settings.',
    },
    {
      label: 'Time for setup',
      points: timePts,
      max: 25,
      note: p.setupTime === 1 ? 'We’ll keep it to one tool at a time.' : p.setupTime === 2 ? 'A few hours over the first week works.' : 'You have room for a combined setup.',
    },
    {
      label: 'Budget room',
      points: budgetPts,
      max: 15,
      note: p.budget === null ? 'No budget set, so we’ll show low-cost options first.' : `Up to $${p.budget}/month.`,
    },
  ]

  const score = Math.round(reasons.reduce((s, r) => s + r.points, 0))
  const level = score < 40 ? 'Starter' : score < 70 ? 'Ready' : 'Advanced'
  const headline =
    level === 'Starter' ? 'Starter: begin with one simple tool' : level === 'Ready' ? 'Ready: a small set of tools that work together' : 'Advanced: a full setup across your problems'
  const plan =
    level === 'Starter'
      ? 'We’ll lead with the Simple recipe and point you to free setup help.'
      : level === 'Ready'
        ? 'We’ll lead with the Balanced recipe.'
        : 'We’ll lead with the All-in recipe.'

  return { score, level, headline, plan, reasons }
}
