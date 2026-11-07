import { useMemo, useState } from 'react'
import { ArrowLeft, CalendarCheck, Moon, Sun } from 'lucide-react'
import { businessLabel, defaultsFor } from '../lib/business'
import type { Recipe } from '../engine/recipes'
import { timelineFor, simInputs, simulate, type SimInputs } from '../engine/simulate'
import { Button, Card, money } from '../components/ui'
import type { Route } from '../state'
import type { Profile } from '../types'

function Num({ label, value, onChange, step = 1, min = 0, max, suffix, prefix }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string; prefix?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-1 flex items-center rounded-xl border-2 border-line bg-white focus-within:border-brand">
        {prefix && <span className="pl-3 text-ink-soft">{prefix}</span>}
        <input
          type="number"
          className="w-full rounded-xl bg-transparent p-2 text-lg focus:outline-none"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
        {suffix && <span className="pr-3 text-ink-soft">{suffix}</span>}
      </span>
    </label>
  )
}

export function Day({ profile, recipe, go, startPlan, update }: { profile: Profile; recipe: Recipe; go: (r: Route) => void; startPlan: (r: Recipe) => void; update: (p: Partial<Profile>) => void }) {
  const d = defaultsFor(profile)
  const [inp, setInp] = useState<SimInputs>(() => simInputs(profile))
  const [after, setAfter] = useState(true)
  const res = useMemo(() => simulate(inp, recipe), [inp, recipe])
  const set = (k: keyof SimInputs) => (v: number) =>
    setInp((x) => {
      const next = { ...x, [k]: v }
      update({ sim: next })
      return next
    })

  const toolFor = (problem: string | null) => (problem ? recipe.items.find((s) => s.tool.problems.includes(problem))?.tool.name : undefined)
  const events = timelineFor(profile)
  const relevant = events.filter((e) => e.problem && (profile.problems.includes(e.problem) || toolFor(e.problem)))
  const shown = relevant.length >= 3 ? relevant : [...relevant, ...events.filter((e) => !relevant.includes(e))].slice(0, 5).sort((a, b) => events.indexOf(a) - events.indexOf(b))
  const hasCalls = recipe.covered.some((id) => ['missed-calls', 'after-hours', 'phone-orders'].includes(id))

  return (
    <div className="fade-in">
      <Button variant="ghost" onClick={() => go('results')}>
        <ArrowLeft size={18} aria-hidden /> Back to recipes
      </Button>
      <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">A day in your {businessLabel(profile)}</h1>
      <p className="mt-1 text-lg text-ink-soft">
        With the <strong>{recipe.name}</strong> recipe: {recipe.items.map((s) => s.tool.name).join(' + ')}
        {recipe.connector ? ' + Zapier' : ''}.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="self-start p-5">
          <div className="mb-4 inline-flex rounded-xl border-2 border-line bg-paper p-1" role="radiogroup" aria-label="Before or after">
            {[false, true].map((v) => (
              <button
                key={String(v)}
                role="radio"
                aria-checked={after === v}
                onClick={() => setAfter(v)}
                className={`min-h-11 rounded-lg px-4 font-semibold ${after === v ? (v ? 'bg-brand text-white' : 'bg-ink text-white') : 'text-ink-soft'}`}
              >
                {v ? 'With your ToolRecipe' : 'Today'}
              </button>
            ))}
          </div>
          <ol className="relative space-y-3 border-l-4 border-line pl-6">
            {shown.map((e) => {
              const tool = toolFor(e.problem)
              const changed = after && !!tool
              return (
                <li key={e.time + e.before} className="relative">
                  <span aria-hidden className={`absolute -left-[34px] top-3 h-4 w-4 rounded-full border-4 border-paper ${changed ? 'bg-ok' : after ? 'bg-muted' : 'bg-bad'}`} />
                  <div className={`rounded-xl p-3 ${changed ? 'bg-ok-soft' : after ? 'bg-muted-soft' : 'bg-bad-soft/60'}`}>
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                      {(Number(e.time.split(':')[0]) % 12) + (e.time.includes('pm') ? 12 : 0) >= 17 ? <Moon size={14} aria-hidden /> : <Sun size={14} aria-hidden />}
                      {e.time}
                    </p>
                    <p key={String(after)} className="fade-in text-lg">
                      {after ? (tool ? e.after.replace('{tool}', tool) : `${e.before} (not in this recipe)`) : e.before}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="mt-4 text-sm text-ink-soft">An illustration of a typical day based on your answers, not a promise of results.</p>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">Your estimated week</p>
            {hasCalls && (
              <p className="mt-2">
                <strong className="text-2xl">{Math.round(res.callsCaught)}</strong> calls caught → about <strong>{Math.round(res.newSales)}</strong> new {profile.industry === 'restaurant' ? 'orders' : 'bookings'} ({money(Math.round(res.callValue))})
              </p>
            )}
            {res.hoursSaved > 0 && (
              <p className="mt-2">
                <strong className="text-2xl">{res.hoursSaved.toFixed(1)}</strong> hours back ({money(Math.round(res.timeValue))} of your time)
              </p>
            )}
            <div className="mt-4 rounded-xl bg-paper p-3">
              <div className="flex justify-between">
                <span>Value per month</span>
                <strong>{money(Math.round(res.monthlyValue))}</strong>
              </div>
              <div className="flex justify-between">
                <span>Recipe cost</span>
                <strong>−{money(res.monthlyCost)}</strong>
              </div>
              <div className="mt-2 flex justify-between border-t border-line pt-2 text-lg">
                <span>Net per month</span>
                <strong className={res.monthlyNet >= 0 ? 'text-ok' : 'text-bad'}>{money(Math.round(res.monthlyNet))}</strong>
              </div>
              {recipe.unknownCount > 0 && <p className="mt-1 text-xs text-warn">Leaves out {recipe.unknownCount} tool(s) with no published price.</p>}
            </div>
          </Card>
          <Card className="p-5">
            <p className="font-semibold">Your numbers (change any)</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {hasCalls && <Num label="Missed calls / week" value={inp.missedPerWeek} onChange={set('missedPerWeek')} />}
              {hasCalls && <Num label={d.valueLabel} value={inp.avgValue} onChange={set('avgValue')} prefix="$" />}
              {hasCalls && <Num label="Calls AI catches" value={Math.round(inp.captureRate * 100)} onChange={(v) => set('captureRate')(Math.min(100, v) / 100)} suffix="%" />}
              {hasCalls && <Num label="Calls that buy" value={Math.round(inp.bookRate * 100)} onChange={(v) => set('bookRate')(Math.min(100, v) / 100)} suffix="%" />}
              <Num label="Hours / week per task" value={inp.hoursPerWeek} onChange={set('hoursPerWeek')} step={0.5} />
              <Num label="Time AI saves" value={Math.round(inp.timeSaved * 100)} onChange={(v) => set('timeSaved')(Math.min(100, v) / 100)} suffix="%" />
              <Num label="Your hour is worth" value={inp.hourlyValue} onChange={set('hourlyValue')} prefix="$" />
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              Formula: missed calls × % caught × % that buy × {d.valueLabel.toLowerCase()} + hours × % saved × hourly value, × 4.33 weeks, minus the recipe cost. The starting percentages are ToolRecipe assumptions; change them to match your business.
            </p>
          </Card>
          <Button size="lg" className="w-full" onClick={() => startPlan(recipe)}>
            <CalendarCheck size={20} aria-hidden /> Start this recipe
          </Button>
        </div>
      </div>
    </div>
  )
}
