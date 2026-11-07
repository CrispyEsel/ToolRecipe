import { useMemo, useState } from 'react'
import { businessLabel, isOther, wordingIndustry } from '../lib/business'
import { agoText, daysSince } from '../lib/freshness'
import { AlertTriangle, ChevronDown, MessageSquarePlus, Pencil, Volume2 } from 'lucide-react'
import { problemById, problemLabel } from '../lib/repo'
import { readiness } from '../engine/readiness'
import { candidates, usageCost, type Recipe, type ScoredTool } from '../engine/recipes'
import { StackMap } from '../components/StackMap'
import { LeakBanner } from '../components/LeakBanner'
import { SeasonCards } from '../components/SeasonCard'
import { FEATURES, STALE_DAYS } from '../lib/config'
import { NeedForm } from '../components/NeedForm'
import { StackSnap } from '../components/StackSnap'
import { Button, Card, CompatLine, Steps, money } from '../components/ui'
import type { Route } from '../state'
import type { Profile, Tool } from '../types'
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

export function hoursLabel(h: number) {
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 24) return `${Math.round(h)} hr${Math.round(h) === 1 ? '' : 's'}`
  return `${Math.round(h / 24)} days`
}

function ReadinessCard({ profile, recommended, recipes }: { profile: Profile; recommended: Recipe['key']; recipes: Recipe[] }) {
  const r = readiness(profile)
  const name = recipes.find((x) => x.key === recommended)?.name ?? ''
  const preferred = r.level === 'Starter' ? 'simple' : r.level === 'Ready' ? 'balanced' : 'allin'
  const plan = `We’ll lead with the ${name} recipe${r.level === 'Starter' ? ' and point you to free setup help' : ''}.${preferred !== recommended ? ` (${recipes.find((x) => x.key === preferred)?.name} is over your budget.)` : ''}`
  const [open, setOpen] = useState(false)
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-muted">Your AI starting point</p>
      <p className="mt-1 text-xl font-semibold leading-snug">{r.headline}</p>
      <p className="mt-1 text-ink-soft">{plan}</p>
      <button className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        How we got this <ChevronDown size={16} className={open ? 'rotate-180' : ''} aria-hidden />
      </button>
      {open && (
        <ul className="fade-in mt-2 space-y-2">
          <li className="text-sm font-semibold">Score: {r.score} out of 100 ({r.level})</li>
          {r.reasons.map((x) => (
            <li key={x.label}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{x.label}</span>
                <span>
                  {x.points}/{x.max}
                </span>
              </div>
              <div className="h-2 rounded-full bg-line">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${(x.points / x.max) * 100}%` }} />
              </div>
              <p className="text-sm text-ink-soft">{x.note}</p>
            </li>
          ))}
          <li className="text-sm text-ink-soft">It’s not a grade. Retake it at day 30 to see how far you’ve come.</li>
        </ul>
      )}
    </Card>
  )
}

/** "Checked 3 days ago", amber once a price is older than STALE_DAYS */
function Freshness({ tool }: { tool: Tool }) {
  const days = daysSince(tool.checked)
  const stale = days > STALE_DAYS
  return (
    <p className={`text-xs ${stale ? 'font-semibold text-warn' : 'text-muted'}`} title={`Price and details last checked ${tool.checked}`}>
      {stale ? `⚠ Price needs re-check (${days} days old)` : `Price checked ${agoText(days)}`}
    </p>
  )
}

function ToolRow({ s, profile, openTool, openTestDrive }: { s: ScoredTool; profile: Profile; openTool: (t: Tool) => void; openTestDrive: (t: Tool) => void }) {
  const [more, setMore] = useState(false)
  const t = s.tool
  const usage = usageCost(t, profile.size)
  return (
    <li className="py-5 first:pt-0">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <button onClick={() => openTool(t)} className="text-left text-lg font-semibold hover:underline">
          {t.name}
        </button>
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
        {FEATURES.testDrive && t.category === 'phones' && (
          <button onClick={() => openTestDrive(t)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border-2 border-ink px-3 font-semibold hover:bg-ink hover:text-white">
            <Volume2 size={16} aria-hidden /> Hear it answer your phone
          </button>
        )}
        <button className="inline-flex items-center gap-1 font-semibold text-brand" aria-expanded={more} onClick={() => setMore((w) => !w)}>
          Why this one <ChevronDown size={16} className={more ? 'rotate-180' : ''} aria-hidden />
        </button>
        <button className="font-semibold text-brand" onClick={() => openTool(t)}>
          Sources
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
    </li>
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
  return (
    <div className="rounded-xl border border-dashed border-ink/30 bg-white px-5 py-4 font-mono text-sm" aria-label="Monthly cost breakdown">
      <p className="text-center text-xs tracking-[0.12em] text-muted">WHAT YOU’LL PAY EACH MONTH</p>
      <ul className="mt-3 space-y-2">
        {lines.map((l) => (
          <li key={l.label + (l.note ?? '')}>
            <div className="flex items-baseline gap-2">
              <span className="min-w-0">{l.label}</span>
              <span aria-hidden className="flex-1 translate-y-[-3px] border-b border-dotted border-ink/30" />
              <span className="shrink-0 tabular-nums">{l.amount === null ? 'quote' : fmt(l.amount)}</span>
            </div>
            {l.note && <p className="font-sans text-xs text-muted">{l.note}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-baseline justify-between border-t-2 border-ink pt-2 text-base font-bold">
        <span>TOTAL</span>
        <span className="tabular-nums">
          {fmt(r.knownTotal)}/mo{r.unknownCount ? ' + quote' : ''}
        </span>
      </div>
      {profile.budget !== null && (
        <p className={`mt-1 text-right font-sans text-sm ${r.overBudget ? 'text-bad' : 'text-ok'}`}>
          {r.overBudget ? `Over your $${profile.budget} budget` : `Within your $${profile.budget} budget`}
        </p>
      )}
      {r.unknownCount > 0 && <p className="mt-1 font-sans text-xs text-muted">{r.unknownCount} tool{r.unknownCount > 1 ? 's don’t' : ' doesn’t'} publish a price; ask the vendor for a quote.</p>}
    </div>
  )
}

export function Results({ profile, update, go, recipes, allTools, selected, setSelected, openTool, startPlan, recommended, openTestDrive }: Props) {
  const r = recipes.find((x) => x.key === selected) ?? recipes[0]

  const alsoConsider = useMemo(() => {
    const inRecipes = new Set(recipes.flatMap((x) => x.items.map((s) => s.tool.id)))
    return candidates(allTools, profile)
      .filter((s) => !inRecipes.has(s.tool.id))
      .slice(0, 4)
  }, [recipes, allTools, profile])

  const sameAs = (k: Recipe['key']) => {
    const me = recipes.find((x) => x.key === k)
    if (!me) return null
    const ids = me.items.map((s) => s.tool.id).sort().join()
    const earlier = recipes.slice(0, recipes.indexOf(me)).find((x) => x.items.map((s) => s.tool.id).sort().join() === ids)
    return earlier ? earlier.name : null
  }

  if (!recipes.length || !r) {
    return (
      <div className="fade-in">
        <Steps step={4} />
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

  return (
    <div className="fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Your ToolRecipe</h1>
          <p className="mt-1 text-lg text-ink-soft">
            For your {businessLabel(profile)}: {profile.problems.map((id) => `“${problemLabel(problemById(id)!, wordingIndustry(profile))}”`).join(', ')}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => go('problem')}>
          <Pencil size={16} aria-hidden /> Change answers
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <LeakBanner profile={profile} go={go} />

          <Card className="p-5 sm:p-6">
            <div role="tablist" aria-label="Recipes" className="-mx-1 flex border-b border-line">
              {recipes.map((x) => {
                const on = x.key === r.key
                return (
                  <button
                    key={x.key}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setSelected(x.key)}
                    className={`-mb-px min-w-0 flex-1 border-b-[3px] px-1 pb-3 text-left transition sm:px-3 ${on ? 'border-brand' : 'border-transparent text-ink-soft hover:text-ink'}`}
                  >
                    <span className={`block font-semibold ${on ? 'text-ink' : ''}`}>{x.name}</span>
                    <span className="block text-lg font-bold tabular-nums text-ink sm:text-xl">
                      {money(Math.round(x.knownTotal))}
                      <span className="text-xs font-normal text-ink-soft sm:text-sm">/mo{x.unknownCount ? ' + quote' : ''}</span>
                    </span>
                    <span className="block text-xs text-ink-soft">
                      {x.key === recommended ? <strong className="text-brand">Best start for you</strong> : `${x.items.length} tool${x.items.length > 1 ? 's' : ''} · solves ${x.covered.length}/${profile.problems.length}`}
                    </span>
                  </button>
                )
              })}
            </div>

            <div role="tabpanel" aria-label={`${r.name} recipe`} className="pt-5">
              <h2 className="font-display text-2xl font-semibold">{r.name} recipe</h2>
              <p className="text-ink-soft">{r.tagline}</p>
              {sameAs(r.key) && <p className="mt-1 text-sm text-ink-soft">Same tools as {sameAs(r.key)}: nothing stronger fits your answers.</p>}
              <p className="mt-2 text-sm text-ink-soft">
                Setup about {hoursLabel(r.setupHours)} · Match {r.score}/100 · Solves {r.covered.length} of {profile.problems.length}
              </p>

              <ul className="mt-5 divide-y divide-line border-t border-line pt-5">
                {r.items.map((s) => (
                  <ToolRow key={s.tool.id} s={s} profile={profile} openTool={openTool} openTestDrive={openTestDrive} />
                ))}
              </ul>

              {r.missing.length > 0 && (
                <p className="mt-2 flex items-start gap-2 border-l-4 border-warn pl-3 text-sm text-warn">
                  <AlertTriangle size={18} className="shrink-0" aria-hidden />
                  <span>
                    Not covered in this recipe: {r.missing.map((id) => problemLabel(problemById(id)!, wordingIndustry(profile)).toLowerCase()).join('; ')}. {r.key !== 'allin' ? 'Try All-in, or raise your budget.' : 'No tool in our catalog fits this yet. It’s logged as an unmet need.'}
                  </span>
                </p>
              )}

              <div className="mt-6 min-w-0 border-t border-line pt-6">
                <StackMap recipe={r} profile={profile} />
              </div>

              <div className="mt-6 border-t border-line pt-6">
                <div className="mx-auto max-w-md">
                  <Receipt r={r} profile={profile} />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button size="lg" onClick={() => startPlan(r)} className="flex-1">
                  Start this recipe
                </Button>
                <Button size="lg" variant="secondary" onClick={() => go('day')} className="flex-1">
                  Preview my day
                </Button>
                <Button size="lg" variant="secondary" onClick={() => go('compare')} className="flex-1">
                  Compare recipes
                </Button>
              </div>
            </div>
          </Card>

          <SeasonCards profile={profile} update={update} />

          {alsoConsider.length > 0 && (
            <details className="rounded-2xl border border-line bg-white p-4">
              <summary className="cursor-pointer text-lg font-semibold">More options ({alsoConsider.length})</summary>
              <p className="mt-1 text-ink-soft">These fit your problems but scored lower, often because they hide their price or cost more than your budget.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {alsoConsider.map((s) => (
                  <button key={s.tool.id} onClick={() => openTool(s.tool)} className="rounded-xl border border-line bg-white p-4 text-left hover:border-brand">
                    <div className="flex justify-between gap-2">
                      <span className="font-semibold">{s.tool.name}</span>
                      <span className="text-sm text-ink-soft">Match {s.score}</span>
                    </div>
                    <p className="text-sm text-ink-soft">{s.tool.priceLabel}</p>
                    <div className="mt-2 flex flex-col gap-0.5">
                      {s.badges.slice(0, 2).map((b) => (
                        <CompatLine key={b.system} system={b.system} status={b.status} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </details>
          )}

          <details className="rounded-2xl border border-line bg-white p-4">
            <summary className="flex cursor-pointer items-center gap-2 font-semibold">
              <MessageSquarePlus size={18} aria-hidden /> Didn’t find what you need? Tell us
            </summary>
            <NeedForm profile={profile} />
          </details>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <ReadinessCard profile={profile} recommended={recommended} recipes={recipes} />
          <Card className="p-4">
            <p className="font-semibold">Stack Snap</p>
            <p className="mb-3 text-sm text-ink-soft">Tap your software on or off. Recipes, badges, and prices update instantly.</p>
            <StackSnap compact general={isOther(profile)} industry={profile.industry} value={profile.systems} onChange={(systems) => update({ systems })} />
            <div className="mt-4">
              <label htmlFor="budget2" className="text-sm font-semibold">
                Budget: {profile.budget === null ? 'not set' : `$${profile.budget}/mo`}
              </label>
              <input
                id="budget2"
                type="range"
                min={25}
                max={600}
                step={25}
                value={profile.budget ?? 150}
                onChange={(e) => update({ budget: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
