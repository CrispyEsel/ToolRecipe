import { PROBLEMS } from '../lib/repo'
import type { CategoryId, IndustryId } from '../types'

export interface TextInsights {
  problemIds: string[]
  /** e.g. "20" from "about 20 calls a night" */
  callsMentioned: number | null
  hoursMentioned: number | null
  when: string | null
  matchedWords: string[]
}

const WHEN_WORDS: [RegExp, string][] = [
  [/\b(friday|saturday|sunday|weekend)s?\b/i, 'weekends'],
  [/\b(dinner|lunch|rush|peak|busy)\b/i, 'busy hours'],
  [/\b(night|evening|after hours|late)\b/i, 'evenings'],
  [/\b(morning|breakfast)\b/i, 'mornings'],
  [/\b(summer|winter|season|spring)\b/i, 'busy season'],
]

/**
 * Reads the owner's own words with simple keyword rules (no AI call, so it is
 * free, private, and can't fail during a demo). Returns the problems it
 * recognized and any numbers the simulator can use.
 */
export function readText(text: string, industry: IndustryId | null, category: CategoryId | null): TextInsights {
  const lower = ` ${text.toLowerCase()} `
  const scored: { id: string; score: number; words: string[] }[] = []

  for (const p of PROBLEMS) {
    if (industry && !p.industries.includes(industry)) continue
    const words = p.keywords.filter((k) => lower.includes(k))
    if (words.length === 0) continue
    // Problems in the chosen category win ties
    const score = words.length + (category && p.category === category ? 0.5 : 0)
    scored.push({ id: p.id, score, words })
  }
  scored.sort((a, b) => b.score - a.score)

  const callMatch = lower.match(/(\d+)\s*(?:\+\s*)?(?:missed\s+)?(?:calls?|orders?|customers?|people)/)
  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/)
  const when = WHEN_WORDS.find(([re]) => re.test(text))?.[1] ?? null

  return {
    problemIds: scored.slice(0, 3).map((s) => s.id),
    callsMentioned: callMatch ? Number(callMatch[1]) : null,
    hoursMentioned: hourMatch ? Number(hourMatch[1]) : null,
    when,
    matchedWords: [...new Set(scored.flatMap((s) => s.words))].slice(0, 6),
  }
}
