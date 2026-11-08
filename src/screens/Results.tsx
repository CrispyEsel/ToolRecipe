import { useEffect, useMemo, useRef, useState } from 'react'
import { fmtDate, hoursLabel } from '../lib/format'
import { CATEGORY_STYLE } from '../lib/categoryStyle'
import { Logo } from '../components/Logo'
import { useCountUp, useCountUpFromZero } from '../lib/useCountUp'
import { leakEstimate, simInputs } from '../engine/simulate'
import { defaultsFor } from '../lib/business'
import { businessLabel, isOther, wordingIndustry } from '../lib/business'
import { daysSince } from '../lib/freshness'
import { AlertTriangle, ArrowRight, ChevronDown, Clock, ExternalLink, Info, MessageSquarePlus, Pencil, Plus, Star, Volume2 } from 'lucide-react'
import { industryById, problemById, problemLabel, systemById } from '../lib/repo'
import { alsoWorthALook, recipeFor, usageCost, type Recipe, type ScoredTool } from '../engine/recipes'
import { StackMap } from '../components/StackMap'
import { FunFact } from '../components/FunFact'
import { FEATURES, STALE_DAYS } from '../lib/config'
import { NeedForm } from '../components/NeedForm'
import { StackSnap } from '../components/StackSnap'
import { Button, Card, CompatLine, Drawer, Eyebrow, Steps, money } from '../components/ui'
import type { Route } from '../state'
import type { CategoryId, Profile, Tool } from '../types'
import { FlagLine } from '../components/FlagPill'

type Props = {
  profile: Profile
  update: (p: Partial<Profile>) => void
  go: (r: Route) => void
  recipes: Recipe[]
  allTools: Tool[]
  selected: Recipe['key']
  setSelected: (k: Recipe['key']) => void
  openTool: (t: Tool) => void
  startPlan: (r: Recipe) => void
  recommended: Recipe['key']
  openTestDrive: (t: Tool) => void
}

export { hoursLabel }

/** "Checked 3 days ago", amber once a price is older than STALE_DAYS */
function Freshness({ tool }: { tool: Tool }) {
  const days = daysSince(tool.checked)
  const stale = days > STALE_DAYS
  return (
    <p className={`text-sm ${stale ? 'font-semibold text-warn' : 'text-muted'}`} title={`Price and details last checked ${fmtDate(tool.checked)}`}>
      {stale ? `⚠ Price needs re-check (last checked ${fmtDate(tool.checked)})` : `Price checked ${fmtDate(tool.checked)}`}
    </p>
  )
}

function ToolRow({ s, profile, openTool }: { s: ScoredTool; profile: Profile; openTool: (t: Tool) => void }) {
  const [more, setMore] = useState(false)
  const t = s.tool
  const usage = usageCost(t, profile.size)
  return (
    <li className="fade-in flex gap-4 py-5 first:pt-0">
      <Logo name={t.name} size={48} className="mt-0.5" />
      <div className="min-w-0 flex-1">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <button onClick={() => openTool(t)} className="text-left text-lg font-semibold hover:underline">
            {t.name}
          </button>
          {(() => {
            const c = CATEGORY_STYLE[t.category]
            const Icon = c.icon
            return (
              <span className={`ml-2 inline-flex translate-y-[-2px] items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold ${c.tile}`}>
                <Icon size={13} aria-hidden /> {c.label}
              </span>
            )
          })()}
        </div>
        <div className="flex items-baseline gap-3 sm:block sm:text-right">
          <p className="font-semibold tabular-nums">{t.price === null ? 'Quote only' : t.price === 0 ? 'Included' : `${money(t.price)}/mo`}</p>
          <Freshness tool={t} />
        </div>
      </div>
      <p className="mt-1 text-ink-soft">{t.does}</p>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        {s.badges.length ? (
          s.badges.map((b) => <CompatLine key={b.system} system={b.system} status={b.status} />)
        ) : (
          <span className="text-sm text-ink-soft">{t.standalone ? 'Works on its own' : 'No connection needed'}</span>
        )}
      </div>
      {t.flags && t.flags.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {t.flags.slice(0, 2).map((f) => (
            <FlagLine key={f.text} f={f} />
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <button className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand" aria-expanded={more} onClick={() => setMore((w) => !w)}>
          Why this one <ChevronDown size={16} className={more ? 'rotate-180' : ''} aria-hidden />
        </button>
        <button className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line px-3 font-semibold text-brand hover:border-brand" onClick={() => openTool(t)}>
          Sources and details
        </button>
      </div>
      {more && (
        <div className="fade-in mt-3 border-l-2 border-line pl-4 text-sm">
          <p className="font-semibold">Match {s.score}/100</p>
          <ul className="mt-1 text-ink-soft">
            {s.why.map((w) => (
              <li key={w}>✓ {w}</li>
            ))}
          </ul>
          {t.extraFees && <p className="mt-2 text-ink-soft">Pricing: {t.extraFees}</p>}
          {usage && <p className="mt-1 text-ink-soft">Usage for a business your size: about +{money(usage.amount)}/mo ({usage.note})</p>}
          {t.flags && t.flags.length > 2 && (
            <ul className="mt-2 space-y-0.5">
              {t.flags.slice(2).map((f) => (
                <FlagLine key={f.text} f={f} />
              ))}
            </ul>
          )}
        </div>
      )}
      </div>
    </li>
  )
}

/** Recipe cost next to the estimated monthly leak, plus a break-even line */
function WorthIt({ r, profile, go }: { r: Recipe; profile: Profile; go: (r: Route) => void }) {
  const leak = leakEstimate(profile)
  const inp = simInputs(profile)
  const cost = r.knownTotal
  const leakAmt = leak ? Math.round(leak.monthly / 10) * 10 : 0
  const max = Math.max(cost, leakAmt, 1)
  const costShown = useCountUpFromZero(cost)
  const leakShown = useCountUpFromZero(leakAmt)
  const breakEven = inp.avgValue > 0 ? Math.max(1, Math.ceil(cost / inp.avgValue)) : null
  const unit = defaultsFor(profile).valueLabel.toLowerCase().replace(/^average\s+/, '')
  return (
    <section className="rounded-3xl border border-black/[0.07] bg-gradient-to-br from-accent-soft to-white p-5 sm:p-6" aria-labelledby="worth-h">
      <h2 id="worth-h" className="font-display text-2xl">Is it worth it?</h2>
      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">This recipe costs</span>
            <span className="font-display text-2xl tabular-nums"><span aria-hidden>{money(Math.round(costShown))}</span><span className="sr-only">{money(Math.round(cost))}</span><span className="text-sm font-normal text-ink-soft">/mo</span></span>
          </div>
          <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-black/[0.06]">
            <div className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out" style={{ width: `${(costShown / max) * 100}%` }} />
          </div>
        </div>
        {leak && (
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">{leak.callMonthly > 0 ? 'What missed calls may cost you' : 'What the lost time may cost you'}</span>
              <span className="font-display text-2xl tabular-nums"><span aria-hidden>{money(Math.round(leakShown))}</span><span className="sr-only">{money(leakAmt)}</span><span className="text-sm font-normal text-ink-soft">/mo</span></span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-black/[0.06]">
              <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${(leakShown / max) * 100}%` }} />
            </div>
          </div>
        )}
      </div>
      {breakEven !== null && (
        <p className="mt-5 rounded-xl bg-white/80 p-3 text-[15px] leading-snug">
          <strong>Pays for itself with about {breakEven} extra {unit}{breakEven === 1 ? '' : 's'} a month</strong>
          <span className="text-ink-soft"> (at {money(inp.avgValue)} each).</span>
        </p>
      )}
      {leak && (
        <p className="mt-3 text-sm text-ink-soft">
          Based on {leak.basis.join('; and ')}. {profile.example ? 'These are the example business’s numbers.' : leak.usingDefaults ? 'These are starting guesses.' : 'Using your numbers.'}
        </p>
      )}
      <button onClick={() => go('day')} className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand underline underline-offset-4 hover:no-underline">
        {leak && (leak.usingDefaults || profile.example) ? 'Use my own numbers' : 'Preview my day'} <ArrowRight size={16} aria-hidden />
      </button>
    </section>
  )
}

/** The real monthly cost, line by line, like a receipt */
function Receipt({ r, profile }: { r: Recipe; profile: Profile }) {
  const lines: { label: string; note?: string; amount: number | null }[] = []
  for (const s of r.items) lines.push({ label: s.tool.name, amount: s.tool.price })
  for (const u of r.usage) lines.push({ label: `${u.tool} usage`, note: u.note, amount: u.amount })
  if (r.connector) lines.push({ label: `${r.connector.tool.name} (added for you)`, note: r.connector.reason, amount: r.connector.tool.price ?? 0 })
  for (const f of r.fees) lines.push({ label: `Fee for ${f.tool}`, note: f.note, amount: f.amount })
  const fmt = (n: number) => (n === 0 ? '$0.00' : `$${n.toFixed(2)}`)
  const shown = useCountUp(r.knownTotal)
  return (
    <div className="rounded-xl border border-dashed border-ink/30 bg-white px-5 py-4 font-mono text-sm" aria-label="Monthly cost breakdown">
      <p className="text-center text-sm tracking-[0.12em] text-muted">WHAT YOU’LL PAY EACH MONTH</p>
      <ul className="mt-3 space-y-2">
        {lines.map((l) => (
          <li key={l.label + (l.note ?? '')}>
            <div className="flex items-baseline gap-2">
              <span className="min-w-0">{l.label}</span>
              <span aria-hidden className="flex-1 translate-y-[-3px] border-b border-dotted border-ink/30" />
              <span className="shrink-0 tabular-nums">{l.amount === null ? 'quote' : fmt(l.amount)}</span>
            </div>
            {l.note && <p className="font-sans text-sm text-muted">{l.note}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-baseline justify-between border-t-2 border-ink pt-2 text-base font-bold">
        <span>TOTAL</span>
        <span className="tabular-nums">
          <span aria-hidden>{fmt(Math.round(shown * 100) / 100)}</span>
          <span className="sr-only">{fmt(r.knownTotal)}</span>/mo{r.unknownCount ? ' + quote' : ''}
        </span>
      </div>
      {profile.budget !== null && (
        <p className={`mt-1 text-right font-sans text-sm ${r.overBudget ? 'text-bad' : 'text-ok'}`}>
          {r.overBudget ? `Over your $${profile.budget} budget` : `Within your $${profile.budget} budget`}
        </p>
      )}
      {r.unknownCount > 0 && <p className="mt-1 font-sans text-sm text-muted">{r.unknownCount} tool{r.unknownCount > 1 ? 's don’t' : ' doesn’t'} publish a price; ask the vendor for a quote.</p>}
    </div>
  )
}

const SBA_LOCATOR = 'https://www.sba.gov/local-assistance/find'
/** Lowercase the first letter for mid-sentence use, but keep “I” capitalized */
const lowerFirst = (t: string) => (/^I[\s’']/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1))

/** One expandable section in "The details" */
function Section({ title, sub, children, defaultOpen = false }: { title: string; sub?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group border-t border-line first:border-t-0" open={defaultOpen}>
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 sm:px-6">
        <span className="flex-1">
          <span className="block text-lg font-semibold">{title}</span>
          {sub && <span className="block text-[15px] text-ink-soft">{sub}</span>}
        </span>
        <ChevronDown size={22} aria-hidden className="shrink-0 text-ink-soft transition group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-6 sm:px-6">{children}</div>
    </details>
  )
}

export function Results({ profile, update, go, recipes, allTools, selected, setSelected, openTool, startPlan, recommended, openTestDrive }: Props) {
  const r = recipeFor(recipes, selected) ?? recipes[0]
  const [sheet, setSheet] = useState(false)
  const [announce, setAnnounce] = useState('')

  const alsoConsider = useMemo(() => alsoWorthALook(allTools, profile, recipes), [recipes, allTools, profile])

  // Tell screen readers what changed after a software tap
  const firstRun = useRef(true)
  const sysKey = profile.systems.join(',')
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    if (!r) return
    const names = profile.systems.filter((x) => x !== 'paper').map((id) => systemById(id)?.label ?? id)
    const linked = r.items.filter((s) => s.badges.some((b) => b.status === 'native')).length
    setAnnounce(
      names.length
        ? `Updated: ${linked} of ${r.items.length} tools in ${r.name} now connect directly to ${names.join(', ')}. Total ${money(Math.round(r.knownTotal))} a month.`
        : `Updated: no software picked. ${r.name} costs ${money(Math.round(r.knownTotal))} a month.`,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sysKey])

  if (!recipes.length || !r) {
    return (
      <div className="fade-in">
        <Steps step={3} />
        <Card className="p-6">
          <h1 className="font-display text-3xl font-semibold">We don’t have a tool for that yet</h1>
          <p className="mt-2 text-ink-soft">None of the tools in our catalog fit this combination yet. Tell us what you need: requests show vendors where the gaps are.</p>
          <NeedForm profile={profile} />
          <Button variant="ghost" className="mt-4" onClick={() => go('problem')}>
            Or pick a different problem
          </Button>
        </Card>
      </div>
    )
  }

  const wi = wordingIndustry(profile)
  const cats = [...new Set(profile.problems.map((id) => problemById(id)?.category).filter((c): c is CategoryId => !!c))]
  const sysNames = profile.systems.map((id) => systemById(id)?.label.replace('Google Business Profile', 'Google listing') ?? id)

  return (
    <div className="fade-in">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {/* 1. Small header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow>Your results · {profile.other ? businessLabel(profile) : industryById(profile.industry)?.label ?? 'Your business'}</Eyebrow>
          <h1 className="mt-1 font-display text-4xl leading-tight sm:text-5xl">Your recipe</h1>
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Problems you picked">
            {profile.problems.map((id) => (
              <li key={id} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[15px]">
                {problemLabel(problemById(id)!, wi)}
              </li>
            ))}
          </ul>
        </div>
        <Button variant="secondary" onClick={() => go('problem')}>
          <Pencil size={16} aria-hidden /> Change answers
        </Button>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-6">
          {/* 2. Decision card */}
          <Card className={`overflow-clip transition ${r.key === recommended ? 'ring-4 ring-accent' : ''}`}>
            <div role="tablist" aria-label="Recipes" className="flex border-b border-line px-2 pt-2 sm:px-3">
              {recipes.map((x) => {
                const on = x.key === r.key
                return (
                  <button
                    key={x.key}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setSelected(x.key)}
                    className={`relative -mb-px min-h-16 min-w-0 flex-1 rounded-t-2xl border-b-[3px] px-2 pb-3 pt-2 text-left transition sm:px-3 ${on ? 'border-brand bg-brand-soft/60' : 'border-transparent text-ink-soft hover:bg-black/[0.03] hover:text-ink'} ${x.key === recommended ? 'shadow-[inset_0_0_0_3px_var(--color-accent)]' : ''}`}
                  >
                    <span className={`block font-semibold ${on ? 'text-ink' : ''}`}>{x.name}</span>
                    <span className="block text-lg font-bold tabular-nums text-ink sm:text-xl">
                      {money(Math.round(x.knownTotal))}
                      <span className="text-sm font-normal text-ink-soft">/mo{x.unknownCount ? ' + quote' : ''}</span>
                    </span>
                    <span className="block text-sm text-ink-soft">
                      {x.key === recommended ? <strong className="text-brand">Best start for you</strong> : `Solves ${x.covered.length} of ${profile.problems.length}`}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Your software bar */}
            <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 border-b border-line bg-white/95 px-5 py-3 backdrop-blur sm:px-6">
              <span className="text-[15px] font-semibold text-ink-soft">Your software:</span>
              {sysNames.length ? (
                sysNames.map((n) => (
                  <span key={n} className="rounded-full bg-paper px-3 py-1 text-[15px] font-medium">
                    {n}
                  </span>
                ))
              ) : (
                <span className="text-[15px] text-ink-soft">none picked</span>
              )}
              <span className="rounded-full bg-paper px-3 py-1 text-[15px] font-medium">{profile.budget === null ? 'Budget not set' : `$${profile.budget}/mo budget`}</span>
              <button onClick={() => setSheet(true)} className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-brand px-4 font-semibold text-brand hover:bg-brand-soft">
                <Plus size={16} aria-hidden /> Add or change
              </button>
            </div>

            <div key={r.key} role="tabpanel" aria-label={`${r.name} recipe`} className="fade-in p-5 sm:p-6">
              {r.key === recommended && (
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm font-bold text-ink">
                  <Star size={14} aria-hidden className="fill-current" /> Our top pick for you
                </p>
              )}
              <p className="text-lg text-ink-soft">{r.tagline}</p>
              {r.merged.length > 0 && (
                <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1 text-sm font-medium">
                  <Info size={15} aria-hidden /> {r.merged.length === 2 ? 'All three recipes are' : `${r.name.replace(' & ', ' and ')} are`} the same for you, so we show them once.
                </p>
              )}

              <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
                {r.items.map((s) => (
                  <li key={s.tool.id} className="flex items-start gap-3 p-4">
                    <Logo name={s.tool.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <button onClick={() => openTool(s.tool)} className="text-left text-lg font-semibold hover:underline">
                          {s.tool.name}
                        </button>
                        <span className="font-semibold tabular-nums">{s.tool.price === null ? 'Quote only' : s.tool.price === 0 ? 'Included' : `${money(s.tool.price)}/mo`}</span>
                      </div>
                      <p className="text-ink-soft">{s.tool.does}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {s.badges.length ? s.badges.map((b) => <CompatLine key={b.system} system={b.system} status={b.status} />) : <span className="text-sm text-ink-soft">{s.tool.standalone ? 'Works on its own' : 'No connection needed'}</span>}
                      </div>
                      {FEATURES.testDrive && s.tool.category === 'phones' && (
                        <button onClick={() => openTestDrive(s.tool)} className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-ink px-4 text-[15px] font-semibold hover:bg-ink hover:text-white">
                          <Volume2 size={16} aria-hidden /> Hear it answer your phone
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {r.missing.length > 0 && (
                <p className="mt-3 flex items-start gap-2 border-l-4 border-warn pl-3 text-[15px] text-warn">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
                  <span>
                    Not covered here: {r.missing.map((id) => lowerFirst(problemLabel(problemById(id)!, wi))).join('; ')}. {recipes.indexOf(r) < recipes.length - 1 ? `Try ${recipes[recipes.length - 1].name}, or raise your budget.` : 'Nothing in our catalog covers it within twice your budget. See “Other tools that fit” below.'}
                  </span>
                </p>
              )}

              <div className="mt-5 grid gap-4 rounded-2xl bg-paper p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6">
                <div>
                  <p className="text-sm font-semibold text-ink-soft">Total each month</p>
                  <p className="font-display text-4xl tabular-nums leading-none">
                    {money(Math.round(r.knownTotal))}
                    <span className="font-sans text-lg font-normal text-ink-soft">/mo{r.unknownCount ? ' + quote' : ''}</span>
                  </p>
                </div>
                <ul className="space-y-1 text-[15px]">
                  <li className="flex items-center gap-2">
                    <Clock size={16} aria-hidden className="text-ink-soft" /> About {hoursLabel(r.setupHours)} to set up
                  </li>
                  {profile.budget !== null && (
                    <li className={`font-semibold ${r.overBudget ? 'text-bad' : 'text-ok'}`}>
                      {r.overBudget ? `Over your $${profile.budget} budget` : `✓ Within your $${profile.budget} budget`}
                    </li>
                  )}
                  <li className="text-ink-soft">
                    Solves {r.covered.length} of {profile.problems.length} problem{profile.problems.length > 1 ? 's' : ''}
                  </li>
                </ul>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button size="lg" onClick={() => startPlan(r)} className="flex-1">
                  Start this recipe
                </Button>
                {recipes.length > 1 && (
                  <Button size="lg" variant="secondary" onClick={() => go('compare')} className="flex-1">
                    Compare recipes
                  </Button>
                )}
              </div>
              <a href={SBA_LOCATOR} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand underline underline-offset-4 hover:no-underline">
                Get free setup help from a Small Business Development Center <ExternalLink size={15} aria-hidden />
              </a>
            </div>
          </Card>

          {/* 3 (mobile). Worth it sits here on small screens */}
          <div className="lg:hidden">
            <WorthIt r={r} profile={profile} go={go} />
          </div>

          {/* 4. The details */}
          <Card>
            <h2 className="px-5 pt-5 font-display text-2xl sm:px-6">The details</h2>
            <div className="mt-2">
              <Section title="How it works for you" sub="Where each tool fits with your software">
                <StackMap recipe={r} profile={profile} />
              </Section>
              <Section title="What you’ll pay" sub="Every fee, line by line">
                <div className="max-w-md">
                  <Receipt r={r} profile={profile} />
                </div>
              </Section>
              <Section title="Why we picked these" sub="Match, warnings, and sources for each tool">
                <ul className="divide-y divide-line">
                  {r.items.map((s) => (
                    <ToolRow key={s.tool.id} s={s} profile={profile} openTool={openTool} />
                  ))}
                </ul>
                <p className="mt-3 text-[15px] text-ink-soft">
                  Match {r.score}/100. See{' '}
                  <a href="#/how" className="font-semibold text-brand underline underline-offset-2">
                    how we rank
                  </a>
                  .
                </p>
              </Section>
            </div>
          </Card>

          {/* 5. Other tools */}
          <Card>
            {alsoConsider.length > 0 && (
              <Section title="Other tools that fit" sub="Not in any recipe and not in your total">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {alsoConsider.map(({ s, reason }) => (
                    <li key={s.tool.id}>
                      <button onClick={() => openTool(s.tool)} className="lift flex h-full w-full items-start gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 text-left hover:border-brand/40">
                        <Logo name={s.tool.name} size={40} />
                        <span className="min-w-0">
                          <span className="block font-semibold">{s.tool.name}</span>
                          <span className="block text-sm font-medium">{s.tool.price === null ? 'Price by quote' : s.tool.priceLabel}</span>
                          <span className="mt-1 block text-sm text-ink-soft">{reason}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            <details className="group border-t border-line first:border-t-0">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-5 py-4 font-semibold sm:px-6">
                <MessageSquarePlus size={18} aria-hidden /> Didn’t find what you need? Tell us
              </summary>
              <div className="px-5 pb-5 sm:px-6">
                <NeedForm profile={profile} />
              </div>
            </details>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="hidden lg:block">
            <WorthIt r={r} profile={profile} go={go} />
          </div>
          <FunFact where="results" cats={cats} />
        </aside>
      </div>

      <Drawer open={sheet} onClose={() => setSheet(false)} title="Your software and budget">
        <p className="mb-3 text-ink-soft">Tap your software on or off. Options, connections, and prices update right away.</p>
        <StackSnap general={isOther(profile)} industry={profile.industry} value={profile.systems} onChange={(systems) => update({ systems })} />
        <div className="mt-6 rounded-2xl bg-white p-4">
          <label htmlFor="budget2" className="font-semibold">
            Monthly budget: {profile.budget === null ? 'not set' : `$${profile.budget}/mo`}
          </label>
          <input id="budget2" type="range" min={25} max={600} step={25} value={profile.budget ?? 150} onChange={(e) => update({ budget: Number(e.target.value), budgetSet: true })} className="range-lg w-full" />
        </div>
        <p className="mt-4 text-[15px] font-semibold text-ink" aria-hidden>
          {money(Math.round(r.knownTotal))}/mo for {r.name} · {r.items.filter((s) => s.badges.some((b) => b.status === 'native')).length} of {r.items.length} tools connect directly
        </p>
        <Button className="mt-4 w-full" size="lg" onClick={() => setSheet(false)}>
          Done
        </Button>
      </Drawer>
    </div>
  )
}
