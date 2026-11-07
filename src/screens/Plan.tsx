import { useState } from 'react'
import { Check, Copy, ExternalLink, LifeBuoy, Mail, RotateCcw } from 'lucide-react'
import { getPlanTemplates, getSeasons } from '../lib/repo'
import { SeasonCards } from '../components/SeasonCard'
import { track } from '../lib/storage'
import { systemById } from '../lib/repo'
import { badgesFor } from '../engine/recipes'
import { Button, Card, money } from '../components/ui'
import type { Route } from '../state'
import type { PlanState, Profile, Tool } from '../types'

interface Step {
  id: string
  day: number
  title: string
  how: string
  tool: string
}

function buildSteps(tools: Tool[], profile: Profile): Step[] {
  const { templates: PLAN_TEMPLATES, final: FINAL_STEPS } = getPlanTemplates()
  const steps: Step[] = []
  tools.forEach((t, i) => {
    const priority = ['fsm', 'pos', 'booking', 'accounting', 'email', 'social', 'google']
    const native = badgesFor(t, profile.systems)
      .filter((b) => b.status === 'native')
      .sort((a, b) => priority.indexOf(systemById(a.system)!.kind) - priority.indexOf(systemById(b.system)!.kind))[0]
    const system = native ? systemById(native.system)!.label : t.requires ? systemById(t.requires)!.label : 'your phone or other apps'
    const offset = i * 7 // stagger tools a week apart so it isn't overwhelming
    for (const tpl of PLAN_TEMPLATES[t.category]) {
      steps.push({
        id: `${t.id}-${tpl.day}`,
        day: Math.min(29, tpl.day + offset),
        title: tpl.title.replace('{tool}', t.name).replace('{system}', system),
        how: tpl.how.replace('{tool}', t.name).replace('{system}', system),
        tool: t.name,
      })
    }
  })
  steps.sort((a, b) => a.day - b.day)
  FINAL_STEPS.forEach((f) => steps.push({ id: `final-${f.day}`, day: f.day, title: f.title, how: f.how, tool: 'All' }))
  return steps
}

const SBDC = 'https://www.marylandsbdc.org/consulting'
const SCORE = 'https://www.score.org/find-mentor/request-mentor'

export function Plan({
  plan,
  setPlan,
  allTools,
  profile,
  update,
  go,
  checkins,
  setCheckin,
}: {
  plan: PlanState | null
  setPlan: (p: PlanState | null) => void
  allTools: Tool[]
  profile: Profile
  update: (p: Partial<Profile>) => void
  go: (r: Route) => void
  checkins: Record<string, string>
  setCheckin: (id: string, v: string) => void
}) {
  const [copied, setCopied] = useState(false)
  if (!plan) {
    return (
      <Card className="fade-in p-6">
        <h1 className="font-display text-3xl font-semibold">No plan yet</h1>
        <p className="mt-2 text-ink-soft">Pick a recipe and tap “Start this recipe” to get a 30-day plan.</p>
        <Button className="mt-4" onClick={() => go(profile.problems.length ? 'results' : 'home')}>
          {profile.problems.length ? 'Back to my recipes' : 'Find my tools'}
        </Button>
      </Card>
    )
  }
  const tools = plan.toolIds.map((id) => allTools.find((t) => t.id === id)).filter((t): t is Tool => !!t)
  const steps = buildSteps(tools, profile)
  const start = new Date(plan.startedAt)
  const dateOf = (d: number) => new Date(start.getTime() + (d - 1) * 86400000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const done = new Set(plan.done)
  const pct = Math.round((done.size / steps.length) * 100)
  const total = tools.reduce((s, t) => s + (t.price ?? 0), 0)

  const summary = [
    `My ToolRecipe plan (${plan.recipeName} recipe)`,
    `Tools: ${tools.map((t) => `${t.name} (${t.priceLabel})`).join('; ')}`,
    `Estimated monthly cost: ${money(total)}${tools.some((t) => t.price === null) ? ' plus quotes' : ''}`,
    '',
    ...steps.map((s) => `Day ${s.day} (${dateOf(s.day)}): ${s.title}`),
  ].join('\n')

  const toggle = (id: string) => {
    if (!done.has(id)) track('step_checked', { step: id })
    setPlan({ ...plan, done: done.has(id) ? plan.done.filter((x) => x !== id) : [...plan.done, id] })
  }

  return (
    <div className="fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">My 30-day plan · {plan.recipeName} recipe</p>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{tools.map((t) => t.name).join(' + ')}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={() => go('results')}>
          Change recipe
        </Button>
      </div>

      <div className="mt-4" aria-live="polite">
        <div className="flex justify-between text-sm">
          <span className="font-semibold">
            {done.size} of {steps.length} steps done
          </span>
          <span>{pct}%</span>
        </div>
        <div className="mt-1 h-3 rounded-full bg-line">
          <div className="h-3 rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-2 sm:p-4">
          <ol>
            {steps.map((s) => {
              const on = done.has(s.id)
              return (
                <li key={s.id} className="border-b border-line last:border-0">
                  <label className="flex cursor-pointer items-start gap-4 rounded-xl p-3 hover:bg-paper">
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(s.id)} />
                    <span aria-hidden className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${on ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>
                      {on && <Check size={18} />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm text-muted">
                        Day {s.day} · {dateOf(s.day)}
                        {s.tool !== 'All' && ` · ${s.tool}`}
                      </span>
                      <span className={`block text-lg font-semibold ${on ? 'text-muted line-through' : ''}`}>{s.title}</span>
                      <span className="block text-ink-soft">{s.how}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ol>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="p-5">
            <p className="flex items-center gap-2 font-semibold">
              <LifeBuoy size={18} aria-hidden /> Want a person to help?
            </p>
            <p className="mt-1 text-sm text-ink-soft">The Maryland Small Business Development Center offers free, confidential consulting. SCORE offers free mentoring nationwide.</p>
            <div className="mt-3 space-y-2">
              <a className="flex min-h-12 items-center justify-between rounded-xl border-2 border-line bg-white px-3 font-semibold hover:border-brand" href={SBDC} target="_blank" rel="noreferrer">
                Get free setup help (Maryland SBDC) <ExternalLink size={16} aria-hidden />
              </a>
              <a className="flex min-h-12 items-center justify-between rounded-xl border-2 border-line bg-white px-3 font-semibold hover:border-brand" href={SCORE} target="_blank" rel="noreferrer">
                Request a free SCORE mentor <ExternalLink size={16} aria-hidden />
              </a>
              <a
                className="flex min-h-12 items-center justify-between rounded-xl bg-brand px-3 font-semibold text-white hover:bg-brand-dark"
                href={`mailto:?subject=${encodeURIComponent('My AI adoption plan from ToolRecipe')}&body=${encodeURIComponent(`Hi, could you look over this plan with me?\n\n${summary}`)}`}
              >
                Share with my SBDC advisor <Mail size={16} aria-hidden />
              </a>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(summary).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  )
                }}
                className="flex min-h-12 w-full items-center justify-between rounded-xl border-2 border-line bg-white px-3 font-semibold hover:border-brand"
              >
                {copied ? 'Copied!' : 'Copy plan as text'} <Copy size={16} aria-hidden />
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <p className="font-semibold">Day-30 check-in: is it working?</p>
            <p className="text-sm text-ink-soft">Your answer helps the next owner like you. We count check-ins before showing any results.</p>
            {tools.map((t) => (
              <div key={t.id} className="mt-3">
                <p className="text-sm font-semibold">{t.name}</p>
                <div className="mt-1 flex gap-2" role="radiogroup" aria-label={`Is ${t.name} working?`}>
                  {['Yes', 'Somewhat', 'No'].map((v) => (
                    <button
                      key={v}
                      role="radio"
                      aria-checked={checkins[t.id] === v}
                      onClick={() => {
                        setCheckin(t.id, v)
                        track('checkin_answered', { tool: t.id, answer: v })
                      }}
                      className={`min-h-10 flex-1 rounded-lg border-2 text-sm font-semibold ${checkins[t.id] === v ? 'border-brand bg-brand-soft' : 'border-line bg-white'}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(checkins).length > 0 && <p className="mt-3 text-sm text-ok">Thanks. Saved on this device. Similar-business results appear once enough owners check in.</p>}
            <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => go('profile')}>
              <RotateCcw size={16} aria-hidden /> Retake my AI starting point
            </Button>
          </Card>

          {!profile.other && getSeasons(profile.industry).length > 0 && (
            <Card className="p-5">
              <SeasonCards compact profile={profile} update={update} onAdded={() => go('results')} />
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}
