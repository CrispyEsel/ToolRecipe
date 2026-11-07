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
  return { amount, note: `about ${vol} ${tool.usage.unit} a month: ${extra} over the ${tool.usage.included} included × $${tool.usage.overage}` }
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
    balanced: { name: 'Balanced', tagline: 'A small set that covers your problems' },
    allin: { name: 'All-in', tagline: 'The strongest option for each problem' },
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
  }
}

/** Builds the Simple, Balanced, and All-in recipes. */
export function buildRecipes(all: Tool[], p: Profile): Recipe[] {
  const pool = candidates(all, p)
  if (pool.length === 0) return []
  const budget = p.budget ?? 150
  const primary = p.problems[0]

  // Simple: one easy tool for the first problem; the cheapest among the near-best
  const forPrimary = pool.filter((s) => s.tool.problems.includes(primary))
  const easy = forPrimary.filter((s) => { const c = monthlyCost(s.tool, p.size); return s.tool.effort <= Math.max(p.comfort, 1) && c !== null && c <= budget })
  const simpleBase = easy.length ? easy : forPrimary.length ? forPrimary : pool
  const topScore = simpleBase[0].score
  const simplePick = [...simpleBase.filter((s) => s.score >= topScore - 15)].sort(
    (a, b) => (monthlyCost(a.tool, p.size) ?? 9999) - (monthlyCost(b.tool, p.size) ?? 9999) || b.score - a.score,
  )[0]

  // Balanced: try combinations of the top few tools per problem and keep the one
  // that covers the most problems within budget, then has the best average score
  const perProblem = p.problems.slice(0, 3).map((pid) => pool.filter((s) => s.tool.problems.includes(pid)).slice(0, 4))
  let bestCombo: ScoredTool[] = []
  let bestKey = [-1, -1, -1]
  const walk = (i: number, picked: ScoredTool[]) => {
    if (i === perProblem.length) {
      const uniq = [...new Map(picked.map((s) => [s.tool.id, s])).values()]
      const cost = uniq.reduce((s, x) => s + (monthlyCost(x.tool, p.size) ?? 0), 0)
      if (cost > budget) return
      const cov = p.problems.filter((pid) => uniq.some((s) => s.tool.problems.includes(pid))).length
      const avg = uniq.length ? uniq.reduce((s, x) => s + x.score, 0) / uniq.length : 0
      const key = [cov, Math.round(avg), -uniq.length]
      if (key[0] > bestKey[0] || (key[0] === bestKey[0] && (key[1] > bestKey[1] || (key[1] === bestKey[1] && key[2] > bestKey[2])))) {
        bestKey = key
        bestCombo = uniq
      }
      return
    }
    if (perProblem[i].length === 0) walk(i + 1, picked)
    for (const s of perProblem[i]) walk(i + 1, [...picked, s])
    walk(i + 1, picked)
  }
  walk(0, [])
  const balanced = bestCombo.length ? bestCombo : [simplePick]

  // All-in: top scorer per problem up to 2x budget
  const allin: ScoredTool[] = []
  for (const pid of p.problems) {
    const choice = pool.find((s) => { const c = monthlyCost(s.tool, p.size); return s.tool.problems.includes(pid) && (c === null || c <= budget * 2) })
    if (choice && !allin.some((s) => s.tool.id === choice.tool.id)) allin.push(choice)
  }
  // ...plus a writing helper when the owner picked a marketing or writing problem
  const wantsHelp = p.problems.some((id) => ['social-posts', 'reviews', 'writing', 'direct-orders'].includes(id))
  const helperId = allin.some((s) => s.tool.id === 'chatgpt') ? 'canva' : 'chatgpt'
  const helperTool = all.find((t) => t.id === helperId)
  if (wantsHelp && helperTool && !allin.some((s) => s.tool.id === helperId)) {
    const helper = scoreTool(helperTool, p)
    helper.why.unshift(helperId === 'chatgpt' ? 'Extra: drafts posts, replies, and emails for you to check' : 'Extra: makes flyers and social posts in minutes')
    allin.push(helper)
  }
  if (allin.length === 0) allin.push(simplePick)

  // All-in must add something: if it matches Balanced, add the best tool for a
  // closely related problem the owner didn't pick (missed calls, then reviews)
  const sameAsBalanced = allin.map((s) => s.tool.id).sort().join() === balanced.map((s) => s.tool.id).sort().join()
  if (sameAsBalanced && p.industry) {
    const bonus = ['missed-calls', 'reviews', 'social-posts'].find((x) => !p.problems.includes(x))
    if (bonus) {
      const pick = candidates(all, { ...p, problems: [bonus] }).find((s) => {
        const c = monthlyCost(s.tool, p.size)
        return !allin.some((a) => a.tool.id === s.tool.id) && c !== null && c <= budget
      })
      if (pick) {
        const extra = scoreTool(pick.tool, p)
        const pr = problemById(bonus)
        extra.why.unshift(`Extra: also handles “${pr ? problemLabel(pr, wordingIndustry(p)) : bonus}”`)
        allin.push(extra)
      }
    }
  }

  return [finish('simple', [simplePick], all, p), finish('balanced', balanced, all, p), finish('allin', allin.slice(0, 4), all, p)]
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
    const r = recipes.find((x) => x.key === k)
    if (r && !r.overBudget && !r.items.some((i) => isStale(i.tool))) return k
  }
  for (const k of order) {
    const r = recipes.find((x) => x.key === k)
    if (r && !r.overBudget) return k
  }
  return order[0]
}
