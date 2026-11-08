import { useState } from 'react'
import { CalendarClock, Check, ChevronDown, Copy, ExternalLink, HardDrive, LifeBuoy, Mail, PartyPopper, Pencil, RotateCcw } from 'lucide-react'
import { Logo } from '../components/Logo'
import { getPlanTemplates, getSeasons } from '../lib/repo'
import { SeasonCards } from '../components/SeasonCard'
import { track } from '../lib/storage'
import { systemById } from '../lib/repo'
import { badgesFor } from '../engine/recipes'
import { Button, Card, DarkHero, HeroStat, money } from '../components/ui'
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
/** SBA's ZIP code lookup for the nearest SBDC, SCORE chapter or other free help, in any state */
const SBA_LOCATOR = 'https://www.sba.gov/local-assistance/find'
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
  const [open, setOpen] = useState<Set<string>>(() => new Set())
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
  const total = plan.total ?? tools.reduce((s, t) => s + (t.price ?? 0), 0)
  const quotes = plan.unknownCount ?? tools.filter((t) => t.price === null).length

  const summary = [
    `My ToolRecipe plan (${plan.recipeName} recipe)`,
    `Tools: ${tools.map((t) => `${t.name} (${t.priceLabel})`).join('; ')}`,
    `Estimated monthly cost: ${money(total)}${quotes ? ' plus quotes' : ''}`,
    '',
    ...steps.map((s) => `Day ${s.day} (${dateOf(s.day)}): ${s.title}`),
  ].join('\n')

  const toggle = (id: string) => {
    if (!done.has(id)) track('step_checked', { step: id })
    setPlan({ ...plan, done: done.has(id) ? plan.done.filter((x) => x !== id) : [...plan.done, id] })
  }

  const weeks = [1, 2, 3, 4].map((w) => ({
    w,
    from: (w - 1) * 7 + 1,
    to: w === 4 ? 30 : w * 7,
    steps: steps.filter((s) => Math.min(4, Math.ceil(s.day / 7)) === w),
  })).filter((x) => x.steps.length)
  const next = steps.find((s) => !done.has(s.id))
  const toolOf = (name: string) => tools.find((t) => t.name === name)
  const checkinDue = new Date(start.getTime() + 29 * 86400000)
  const checkinDate = checkinDue.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
  const checkinOpen = Date.now() >= checkinDue.getTime()
  const allDone = done.size === steps.length

  return (
    <div className="fade-in">
      <DarkHero
        eyebrow={<>My 30-day plan · {plan.recipeName} recipe</>}
        title={tools.map((t) => t.name).join(' + ')}
        action={
          <button onClick={() => go('results')} className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-white/30 px-4 font-semibold hover:border-white">
            <Pencil size={16} aria-hidden /> Change recipe
          </button>
        }
      >
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-10">
          <HeroStat
            gold
            value={
              <>
                {money(Math.floor(total))}
                <span className="text-2xl">.{String(Math.round((total % 1) * 100)).padStart(2, '0')}</span>
              </>
            }
            label={<>a month, every fee we found{quotes ? ' + a quote' : ''}</>}
          />
          <div aria-live="polite">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">
                {done.size} of {steps.length} steps done
              </span>
              <span className="font-display text-2xl tabular-nums">{pct}%</span>
            </div>
            <div role="progressbar" aria-label="Plan progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-3 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 truncate text-sm text-fog">{next ? <>Up next: {next.title}</> : `All done. We’ll ask how it’s going on ${checkinDate}.`}</p>
          </div>
        </div>
      </DarkHero>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <p className="flex items-start gap-2.5 rounded-2xl border border-line bg-white px-4 py-3 text-[15px]">
            <HardDrive size={18} aria-hidden className="mt-0.5 shrink-0 text-brand" />
            <span>
              <strong>Saved on this device only.</strong> <span className="text-ink-soft">Email or copy your plan to keep it somewhere safe.</span>
            </span>
          </p>
          {allDone && (
            <div className="pop flex items-start gap-3 rounded-3xl bg-ok-soft p-5" role="status">
              <PartyPopper size={26} aria-hidden className="shrink-0 text-ok" />
              <div>
                <p className="font-display text-2xl">You’re set up.</p>
                <p className="mt-1 text-ink-soft">Every step is done. We’ll ask how it’s going on {checkinDate}.</p>
              </div>
            </div>
          )}
          {weeks.map((wk) => {
            const doneHere = wk.steps.filter((s) => done.has(s.id)).length
            return (
              <section key={wk.w} className="rounded-3xl border border-black/[0.07] bg-white p-2 sm:p-3" aria-labelledby={`wk-${wk.w}`}>
                <div className="flex items-center justify-between gap-3 px-3 pb-1 pt-2">
                  <h2 id={`wk-${wk.w}`} className="flex items-baseline gap-3">
                    <span className="font-display text-xl" style={{ letterSpacing: '0.01em' }}>Week {wk.w}</span>
                    <span className="text-sm tracking-[0.03em] text-ink-soft">Days {wk.from}–{wk.to}</span>
                  </h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold tabular-nums ${doneHere === wk.steps.length ? 'bg-ok-soft text-ok' : 'bg-paper text-ink-soft'}`}>
                    {doneHere}/{wk.steps.length}
                  </span>
                </div>
                <ol>
                  {wk.steps.map((s) => {
                    const on = done.has(s.id)
                    const t = toolOf(s.tool)
                    const isOpen = open.has(s.id)
                    return (
                      <li key={s.id} className="rounded-2xl hover:bg-paper">
                        <div className="flex items-center gap-2 p-2.5 sm:gap-3 sm:p-3">
                          <label className="row-focus flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-xl sm:gap-3">
                            <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(s.id)} />
                            <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition ${on ? 'border-brand bg-brand text-white' : 'border-black/20 bg-white'}`}>
                              {on && <Check size={18} />}
                            </span>
                            <span className="w-11 shrink-0 text-center sm:w-12">
                              <span className="block text-sm font-semibold uppercase tracking-wide text-ink-soft">Day</span>
                              <span className="block font-display text-xl leading-none tabular-nums">{s.day}</span>
                            </span>
                            <span className="min-w-0">
                              <span className={`block font-semibold leading-snug ${on ? 'text-muted line-through' : ''}`}>{s.title}</span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-soft">
                                {t && <Logo name={t.name} size={18} />}
                                {dateOf(s.day)}
                              </span>
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n })}
                            aria-expanded={isOpen}
                            aria-label={`How to: ${s.title}`}
                            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full px-2 text-sm font-semibold sm:px-3 text-ink-soft hover:bg-black/[0.05] hover:text-ink"
                          >
                            <span className="hidden sm:inline">How</span> <ChevronDown size={15} aria-hidden className={`transition ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        {isOpen && <p className="fade-in -mt-1 pb-3 pl-4 pr-4 text-[15px] sm:pl-[7.25rem] text-ink-soft">{s.how}</p>}
                      </li>
                    )
                  })}
                </ol>
              </section>
            )
          })}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="p-5">
            <p className="flex items-center gap-2 font-semibold">
              <LifeBuoy size={18} aria-hidden /> Want a person to help?
            </p>
            <p className="mt-1 text-sm text-ink-soft">Free, confidential setup help.</p>
            <div className="mt-3 divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.07]">
              <a className="flex min-h-12 items-center justify-between gap-2 px-3.5 font-semibold hover:bg-paper" href={SBA_LOCATOR} target="_blank" rel="noreferrer">
                SBDC near you (any state) <ExternalLink size={16} aria-hidden className="text-ink-soft" />
              </a>
              <a className="flex min-h-12 items-center justify-between gap-2 px-3.5 font-semibold hover:bg-paper" href={SBDC} target="_blank" rel="noreferrer">
                Maryland SBDC <ExternalLink size={16} aria-hidden className="text-ink-soft" />
              </a>
              <a className="flex min-h-12 items-center justify-between gap-2 px-3.5 font-semibold hover:bg-paper" href={SCORE} target="_blank" rel="noreferrer">
                SCORE mentor <ExternalLink size={16} aria-hidden className="text-ink-soft" />
              </a>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-brand px-3 text-sm font-semibold text-white hover:bg-brand-dark"
                href={`mailto:?subject=${encodeURIComponent('My AI adoption plan from ToolRecipe')}&body=${encodeURIComponent(`Hi, could you look over this plan with me?\n\n${summary}`)}`}
              >
                <Mail size={15} aria-hidden /> Email plan
              </a>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(summary).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  )
                }}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-black/15 px-3 text-sm font-semibold hover:border-ink"
              >
                <Copy size={15} aria-hidden /> {copied ? 'Copied!' : 'Copy plan'}
              </button>
            </div>
          </Card>

          <Card className="p-5">
            <p className="font-semibold">Day 30: is it working?</p>
            {checkinOpen ? (
              <p className="text-sm text-ink-soft">Helps the next owner like you.</p>
            ) : (
              <p className="mt-1 flex items-start gap-2 rounded-xl bg-paper p-3 text-sm">
                <CalendarClock size={17} aria-hidden className="mt-0.5 shrink-0 text-brand" />
                <span>
                  We’ll ask how it’s going on <strong>{checkinDate}</strong>, once you’ve had time to try the tools.
                </span>
              </p>
            )}
            <div className="mt-3 space-y-3">
              {tools.map((t) => (
                <div key={t.id}>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Logo name={t.name} size={22} /> {t.name}
                  </p>
                  <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-full bg-paper p-1" role="radiogroup" aria-label={`Is ${t.name} working?`}>
                    {['Yes', 'Somewhat', 'No'].map((v) => (
                      <button
                        key={v}
                        role="radio"
                        aria-checked={checkins[t.id] === v}
                        disabled={!checkinOpen}
                        onClick={() => {
                          setCheckin(t.id, v)
                          track('checkin_answered', { tool: t.id, answer: v })
                        }}
                        className={`min-h-11 rounded-full text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${checkins[t.id] === v ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {Object.keys(checkins).length > 0 && <p className="mt-3 text-sm text-ok">Saved on this device. Thanks!</p>}
            <button onClick={() => go('profile')} className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-soft underline underline-offset-2 hover:text-ink">
              <RotateCcw size={14} aria-hidden /> Update my software or budget
            </button>
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
