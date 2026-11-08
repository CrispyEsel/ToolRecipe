import { useMemo, useState, type ReactNode } from 'react'
import { wordingIndustry } from '../lib/business'
import { ArrowLeft, Check } from 'lucide-react'
import { problemById, problemLabel } from '../lib/repo'
import { badgesFor, scoreTool, sysFees, type Recipe } from '../engine/recipes'
import { Button, Card, CompatLine, Eyebrow, money } from '../components/ui'
import { Logo } from '../components/Logo'
import type { Route } from '../state'
import type { Profile, Tool } from '../types'
import { hoursLabel } from './Results'

type Mode = 'recipes' | 'tools'

/** One row of the comparison: a label, how to show each cell, which cell is best, and a plain value for "differences only" */
type Row<T> = { label: string; cell: (x: T) => ReactNode; good: (x: T) => boolean; val: (x: T) => string }
type Col<T> = { id: string; item: T; head: ReactNode; verdict?: string; choose?: () => void; chooseLabel?: string }

function Grid<T>({ cols, rows, diffOnly, caption }: { cols: Col<T>[]; rows: Row<T>[]; diffOnly: boolean; caption: string }) {
  const shown = diffOnly && cols.length > 1 ? rows.filter((r) => new Set(cols.map((c) => r.val(c.item))).size > 1) : rows
  const hl = (r: Row<T>, c: Col<T>) => cols.length > 1 && r.good(c.item)
  return (
    <>
      {/* Phones: one card per option, same rows in the same order */}
      <div className="mt-6 space-y-4 md:hidden">
        {cols.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="text-xl font-semibold">{c.head}</div>
            {c.verdict && <p className="mt-1 rounded-xl bg-accent-soft px-3 py-2 text-[15px] font-semibold">{c.verdict}</p>}
            <dl className="mt-3 divide-y divide-line">
              {shown.map((r) => (
                <div key={r.label} className={`py-3 ${hl(r, c) ? '-mx-2 rounded-xl bg-ok-soft px-2' : ''}`}>
                  <dt className="text-sm font-semibold text-ink-soft">
                    {r.label}
                    {hl(r, c) && <span className="ml-2 text-ok">· Best</span>}
                  </dt>
                  <dd className="mt-0.5">{r.cell(c.item)}</dd>
                </div>
              ))}
            </dl>
            {c.choose && (
              <Button className="mt-4 w-full" size="lg" onClick={c.choose}>
                {c.chooseLabel ?? 'Choose this one'}
              </Button>
            )}
          </Card>
        ))}
      </div>

      {/* Tablets and up: table with a sticky first column */}
      <Card className="mt-6 hidden overflow-x-auto md:block" tabIndex={0} role="region" aria-label={`${caption} (scrolls sideways if needed)`}>
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <td className="sticky left-0 z-10 border-b border-line bg-white p-4" aria-hidden />
              {cols.map((c) => (
                <th key={c.id} scope="col" className="border-b border-line p-4 align-top">
                  <div className="text-lg">{c.head}</div>
                  {c.verdict && <p className="mt-1.5 rounded-xl bg-accent-soft px-3 py-1.5 text-[15px] font-semibold">{c.verdict}</p>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.label} className="align-top">
                <th scope="row" className="sticky left-0 z-10 w-44 border-b border-line bg-white p-4 text-[15px] font-semibold text-ink-soft">
                  {r.label}
                </th>
                {cols.map((c) => (
                  <td key={c.id} className={`border-b border-line p-4 ${hl(r, c) ? 'bg-ok-soft font-semibold' : ''}`}>
                    {r.cell(c.item)}
                    {hl(r, c) && <span className="sr-only"> (best in this row)</span>}
                  </td>
                ))}
              </tr>
            ))}
            {cols.some((c) => c.choose) && (
              <tr>
                <td className="sticky left-0 bg-white p-4" aria-hidden />
                {cols.map((c) => (
                  <td key={c.id} className="p-4">
                    {c.choose && (
                      <Button className="w-full" onClick={c.choose}>
                        {c.chooseLabel ?? 'Choose this one'}
                      </Button>
                    )}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      {diffOnly && shown.length < rows.length && (
        <p className="mt-3 text-[15px] text-ink-soft">
          Hiding {rows.length - shown.length} row{rows.length - shown.length > 1 ? 's' : ''} that are the same for every option.
        </p>
      )}
    </>
  )
}

export function Compare({
  profile,
  recipes,
  go,
  openTool,
  startPlan,
  recommended,
}: {
  profile: Profile
  recipes: Recipe[]
  go: (r: Route) => void
  openTool: (t: Tool) => void
  startPlan: (r: Recipe) => void
  recommended: Recipe['key']
}) {
  const [mode, setMode] = useState<Mode>(recipes.length > 1 ? 'recipes' : 'tools')
  const [diffOnly, setDiffOnly] = useState(false)
  const toolPool = useMemo(() => {
    const m = new Map<string, Tool>()
    recipes.forEach((r) => r.items.forEach((s) => m.set(s.tool.id, s.tool)))
    return [...m.values()]
  }, [recipes])
  const [picked, setPicked] = useState<string[]>(() => toolPool.slice(0, 3).map((t) => t.id))
  const tools = toolPool.filter((t) => picked.includes(t.id))
  const wi = wordingIndustry(profile)

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]))

  const cheapest = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => v !== null)
    return nums.length ? Math.min(...nums) : null
  }

  const verdict = (r: Recipe) => {
    const all = r.covered.length === profile.problems.length
    if (r.key === 'simple') return all ? 'Best if you want the lowest cost (and it still solves everything)' : 'Best if you want the lowest cost'
    if (r.key === 'balanced') return all ? 'Best if you want everything solved within your budget' : 'Best if you want the most solved within your budget'
    return all ? 'Best if you want every problem covered' : 'Best if you want the most covered, even over budget'
  }

  // Recipe rows
  const rMin = cheapest(recipes.map((r) => r.knownTotal))
  const rBest = Math.max(...recipes.map((r) => r.covered.length))
  const rFast = Math.min(...recipes.map((r) => r.setupHours))
  const rScore = Math.max(...recipes.map((x) => x.score))
  const feeList = (r: Recipe) => [
    ...(r.connector ? [`Zapier, ${money(r.connector.tool.price ?? 0)}/mo, to ${r.connector.reason.replace(/^Needed to /, '').replace(/^connect/, 'connect')}`] : []),
    ...r.fees.map((f) => `${f.tool}, ${money(f.amount)}/mo: ${f.note}`),
  ]
  const recipeRows: Row<Recipe>[] = [
    {
      label: 'Tools',
      cell: (r) => (
        <ul className="space-y-1.5">
          {r.items.map((s) => (
            <li key={s.tool.id} className="flex items-center gap-2 font-normal">
              <Logo name={s.tool.name} size={22} /> {s.tool.name}
            </li>
          ))}
        </ul>
      ),
      good: () => false,
      val: (r) => r.items.map((s) => s.tool.id).join(','),
    },
    { label: 'Monthly total', cell: (r) => `${money(r.knownTotal)}${r.unknownCount ? ' + quote' : ''}`, good: (r) => r.knownTotal === rMin, val: (r) => String(r.knownTotal) },
    {
      label: 'Within budget?',
      cell: (r) => (profile.budget === null ? 'No budget set' : r.overBudget ? `No, over $${profile.budget}` : `Yes, under $${profile.budget}`),
      good: (r) => profile.budget !== null && !r.overBudget,
      val: (r) => String(r.overBudget),
    },
    { label: 'Problems solved', cell: (r) => `${r.covered.length} of ${profile.problems.length}`, good: (r) => r.covered.length === rBest, val: (r) => String(r.covered.length) },
    {
      label: 'Not covered',
      cell: (r) => (r.missing.length ? r.missing.map((id) => problemLabel(problemById(id)!, wi)).join('; ') : 'Nothing'),
      good: (r) => r.missing.length === 0,
      val: (r) => r.missing.join(','),
    },
    { label: 'Setup time', cell: (r) => hoursLabel(r.setupHours), good: (r) => r.setupHours === rFast, val: (r) => String(r.setupHours) },
    {
      label: 'Extra fees',
      cell: (r) => {
        const l = feeList(r)
        return l.length ? (
          <ul className="space-y-1 text-[15px] font-normal">
            {l.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        ) : (
          'None'
        )
      },
      good: (r) => feeList(r).length === 0,
      val: (r) => feeList(r).join('|'),
    },
    { label: 'Match', cell: (r) => `${r.score}/100`, good: (r) => r.score === rScore, val: (r) => String(r.score) },
  ]
  const recipeCols: Col<Recipe>[] = recipes.map((r) => ({
    id: r.key,
    item: r,
    head: (
      <span className="flex flex-wrap items-center gap-2">
        {r.name}
        {r.key === recommended && <span className="rounded-full bg-brand px-2.5 py-0.5 text-sm font-semibold text-white">Best start for you</span>}
      </span>
    ),
    verdict: verdict(r),
    choose: () => startPlan(r),
    chooseLabel: `Choose ${r.name}`,
  }))

  // Tool rows
  const tMin = cheapest(tools.map((t) => t.price))
  const tFast = Math.min(...tools.map((x) => x.setupMinutes))
  const tScore = Math.max(...tools.map((x) => scoreTool(x, profile).score))
  const toolFees = (t: Tool) => [t.extraFees, ...sysFees([t], profile.systems).map((x) => `${money(x.amount)}/mo: ${x.note}`)].filter(Boolean).join(' ')
  const toolRows: Row<Tool>[] = [
    { label: 'What it does', cell: (t) => <span className="font-normal">{t.does}</span>, good: () => false, val: (t) => t.does },
    { label: 'Monthly cost', cell: (t) => t.priceLabel, good: (t) => t.price !== null && t.price === tMin, val: (t) => t.priceLabel },
    { label: 'Extra fees', cell: (t) => <span className="font-normal">{toolFees(t) || 'None listed'}</span>, good: () => false, val: toolFees },
    { label: 'Setup time', cell: (t) => hoursLabel(t.setupMinutes / 60), good: (t) => t.setupMinutes === tFast, val: (t) => String(t.setupMinutes) },
    {
      label: 'Works with your software',
      cell: (t) => {
        const b = badgesFor(t, profile.systems)
        return b.length ? (
          <div className="flex flex-col gap-0.5">
            {b.map((x) => (
              <CompatLine key={x.system} system={x.system} status={x.status} />
            ))}
          </div>
        ) : (
          <span className="text-ink-soft">Works on its own</span>
        )
      },
      good: (t) => badgesFor(t, profile.systems).some((b) => b.status === 'native'),
      val: (t) => badgesFor(t, profile.systems).map((b) => b.status).join(','),
    },
    {
      label: 'Fine print',
      cell: (t) => (t.flags?.length ? <ul className="space-y-1 text-[15px] font-normal">{t.flags.map((f) => <li key={f.text}>• {f.text}</li>)}</ul> : 'None found yet'),
      good: () => false,
      val: (t) => (t.flags ?? []).map((f) => f.text).join('|'),
    },
    { label: 'Your customer data', cell: (t) => t.dataNote ?? 'Not reviewed yet', good: (t) => !!t.dataNote, val: (t) => t.dataNote ?? '' },
    { label: 'Free trial', cell: (t) => t.freeTrial ?? 'None listed', good: (t) => !!t.freeTrial, val: (t) => t.freeTrial ?? '' },
    { label: 'Cancel anytime?', cell: (t) => (t.cancelAnytime === true ? 'Yes' : t.cancelAnytime === false ? 'No, contract' : 'Not stated'), good: (t) => t.cancelAnytime === true, val: (t) => String(t.cancelAnytime) },
    { label: 'Match for you', cell: (t) => `${scoreTool(t, profile).score}/100`, good: (t) => scoreTool(t, profile).score === tScore, val: (t) => String(scoreTool(t, profile).score) },
  ]
  const toolCols: Col<Tool>[] = tools.map((t) => ({
    id: t.id,
    item: t,
    head: (
      <button onClick={() => openTool(t)} className="flex items-center gap-2 text-left underline-offset-4 hover:underline">
        <Logo name={t.name} size={28} /> {t.name}
      </button>
    ),
  }))

  return (
    <div className="fade-in">
      <Button variant="ghost" onClick={() => go('results')}>
        <ArrowLeft size={18} aria-hidden /> Back to recipes
      </Button>
      <Eyebrow className="mt-4">Compare</Eyebrow>
      <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Side by side</h1>
      <p className="mt-1 text-lg text-ink-soft">Same rows for every option. The best value in each row is shaded green.</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border-2 border-line bg-white p-1" role="radiogroup" aria-label="Compare what">
          {(['recipes', 'tools'] as Mode[]).map((m) => (
            <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`min-h-11 rounded-lg px-4 font-semibold ${mode === m ? 'bg-brand text-white' : 'text-ink-soft'}`}>
              Compare {m}
            </button>
          ))}
        </div>
        <label className="row-focus inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2 font-semibold">
          <input type="checkbox" className="sr-only" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} />
          <span aria-hidden className={`grid h-6 w-6 place-items-center rounded-md border-2 ${diffOnly ? 'border-brand bg-brand text-white' : 'border-black/25 bg-white'}`}>
            {diffOnly && <Check size={15} strokeWidth={3.5} />}
          </span>
          Show differences only
        </label>
      </div>

      {mode === 'tools' && (
        <div className="mt-4">
          <p className="mb-2 font-semibold">Pick up to 3 tools</p>
          <div className="flex flex-wrap gap-2">
            {toolPool.map((t) => (
              <button
                key={t.id}
                role="checkbox"
                aria-checked={picked.includes(t.id)}
                onClick={() => toggle(t.id)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-xl border-2 px-3 font-medium ${picked.includes(t.id) ? 'border-brand bg-brand-soft' : 'border-line bg-white'}`}
              >
                <Logo name={t.name} size={20} /> {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'recipes' && recipes.length < 2 ? (
        <Card className="mt-6 p-6">
          <p className="text-ink-soft">Your recipes all came out the same ({recipes[0]?.name}), so there’s nothing to compare side by side. Switch to “Compare tools” to compare the tools in it.</p>
        </Card>
      ) : mode === 'recipes' ? (
        <Grid cols={recipeCols} rows={recipeRows} diffOnly={diffOnly} caption="Recipe comparison" />
      ) : tools.length ? (
        <Grid cols={toolCols} rows={toolRows} diffOnly={diffOnly} caption="Tool comparison" />
      ) : (
        <Card className="mt-6 p-6">
          <p className="text-ink-soft">Pick at least one tool above.</p>
        </Card>
      )}
    </div>
  )
}
