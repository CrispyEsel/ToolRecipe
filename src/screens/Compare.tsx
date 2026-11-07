import { useMemo, useState } from 'react'
import { wordingIndustry } from '../lib/business'
import { ArrowLeft } from 'lucide-react'
import { problemById, problemLabel } from '../lib/repo'
import { badgesFor, scoreTool, sysFees, type Recipe } from '../engine/recipes'
import { Button, Card, CompatBadge, money } from '../components/ui'
import type { Route } from '../state'
import type { Profile, Tool } from '../types'
import { hoursLabel } from './Results'

type Mode = 'recipes' | 'tools'

export function Compare({ profile, recipes, go, openTool }: { profile: Profile; recipes: Recipe[]; go: (r: Route) => void; openTool: (t: Tool) => void }) {
  const [mode, setMode] = useState<Mode>('recipes')
  const toolPool = useMemo(() => {
    const m = new Map<string, Tool>()
    recipes.forEach((r) => r.items.forEach((s) => m.set(s.tool.id, s.tool)))
    return [...m.values()]
  }, [recipes])
  const [picked, setPicked] = useState<string[]>(() => toolPool.slice(0, 3).map((t) => t.id))
  const tools = toolPool.filter((t) => picked.includes(t.id))

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]))

  const cheapest = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => v !== null)
    return nums.length ? Math.min(...nums) : null
  }

  return (
    <div className="fade-in">
      <Button variant="ghost" onClick={() => go('results')}>
        <ArrowLeft size={18} aria-hidden /> Back to recipes
      </Button>
      <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Side by side</h1>
      <p className="mt-1 text-lg text-ink-soft">Same rows for every option. The best value in each row is highlighted.</p>

      <div className="mt-4 inline-flex rounded-xl border-2 border-line bg-white p-1" role="radiogroup" aria-label="Compare what">
        {(['recipes', 'tools'] as Mode[]).map((m) => (
          <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`min-h-11 rounded-lg px-4 font-semibold ${mode === m ? 'bg-brand text-white' : 'text-ink-soft'}`}>
            Compare {m}
          </button>
        ))}
      </div>

      {mode === 'tools' && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">Pick up to 3 tools</p>
          <div className="flex flex-wrap gap-2">
            {toolPool.map((t) => (
              <button
                key={t.id}
                role="checkbox"
                aria-checked={picked.includes(t.id)}
                onClick={() => toggle(t.id)}
                className={`min-h-11 rounded-xl border-2 px-3 font-medium ${picked.includes(t.id) ? 'border-brand bg-brand-soft' : 'border-line bg-white'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Card className="mt-6 overflow-x-auto">
        {mode === 'recipes' ? (
          <table className="w-full min-w-[640px] text-left">
            <caption className="sr-only">Recipe comparison</caption>
            <thead>
              <tr className="border-b border-line">
                <th className="p-4 text-sm text-muted">Row</th>
                {recipes.map((r) => (
                  <th key={r.key} className="p-4 text-lg">
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const min = cheapest(recipes.map((r) => r.knownTotal))
                const best = Math.max(...recipes.map((r) => r.covered.length))
                const fastest = Math.min(...recipes.map((r) => r.setupHours))
                const rows: [string, (r: Recipe) => React.ReactNode, (r: Recipe) => boolean][] = [
                  ['Tools', (r) => r.items.map((s) => s.tool.name).concat(r.connector ? ['Zapier'] : []).join(' + '), () => false],
                  ['Monthly total', (r) => `${money(r.knownTotal)}${r.unknownCount ? ' + quote' : ''}`, (r) => r.knownTotal === min],
                  ['Problems solved', (r) => `${r.covered.length} of ${profile.problems.length}`, (r) => r.covered.length === best],
                  ['Setup time', (r) => hoursLabel(r.setupHours), (r) => r.setupHours === fastest],
                  ['Hidden fees included', (r) => (r.fees.length || r.connector ? [...r.fees.map((f) => f.note), r.connector?.reason].filter(Boolean).join('; ') : 'None'), (r) => !r.fees.length && !r.connector],
                  ['Match', (r) => `${r.score}/100`, (r) => r.score === Math.max(...recipes.map((x) => x.score))],
                  ['Not covered', (r) => (r.missing.length ? r.missing.map((id) => problemLabel(problemById(id)!, wordingIndustry(profile))).join('; ') : 'Nothing'), (r) => r.missing.length === 0],
                ]
                return rows.map(([label, cell, good]) => (
                  <tr key={label} className="border-b border-line last:border-0">
                    <th scope="row" className="p-4 text-sm font-semibold text-ink-soft">
                      {label}
                    </th>
                    {recipes.map((r) => (
                      <td key={r.key} className={`p-4 ${good(r) ? 'bg-ok-soft font-semibold' : ''}`}>
                        {cell(r)}
                      </td>
                    ))}
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[640px] text-left">
            <caption className="sr-only">Tool comparison</caption>
            <thead>
              <tr className="border-b border-line">
                <th className="p-4 text-sm text-muted">Row</th>
                {tools.map((t) => (
                  <th key={t.id} className="p-4">
                    <button onClick={() => openTool(t)} className="text-left text-lg underline-offset-4 hover:underline">
                      {t.name}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const min = cheapest(tools.map((t) => t.price))
                const rows: [string, (t: Tool) => React.ReactNode, (t: Tool) => boolean][] = [
                  ['What it does', (t) => t.does, () => false],
                  ['Monthly cost', (t) => t.priceLabel, (t) => t.price !== null && t.price === min],
                  [
                    'Extra fees',
                    (t) => {
                      const f = sysFees([t], profile.systems)
                      return [t.extraFees, ...f.map((x) => `+$${x.amount}/mo: ${x.note}`)].join(' ')
                    },
                    () => false,
                  ],
                  ['Setup time', (t) => hoursLabel(t.setupMinutes / 60), (t) => t.setupMinutes === Math.min(...tools.map((x) => x.setupMinutes))],
                  [
                    'Works with your software',
                    (t) => {
                      const b = badgesFor(t, profile.systems)
                      return b.length ? (
                        <div className="flex flex-wrap gap-1">
                          {b.map((x) => (
                            <CompatBadge key={x.system} system={x.system} status={x.status} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-ink-soft">Works on its own</span>
                      )
                    },
                    (t) => badgesFor(t, profile.systems).some((b) => b.status === 'native'),
                  ],
                  ['Fine print', (t) => (t.flags?.length ? <ul className="space-y-1 text-sm">{t.flags.map((f) => <li key={f.text}>• {f.text}</li>)}</ul> : 'None found yet'), () => false],
                  ['Your customer data', (t) => t.dataNote ?? 'Not reviewed yet', (t) => !!t.dataNote],
                  ['Free trial', (t) => t.freeTrial ?? 'None listed', (t) => !!t.freeTrial],
                  ['Cancel anytime?', (t) => (t.cancelAnytime === true ? 'Yes' : t.cancelAnytime === false ? 'No, contract' : 'Not stated'), (t) => t.cancelAnytime === true],
                  ['Outcome check-ins', () => 'Not enough check-ins yet', () => false],
                  ['Match for you', (t) => `${scoreTool(t, profile).score}/100`, (t) => scoreTool(t, profile).score === Math.max(...tools.map((x) => scoreTool(x, profile).score))],
                ]
                return rows.map(([label, cell, good]) => (
                  <tr key={label} className="border-b border-line align-top last:border-0">
                    <th scope="row" className="p-4 text-sm font-semibold text-ink-soft">
                      {label}
                    </th>
                    {tools.map((t) => (
                      <td key={t.id} className={`p-4 ${good(t) && tools.length > 1 ? 'bg-ok-soft font-semibold' : ''}`}>
                        {cell(t)}
                      </td>
                    ))}
                  </tr>
                ))
              })()}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
