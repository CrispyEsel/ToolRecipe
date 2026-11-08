import { CATEGORIES, problemById, problemLabel, systemById, SYSTEMS } from '../lib/repo'
import { isGeneralTool, wordingIndustry } from '../lib/business'
import { isStale } from '../lib/freshness'
import type { Profile, SizeBand, SystemId, Tool } from '../types'
import { COMPAT_POINTS, USAGE_VOLUME, WEIGHTS } from '../lib/config'

export type BadgeStatus = 'native' | 'zapier' | 'none' | 'alongside' | 'unknown'

export interface Badge {
  system: SystemId
  status: BadgeStatus
}

/** Compatibility badges between one tool and the software the owner tapped. */
export function badgesFor(tool: Tool, systems: SystemId[]): Badge[] {
  const out: Badge[] = []
  for (const sid of systems) {
    const sys = systemById(sid)
    if (!sys || sys.kind === 'none') continue
    const relevant = tool.relevant.includes(sys.kind) || tool.requires === sid || tool.works[sid] !== undefined
    if (!relevant) continue
    const w = tool.works[sid]
    out.push({ system: sid, status: w ?? (tool.standalone ? 'alongside' : 'unknown') })
  }
  return out
}

function bestStatus(badges: Badge[]): BadgeStatus | 'empty' {
  if (badges.length === 0) return 'empty'
  const order: BadgeStatus[] = ['native', 'zapier', 'alongside', 'unknown', 'none']
  for (const s of order) if (badges.some((b) => b.status === s)) return s
  return 'unknown'
}

export interface ScorePart {
  label: string
  points: number
  max: number
  note: string
}

export interface ScoredTool {
  tool: Tool
  score: number
  parts: ScorePart[]
  badges: Badge[]
  covers: string[]
  why: string[]
}

/** Estimated usage fees for this business size, e.g. per-call overages */
export function usageCost(tool: Tool, size: SizeBand): { amount: number; note: string } | null {
  if (!tool.usage) return null
  const vol = USAGE_VOLUME[tool.usage.unit][size]
  const extra = Math.max(0, vol - tool.usage.included)
  const amount = Math.round(extra * tool.usage.overage * 100) / 100
  if (amount === 0) return null
  return { amount, note: `about ${vol} ${tool.usage.unit} a month: ${extra} over the ${tool.usage.included} included × $${tool.usage.overage.toFixed(2)}` }
}

/** Monthly cost including estimated usage fees (null when the price is not published) */
export function monthlyCost(tool: Tool, size: SizeBand): number | null {
  if (tool.price === null) return null
  return tool.price + (usageCost(tool, size)?.amount ?? 0)
}

/** Match score. Every point is explained on the "How we rank" page. */
export function scoreTool(tool: Tool, p: Profile): ScoredTool {
  const covers = p.problems.filter((id) => tool.problems.includes(id))
  const problemPts = p.problems.length === 0 ? 0 : Math.max(covers.length > 0 ? WEIGHTS.problem / 2 : 0, Math.round((covers.length / p.problems.length) * WEIGHTS.problem))

  const badges = badgesFor(tool, p.systems)
  const best = bestStatus(badges)
  const compatPts = best === 'empty' ? (tool.standalone ? COMPAT_POINTS.emptyStandalone : COMPAT_POINTS.empty) : COMPAT_POINTS[best]

  const budget = p.budget
  const cost = monthlyCost(tool, p.size)
  const B = WEIGHTS.budget
  let budgetPts: number
  if (cost === null) budgetPts = Math.round(B / 3)
  else if (budget === null) budgetPts = cost <= 100 ? B : cost <= 250 ? Math.round(B / 2) : Math.round(B / 5)
  else budgetPts = cost <= budget ? B : cost <= budget * 1.5 ? Math.round(B / 2) : 0

  const effortPts = tool.effort <= p.comfort ? WEIGHTS.effort : tool.effort === p.comfort + 1 ? WEIGHTS.effort / 2 : 0

  let trustPts =
    (tool.price !== null ? 8 : 0) + (tool.freeTrial ? 6 : 0) + (tool.cancelAnytime === true ? 6 : tool.cancelAnytime === null ? 2 : 0)
  // Owners who must be very careful with customer data: favor tools that keep
  // data inside software they already use, and flag unreviewed data handling
  let dataFlag = ''
  if (p.dataCare === 3) {
    if (tool.requires) {
      trustPts = Math.min(WEIGHTS.trust, trustPts + 4)
      dataFlag = 'Keeps data in software you already use'
    } else if (!tool.dataNote) {
      trustPts = Math.max(0, trustPts - 4)
      dataFlag = 'Data handling not reviewed yet'
    }
  }

  const parts: ScorePart[] = [
    { label: 'Solves your problem', points: problemPts, max: WEIGHTS.problem, note: covers.length ? `Covers ${covers.length} of your ${p.problems.length} problem${p.problems.length > 1 ? 's' : ''}` : 'Not a direct match' },
    {
      label: 'Works with your software',
      points: compatPts,
      max: WEIGHTS.compat,
      note:
        best === 'native'
          ? 'Connects directly'
          : best === 'zapier'
            ? 'Connects through Zapier (extra cost)'
            : best === 'alongside'
              ? 'Works alongside your software, no connection needed'
              : best === 'none'
                ? 'Does not connect'
                : best === 'unknown'
                  ? 'Connection not confirmed'
                  : 'Works on its own',
    },
    {
      label: 'Fits your budget',
      points: budgetPts,
      max: WEIGHTS.budget,
      note: cost === null ? 'Price not published' : budget === null ? `About $${fmt(cost)}/mo` : cost <= budget ? `Within $${budget}/mo` : `Over your $${budget}/mo budget`,
    },
    { label: 'Setup matches your comfort', points: effortPts, max: WEIGHTS.effort, note: ['', 'Point-and-click', 'Some setup', 'Needs vendor help'][tool.effort] },
    {
      label: 'Trust signals',
      points: trustPts,
      max: WEIGHTS.trust,
      note: [
        tool.price !== null ? 'Publishes price' : 'Hides price',
        tool.freeTrial ? 'Free trial or plan' : 'No trial listed',
        tool.cancelAnytime === true ? 'Cancel anytime' : tool.cancelAnytime === false ? 'Contract required' : 'Cancel terms unclear',
        dataFlag,
      ]
        .filter(Boolean)
        .join(' · '),
    },
  ]

  const why: string[] = []
  for (const id of covers) {
    const pr = problemById(id)
    if (pr) why.push(`Solves “${problemLabel(pr, wordingIndustry(p))}”`)
  }
  const nativeSys = badges.filter((b) => b.status === 'native').map((b) => systemById(b.system)?.label)
  if (nativeSys.length) why.push(`Connects directly to ${nativeSys.join(' and ')}`)
  if (tool.requires) why.push(`Built into ${systemById(tool.requires)?.label}, which you already use`)
  if (tool.price === 0) why.push('No extra monthly cost')
  else if (cost !== null && budget !== null && cost <= budget) why.push(`Fits your $${budget}/mo budget`)
  if (tool.effort <= p.comfort) why.push(['', 'Point-and-click setup', 'Setup matches your comfort level', ''][tool.effort])
  if (tool.freeTrial) why.push(tool.freeTrial)
  if (tool.cancelAnytime === true) why.push('Cancel anytime')

  return { tool, score: parts.reduce((s, x) => s + x.points, 0), parts, badges, covers, why: why.filter(Boolean) }
}

export function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

export interface Recipe {
  key: 'simple' | 'balanced' | 'allin'
  name: string
  tagline: string
  items: ScoredTool[]
  connector: { tool: Tool; reason: string } | null
  fees: { tool: string; amount: number; note: string }[]
  usage: { tool: string; amount: number; note: string }[]
  knownTotal: number
  unknownCount: number
  setupHours: number
  score: number
  covered: string[]
  missing: string[]
  overBudget: boolean
  /** Other recipe keys merged into this one because they had the same tools */
  merged: Recipe['key'][]
}

/** Fees that only apply because of the software the owner uses, e.g. MarginEdge on Toast. */
export function sysFees(tools: Tool[], systems: SystemId[]) {
  const out: { tool: string; amount: number; note: string }[] = []
  for (const t of tools) for (const sid of systems) {
    const f = t.systemFees?.[sid]
    if (f) out.push({ tool: t.name, amount: f.amount, note: f.note })
  }
  return out
}

export function candidates(all: Tool[], p: Profile): ScoredTool[] {
  return all
    .filter((t) => !t.connector && !t.pending)
    .filter((t) => (!p.industry || t.industries.includes(p.industry)) && (!p.other || isGeneralTool(t)))
    .filter((t) => !t.requires || p.systems.includes(t.requires))
    .filter((t) => t.problems.some((id) => p.problems.includes(id)))
    .map((t) => scoreTool(t, p))
    .sort((a, b) => b.score - a.score)
}

function finish(key: Recipe['key'], items: ScoredTool[], all: Tool[], p: Profile): Recipe {
  const meta = {
    simple: { name: 'Simple', tagline: 'One tool for your biggest problem' },
    balanced: { name: 'Balanced', tagline: 'Covers as much as possible within your budget' },
    allin: { name: 'Stretch', tagline: 'Covers more of your problems, up to twice your budget' },
  }[key]

  // Add Zapier when a tool only reaches the owner's software through it
  let connector: Recipe['connector'] = null
  const zapierNeeded = items.filter((s) => {
    const best = bestStatus(s.badges)
    return best === 'zapier'
  })
  const zap = all.find((t) => t.id === 'zapier')
  if (zapierNeeded.length && zap) {
    const s = zapierNeeded[0]
    const sys = s.badges.find((b) => b.status === 'zapier')
    connector = { tool: zap, reason: `Needed to connect ${s.tool.name} to ${systemById(sys!.system)?.label}` }
  }

  const priced = [...items.map((s) => s.tool), ...(connector ? [connector.tool] : [])]
  const fees = sysFees(priced, p.systems)
  const usage = priced.flatMap((t) => {
    const u = usageCost(t, p.size)
    return u ? [{ tool: t.name, amount: u.amount, note: u.note }] : []
  })
  const knownTotal =
    priced.reduce((s, t) => s + (t.price ?? 0), 0) + fees.reduce((s, f) => s + f.amount, 0) + usage.reduce((s, f) => s + f.amount, 0)
  const unknownCount = priced.filter((t) => t.price === null).length
  const setupHours = priced.reduce((s, t) => s + t.setupMinutes, 0) / 60
  const covered = p.problems.filter((id) => items.some((s) => s.tool.problems.includes(id)))
  const score = items.length ? Math.round(items.reduce((s, x) => s + x.score, 0) / items.length) : 0

  return {
    key,
    ...meta,
    items,
    connector,
    fees,
    usage,
    knownTotal: Math.round(knownTotal * 100) / 100,
    unknownCount,
    setupHours,
    score,
    covered,
    missing: p.problems.filter((id) => !covered.includes(id)),
    overBudget: p.budget !== null && knownTotal > p.budget,
    merged: [],
  }
}

/** True when a is larger than b, comparing item by item */
function beats(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]
  return false
}

/**
 * Builds the Simple, Balanced, and Stretch recipes. The rules (also on "How we rank"):
 * - Simple: the cheapest near-best tool for the owner's first problem.
 * - Balanced: covers as many picked problems as possible within the budget.
 * - Stretch: the same, up to twice the budget.
 * - Each step up must cover more of the owner's problems; if it doesn't, it's merged.
 * - Never two tools doing the same job: a tool is only added for a problem the
 *   recipe doesn't already cover, and never next to a same-category tool that
 *   already handles one of its problems.
 * - Only problems the owner picked. Extras go in "Also worth a look", not here.
 * - Tools with a published price come first; quote-only tools are used only when
 *   no priced tool solves that problem.
 * Recipes that end up with the same tools are merged into one card.
 */
export function buildRecipes(all: Tool[], p: Profile): Recipe[] {
  const pool = candidates(all, p)
  if (pool.length === 0) return []
  const budget = p.budget ?? 150
  const cost = (s: ScoredTool) => monthlyCost(s.tool, p.size)
  const total = (items: ScoredTool[]) => items.reduce((n, s) => n + (cost(s) ?? 0), 0)
  const forProblem = (pid: string) => {
    const c = pool.filter((s) => s.tool.problems.includes(pid))
    const priced = c.filter((s) => cost(s) !== null)
    return priced.length ? priced : c
  }
  const coveredBy = (items: ScoredTool[]) => p.problems.filter((pid) => items.some((s) => s.tool.problems.includes(pid)))
  const sameJob = (s: ScoredTool, items: ScoredTool[]) =>
    items.some((i) => i.tool.category === s.tool.category && i.tool.problems.some((pid) => p.problems.includes(pid) && s.tool.problems.includes(pid)))

  // Simple: one easy tool for the first problem; the cheapest among the near-best
  const forPrimary = forProblem(p.problems[0])
  const easy = forPrimary.filter((s) => s.tool.effort <= Math.max(p.comfort, 1) && (cost(s) ?? Infinity) <= budget)
  const simpleBase = easy.length ? easy : forPrimary.length ? forPrimary : pool
  const topScore = simpleBase[0].score
  const simplePick = simpleBase
    .filter((s) => s.score >= topScore - 15)
    .sort((a, b) => (cost(a) ?? 9999) - (cost(b) ?? 9999) || b.score - a.score)[0]

  // Add the best tool for a problem not yet covered, while the total stays under the cap
  const grow = (start: ScoredTool[], cap: number) => {
    const items = [...start]
    for (;;) {
      const covered = coveredBy(items)
      const open = p.problems.filter((pid) => !covered.includes(pid))
      if (!open.length) break
      let best: ScoredTool | null = null
      let bestKey: number[] = []
      for (const pid of open) {
        for (const s of forProblem(pid)) {
          if (items.some((i) => i.tool.id === s.tool.id) || sameJob(s, items)) continue
          if (total(items) + (cost(s) ?? 0) > cap) continue
          const key = [open.filter((q) => s.tool.problems.includes(q)).length, cost(s) !== null ? 1 : 0, s.score, -(cost(s) ?? 0)]
          if (!best || beats(key, bestKey)) {
            best = s
            bestKey = key
          }
        }
      }
      if (!best) break
      items.push(best)
    }
    return items
  }

  let balanced = grow([], budget)
  // Each step up must cover more problems; otherwise it's the same recipe
  if (!balanced.length || coveredBy(balanced).length <= coveredBy([simplePick]).length) balanced = [simplePick]
  let stretch = grow([], budget * 2)
  const sc = coveredBy(stretch).length
  const bc = coveredBy(balanced).length
  if (!stretch.length || sc <= bc) stretch = balanced

  const built = [finish('simple', [simplePick], all, p), finish('balanced', balanced, all, p), finish('allin', stretch, all, p)]
  // Merge recipes with the same tools into one card, e.g. "Simple and Balanced"
  const out: Recipe[] = []
  for (const r of built) {
    const ids = r.items.map((s) => s.tool.id).sort().join()
    const twin = out.find((x) => x.items.map((s) => s.tool.id).sort().join() === ids)
    if (twin) {
      twin.merged.push(r.key)
      twin.name = twin.merged.length === 2 ? 'Simple · Balanced · Stretch' : `${twin.name} & ${r.name}`
    } else out.push(r)
  }
  return out
}

/** The recipe shown for a key, following merges ("balanced" may live inside "Simple & Balanced"). */
export function recipeFor(recipes: Recipe[], key: Recipe['key']): Recipe | undefined {
  return recipes.find((r) => r.key === key || r.merged.includes(key))
}

/** Tools worth a look that aren't in any recipe: a writing helper for marketing problems, then quote-only or higher-cost matches. */
export function alsoWorthALook(all: Tool[], p: Profile, recipes: Recipe[]): { s: ScoredTool; reason: string }[] {
  const inRecipes = new Set(recipes.flatMap((r) => r.items.map((s) => s.tool.id)))
  const out: { s: ScoredTool; reason: string }[] = []
  if (p.problems.some((id) => ['social-posts', 'reviews', 'writing', 'direct-orders'].includes(id))) {
    const helper = all.find((t) => t.id === 'chatgpt' && !inRecipes.has(t.id))
    if (helper) out.push({ s: scoreTool(helper, p), reason: 'Drafts posts, replies and emails for you to check. Not a must-have.' })
  }
  for (const s of candidates(all, p)) {
    if (inRecipes.has(s.tool.id) || out.some((o) => o.s.tool.id === s.tool.id)) continue
    const c = monthlyCost(s.tool, p.size)
    out.push({ s, reason: c === null ? 'Strong match, but the price is only by quote.' : p.budget !== null && c > p.budget ? 'Strong match, but over your budget.' : 'Also fits your problems; scored a bit lower.' })
    if (out.length >= 4) break
  }
  return out
}

export interface FlowStep {
  label: string
  sub: string
  kind: 'start' | 'tool' | 'system' | 'end'
}

/** "How these work together": a left-to-right flow for the recipe. */
export function recipeFlow(r: Recipe, p: Profile, industry: string | null): FlowStep[] {
  const order = CATEGORIES.map((c) => c.id)
  const items = [...r.items].sort((a, b) => order.indexOf(a.tool.category) - order.indexOf(b.tool.category))
  const start = r.items.some((s) => s.tool.category === 'phones')
    ? { label: 'A customer calls', sub: industry === 'restaurant' ? 'During the rush' : 'While you’re busy', kind: 'start' as const }
    : { label: 'Your week', sub: 'The task you picked', kind: 'start' as const }
  const steps: FlowStep[] = [start]
  for (const s of items) {
    steps.push({ label: s.tool.name, sub: s.tool.role, kind: 'tool' })
    // Only show systems where work actually lands (orders, jobs, bookings, books)
    const landing = ['fsm', 'pos', 'booking', 'accounting']
    const native = s.badges
      .filter((b) => b.status === 'native' && landing.includes(systemById(b.system)!.kind))
      .sort((a, b) => landing.indexOf(systemById(a.system)!.kind) - landing.indexOf(systemById(b.system)!.kind))[0]
    if (native) steps.push({ label: SYSTEMS.find((x) => x.id === native.system)!.label, sub: 'Saved automatically', kind: 'system' })
  }
  if (r.connector) steps.push({ label: 'Zapier', sub: 'Passes it to your other apps', kind: 'system' })
  steps.push({ label: 'Done', sub: p.problems.length > 1 ? 'Fewer tasks on your plate' : 'Problem handled', kind: 'end' })
  return steps
}

/** Which recipe to suggest first: follows the AI starting point, but never an over-budget recipe. */
export function recommendedKey(level: 'Starter' | 'Ready' | 'Advanced', recipes: Recipe[]): Recipe['key'] {
  const order: Recipe['key'][] = level === 'Starter' ? ['simple'] : level === 'Ready' ? ['balanced', 'simple'] : ['allin', 'balanced', 'simple']
  // First choice: within budget and every price re-checked in the last 90 days
  for (const k of order) {
    const r = recipeFor(recipes, k)
    if (r && !r.overBudget && !r.items.some((i) => isStale(i.tool))) return r.key
  }
  for (const k of order) {
    const r = recipeFor(recipes, k)
    if (r && !r.overBudget) return r.key
  }
  return recipeFor(recipes, order[0])?.key ?? order[0]
}
