import { useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { CATEGORIES, CHECKED, INDUSTRIES, PROBLEMS, SYSTEMS, problemLabel } from '../lib/repo'
import { track } from '../lib/storage'
import { COMPAT_POINTS, SIZE_LABEL, STALE_DAYS, USAGE_VOLUME, WEIGHTS } from '../lib/config'
import { getNeeds, professionCounts } from '../components/NeedForm'
import { BadgeLegend, Button, Card, money } from '../components/ui'
import type { Route } from '../state'
import type { CategoryId, IndustryId, SystemId, Tool } from '../types'

export function Catalog({ allTools, openTool }: { allTools: Tool[]; openTool: (t: Tool) => void }) {
  const [ind, setInd] = useState<IndustryId | 'all'>('all')
  const [cat, setCat] = useState<CategoryId | 'all'>('all')
  const real = allTools.filter((t) => !t.connector && !t.pending)
  const list = allTools.filter((t) => (ind === 'all' || t.industries.includes(ind)) && (cat === 'all' || t.category === cat))

  const pct = (n: number) => Math.round((n / real.length) * 100)
  const stats = [
    { label: 'publish a price', value: pct(real.filter((t) => t.price !== null).length) },
    { label: 'offer a free trial or plan', value: pct(real.filter((t) => t.freeTrial).length) },
    { label: 'clearly say you can cancel anytime', value: pct(real.filter((t) => t.cancelAnytime === true).length) },
    { label: 'require a contract or don’t say how to cancel', value: pct(real.filter((t) => t.cancelAnytime !== true).length) },
  ]
  const flagged = real.filter((t) => t.flags?.some((f) => f.kind !== 'good')).length
  const needs = getNeeds().filter((n) => n.kind !== 'profession').length
  const professions = professionCounts()

  return (
    <div className="fade-in">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Browse all tools</h1>
      <p className="mt-1 text-lg text-ink-soft">
        {real.length} tools researched for Main Street businesses. Prices checked {CHECKED}, with a source on every tool.
      </p>

      <Card className="mt-6 p-5">
        <p className="font-semibold">What we found in our own catalog</p>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-brand">{s.value}%</p>
              <p className="text-sm text-ink-soft">of tools {s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm">
          <strong>{flagged}</strong> tools have fine print worth knowing (extra fees, contracts, or setup catches). <strong>{needs}</strong> unmet need{needs === 1 ? '' : 's'} logged by owners on this device.
          {professions.length > 0 && (
            <>
              {' '}
              Professions people asked us to add: {professions.slice(0, 5).map(([p, n]) => `${p} (${n})`).join(', ')}.
            </>
          )}
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          Calculated live from the {real.length} tools below. “Publish a price” counts tools with a price in a public source, including third-party trackers.
        </p>
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="flex items-center gap-2">
          <span className="text-sm font-semibold">Business</span>
          <select className="min-h-11 rounded-xl border-2 border-line bg-white px-3" value={ind} onChange={(e) => setInd(e.target.value as IndustryId | 'all')}>
            <option value="all">All</option>
            {INDUSTRIES.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm font-semibold">Area</span>
          <select className="min-h-11 rounded-xl border-2 border-line bg-white px-3" value={cat} onChange={(e) => setCat(e.target.value as CategoryId | 'all')}>
            <option value="all">All</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => (
          <button key={t.id + (t.pending ? '-p' : '')} onClick={() => openTool(t)} className="rounded-2xl border border-line bg-white p-4 text-left hover:border-brand">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{t.name}</span>
              {t.pending ? (
                <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">Pending verification</span>
              ) : t.connector ? (
                <span className="shrink-0 rounded-full bg-muted-soft px-2 py-0.5 text-xs">Connector</span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-ink-soft">{t.does}</p>
            <p className="mt-2 text-sm font-semibold">{t.price === null ? 'Price not published' : t.price === 0 ? 'Included with your software' : `${money(t.price)}/mo`}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export function Vendor({ addVendorTool, go }: { addVendorTool: (t: Tool) => void; go: (r: Route) => void }) {
  const [done, setDone] = useState<string | null>(null)
  const [cat, setCat] = useState<CategoryId>('phones')
  const [inds, setInds] = useState<IndustryId[]>([])
  const [probs, setProbs] = useState<string[]>([])
  const [works, setWorks] = useState<SystemId[]>([])
  const [published, setPublished] = useState(true)
  const problems = useMemo(() => PROBLEMS.filter((p) => p.category === cat), [cat])

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const name = String(f.get('name') || '').trim()
    const price = published ? Number(f.get('price') || 0) : null
    const evidence = String(f.get('evidence') || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const tool: Tool = {
      id: `vendor-${Date.now()}`,
      name,
      vendor: String(f.get('vendor') || name),
      url: String(f.get('url') || '#'),
      does: String(f.get('does') || ''),
      role: String(f.get('does') || ''),
      category: cat,
      problems: probs,
      industries: inds.length ? inds : ['restaurant', 'hvac', 'salon', 'landscaping'],
      relevant: ['pos', 'fsm', 'booking', 'accounting'],
      works: Object.fromEntries(works.map((w) => [w, 'native'])),
      price,
      priceLabel: price === null ? 'Not published' : `${money(price)}/mo (self-reported)`,
      extraFees: String(f.get('fees') || 'None stated'),
      freeTrial: String(f.get('trial') || '') || null,
      cancelAnytime: f.get('cancel') === 'yes' ? true : f.get('cancel') === 'no' ? false : null,
      setupMinutes: 60,
      setupNote: 'Self-reported by the vendor.',
      effort: 2,
      dataNote: String(f.get('data') || '') || null,
      sources: evidence.map((u, i) => ({ label: `Vendor evidence ${i + 1}`, url: u })),
      checked: new Date().toISOString().slice(0, 10),
      pending: true,
    }
    addVendorTool(tool)
    track('vendor_submitted', { name })
    setDone(name)
  }

  if (done) {
    return (
      <Card className="fade-in p-6">
        <CheckCircle2 className="text-ok" size={40} aria-hidden />
        <h1 className="mt-2 font-display text-3xl font-semibold">Thanks, {done} is in the review queue</h1>
        <p className="mt-2 text-ink-soft">
          It now appears in Browse tools marked <strong>Pending verification</strong>. It won’t show up in recipes until ToolRecipe checks the price, the integrations, and the evidence links you provided.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => go('catalog')}>See it in Browse tools</Button>
          <Button variant="secondary" onClick={() => setDone(null)}>
            Submit another
          </Button>
        </div>
      </Card>
    )
  }

  const field = 'mt-1 w-full rounded-xl border-2 border-line bg-white p-3 focus:border-brand focus:outline-none'
  const chk = (on: boolean) => `min-h-11 rounded-xl border-2 px-3 text-sm font-medium ${on ? 'border-brand bg-brand-soft' : 'border-line bg-white'}`
  return (
    <div className="fade-in">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">For AI vendors</h1>
      <p className="mt-1 max-w-2xl text-lg text-ink-soft">
        List your tool for free. Every listing uses the same fields, and nobody can pay for a higher rank. Owners reach you already knowing their problem, their software, and their budget.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-line bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="font-semibold">Tool name *</span>
            <input name="name" required className={field} />
          </label>
          <label>
            <span className="font-semibold">Company</span>
            <input name="vendor" className={field} />
          </label>
          <label className="sm:col-span-2">
            <span className="font-semibold">Website</span>
            <input name="url" type="url" placeholder="https://" className={field} />
          </label>
          <label className="sm:col-span-2">
            <span className="font-semibold">What it does, in one plain sentence *</span>
            <input name="does" required maxLength={160} placeholder="Answers calls and books appointments into your calendar." className={field} />
          </label>
        </div>
        <fieldset>
          <legend className="font-semibold">Problem area</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.id} className={chk(cat === c.id)} aria-pressed={cat === c.id} onClick={() => (setCat(c.id), setProbs([]))}>
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {problems.map((p) => (
              <button type="button" key={p.id} className={chk(probs.includes(p.id))} aria-pressed={probs.includes(p.id)} onClick={() => setProbs((x) => (x.includes(p.id) ? x.filter((y) => y !== p.id) : [...x, p.id]))}>
                {problemLabel(p, null)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-semibold">Who it’s for</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {INDUSTRIES.map((i) => (
              <button type="button" key={i.id} className={chk(inds.includes(i.id))} aria-pressed={inds.includes(i.id)} onClick={() => setInds((x) => (x.includes(i.id) ? x.filter((y) => y !== i.id) : [...x, i.id]))}>
                {i.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-semibold">Connects directly to</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SYSTEMS.filter((s) => s.kind !== 'none').map((s) => (
              <button type="button" key={s.id} className={chk(works.includes(s.id))} aria-pressed={works.includes(s.id)} onClick={() => setWorks((x) => (x.includes(s.id) ? x.filter((y) => y !== s.id) : [...x, s.id]))}>
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className="font-semibold">Monthly price (USD)</span>
            <input name="price" type="number" min={0} step="0.01" disabled={!published} className={field} />
            <span className="mt-1 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!published} onChange={(e) => setPublished(!e.target.checked)} /> We don’t publish prices
            </span>
          </label>
          <label>
            <span className="font-semibold">Free trial</span>
            <input name="trial" placeholder="14-day free trial" className={field} />
          </label>
          <label>
            <span className="font-semibold">Cancel anytime?</span>
            <select name="cancel" className={field} defaultValue="unsure">
              <option value="yes">Yes</option>
              <option value="no">No, contract</option>
              <option value="unsure">Depends</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="font-semibold">Extra fees (per-use, setup, overages)</span>
          <input name="fees" className={field} />
        </label>
        <label className="block">
          <span className="font-semibold">What happens to customer data?</span>
          <input name="data" placeholder="Where it’s stored, whether it trains AI models" className={field} />
        </label>
        <label className="block">
          <span className="font-semibold">Evidence links (one per line) *</span>
          <textarea name="evidence" required rows={3} placeholder="Pricing page, integration docs, privacy policy" className={field} />
        </label>
        <Button type="submit" size="lg">
          Submit for verification
        </Button>
      </form>
    </div>
  )
}

export function HowWeRank() {
  const C = COMPAT_POINTS
  const parts = [
    ['Solves your problem', WEIGHTS.problem, 'How many of the problems you picked this tool covers.'],
    ['Works with your software', WEIGHTS.compat, `Direct connection ${C.native} · via Zapier or works alongside ${C.zapier} · not confirmed ${C.unknown} · doesn’t connect ${C.none}.`],
    ['Fits your budget', WEIGHTS.budget, `Monthly cost including estimated usage fees: within budget ${WEIGHTS.budget} · up to 1.5× budget ${Math.round(WEIGHTS.budget / 2)} · price not published ${Math.round(WEIGHTS.budget / 3)} · above that 0.`],
    ['Setup matches your comfort', WEIGHTS.effort, 'Full points when setup effort is at or below the comfort level you chose.'],
    ['Trust signals', WEIGHTS.trust, 'Publishes a price 8 · free trial or plan 6 · cancel anytime 6 (2 if not stated, 0 if a contract is required). If you need to be very careful with customer data, tools that keep data in software you already use get +4 and unreviewed tools −4.'],
  ] as const
  return (
    <div className="fade-in max-w-3xl">
      <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand-dark">
        <ShieldCheck size={16} aria-hidden /> Vendors can’t pay for placement
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">How we rank tools</h1>
      <p className="mt-2 text-lg text-ink-soft">
        Every tool gets the same Match score out of 100, calculated from your answers. Here is all of the math. Nothing is hidden and nothing is for sale.
      </p>

      <Card className="mt-6 p-5">
        <h2 className="text-xl font-semibold">The Match score</h2>
        <ul className="mt-3 space-y-3">
          {parts.map(([label, max, how]) => (
            <li key={label} className="flex gap-4">
              <span className="w-12 shrink-0 text-2xl font-bold text-brand">{max}</span>
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="text-ink-soft">{how}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-soft">This is a ToolRecipe evaluation to help you compare, not a security certification.</p>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-xl font-semibold">What the colors mean</h2>
        <div className="mt-3">
          <BadgeLegend />
        </div>
        <p className="mt-3 text-ink-soft">
          A connection is green only when a vendor page or review we checked documents it. If we couldn’t confirm it, we say so instead of guessing.
        </p>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-xl font-semibold">Fine print and usage fees</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
          <li><strong>Fine print</strong> flags are plain-English notes about contracts, extra fees, and customer data that we found in a vendor page or review. Every flag links to its source. The wording is ours, so follow the link for the exact terms.</li>
          <li>
            <strong>Usage fees</strong> (per call, per caller, per conversation) are estimated from your business size: {(['solo', 'small', 'medium'] as const).map((k) => `${SIZE_LABEL[k]} ≈ ${USAGE_VOLUME.calls[k]} calls a month`).join(', ')}. Each estimate shows its math.
          </li>
        </ul>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-xl font-semibold">How recipes are built</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
          <li><strong>Simple:</strong> the cheapest easy-to-set-up tool that scores close to the best for your biggest problem.</li>
          <li><strong>Balanced:</strong> the combination that solves the most problems within your budget, then has the best average score.</li>
          <li><strong>All-in:</strong> the top-scoring tool for each problem (up to twice your budget), plus a writing helper if you picked a marketing problem. If that matches Balanced, it adds the best tool for a closely related problem, such as missed calls.</li>
          <li>If a tool only reaches your software through Zapier, we add Zapier’s cost to the total. Fees tied to your software (for example, Toast’s fee for MarginEdge) are added too.</li>
          <li>Tools built into software you already use only appear when you’ve tapped that software.</li>
        </ul>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-xl font-semibold">Where the data comes from, and what’s simulated</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
          <li>Prices were checked on {CHECKED}. Many vendors don’t publish prices, so some come from third-party price trackers. Every tool lists its sources.</li>
          <li>Every tool card shows how long ago it was checked. After {STALE_DAYS} days it’s marked “Price needs re-check” and can’t be the Best start.</li>
          <li>Setup times are ToolRecipe estimates unless the vendor publishes one.</li>
          <li>Customer-data reviews are only shown where a source describes them. Otherwise we say “Not reviewed yet.”</li>
          <li>Outcome check-ins: we show “Not enough check-ins yet” until enough real owners report back. We never display made-up results.</li>
          <li>The “day in your business” preview is an estimate from your own numbers and the assumptions shown on screen.</li>
          <li>Your answers stay in your browser. Nothing is sent to a server.</li>
          <li>Professions we haven’t added yet (“Something else”) only see tools that work for any business.</li>
        </ul>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-xl font-semibold">Your AI starting point</h2>
        <p className="mt-2 text-ink-soft">
          Out of 100: software you already use (30), comfort with new apps (30), setup time (25), and budget room (15). It’s not a grade. It decides which recipe we suggest first and whether to point you to free setup help.
        </p>
      </Card>
    </div>
  )
}
