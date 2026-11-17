import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeftRight, Calculator, Check, CheckCircle2, Clock, Minus, X, HelpCircle, Link2, Search, SearchCheck, Send, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react'
import { Logo } from '../components/Logo'
import { CATEGORY_STYLE } from '../lib/categoryStyle'
import { CATEGORIES, CHECKED, INDUSTRIES, PROBLEMS, SYSTEMS, problemLabel } from '../lib/repo'
import { track } from '../lib/storage'
import { fmtDate } from '../lib/format'
import { COMPAT_POINTS, SIZE_LABEL, STALE_DAYS, USAGE_VOLUME, WEIGHTS } from '../lib/config'
import { Button, Card, DarkHero, Eyebrow, HeroStat, PromiseCard, money } from '../components/ui'
import type { Route } from '../state'
import type { CategoryId, IndustryId, Profile, SystemId, Tool } from '../types'
import { scoreTool } from '../engine/recipes'

type PriceF = 'any' | 'free' | '50' | '100' | '200'
type SetupF = 'any' | 'hour' | 'day' | 'week'
type SortF = 'match' | 'price' | 'setup'
const PRICE_OPTS: [PriceF, string][] = [['any', 'Any price'], ['free', 'Free or included'], ['50', 'Under $50'], ['100', 'Under $100'], ['200', 'Under $200']]
const SETUP_OPTS: [SetupF, string][] = [['any', 'Any setup time'], ['hour', 'An hour or less'], ['day', 'A day or less'], ['week', 'A week or less']]
const SETUP_MAX: Record<SetupF, number> = { any: Infinity, hour: 60, day: 480, week: 2400 }
const PAGE = 12

function setupText(min: number) {
  return min < 120 ? `${min} min setup` : min < 2880 ? `${Math.round(min / 60)} hr setup` : `${Math.round(min / 1440)} day setup`
}

export function Catalog({ allTools, openTool, profile }: { allTools: Tool[]; openTool: (t: Tool) => void; profile: Profile }) {
  const [ind, setInd] = useState<IndustryId | 'all'>('all')
  const [prob, setProb] = useState<string>('all')
  const [sys, setSys] = useState<SystemId | 'all'>('all')
  const [price, setPrice] = useState<PriceF>('any')
  const [setup, setSetup] = useState<SetupF>('any')
  const [sort, setSort] = useState<SortF>('match')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(PAGE)
  const [sheet, setSheet] = useState(false)
  const real = allTools.filter((t) => !t.connector && !t.pending)

  const probOpts = useMemo(() => {
    const ids = new Set(allTools.flatMap((t) => t.problems))
    return PROBLEMS.filter((p) => ids.has(p.id) && (ind === 'all' || p.industries?.includes?.(ind) !== false))
  }, [allTools, ind])
  const sysOpts = useMemo(() => SYSTEMS.filter((x) => x.id !== 'paper' && allTools.some((t) => t.works?.[x.id] === 'native' || t.works?.[x.id] === 'zapier')), [allTools])

  const priceOk = (t: Tool) => {
    if (price === 'any') return true
    if (t.price === null) return false
    if (price === 'free') return t.price === 0
    return t.price < Number(price)
  }
  const matchScore = useMemo(() => {
    const m = new Map<string, number>()
    const p: Profile = profile.industry ? profile : { ...profile, industry: ind === 'all' ? 'restaurant' : ind }
    allTools.forEach((t) => m.set(t.id, scoreTool(t, p).score))
    return m
  }, [allTools, profile, ind])

  const list = allTools
    .filter(
      (t) =>
        (ind === 'all' || t.industries.includes(ind)) &&
        (prob === 'all' || t.problems.includes(prob)) &&
        (sys === 'all' || t.works?.[sys] === 'native' || t.works?.[sys] === 'zapier') &&
        priceOk(t) &&
        t.setupMinutes <= SETUP_MAX[setup] &&
        (!q.trim() || `${t.name} ${t.vendor} ${t.does}`.toLowerCase().includes(q.trim().toLowerCase())),
    )
    .sort((x, y) => {
      if (!!x.connector !== !!y.connector) return x.connector ? 1 : -1
      if (sort === 'price') return (x.price ?? 1e9) - (y.price ?? 1e9) || x.name.localeCompare(y.name)
      if (sort === 'setup') return x.setupMinutes - y.setupMinutes || x.name.localeCompare(y.name)
      return (matchScore.get(y.id) ?? 0) - (matchScore.get(x.id) ?? 0) || x.name.localeCompare(y.name)
    })

  const pct = (n: number) => Math.round((n / real.length) * 100)
  const stats = [
    { label: 'publish a price', value: pct(real.filter((t) => t.price !== null).length) },
    { label: 'offer a free trial or plan', value: pct(real.filter((t) => t.freeTrial).length) },
    { label: 'say you can cancel anytime', value: pct(real.filter((t) => t.cancelAnytime === true).length) },
    { label: 'need a contract or don’t say', value: pct(real.filter((t) => t.cancelAnytime !== true).length) },
  ]
  const flagged = real.filter((t) => t.flags?.some((f) => f.kind !== 'good')).length

  const reset = (fn: () => void) => {
    fn()
    setShown(PAGE)
  }
  const active: { label: string; clear: () => void }[] = [
    ...(prob !== 'all' ? [{ label: problemLabel(PROBLEMS.find((p) => p.id === prob)!, ind === 'all' ? null : ind), clear: () => setProb('all') }] : []),
    ...(sys !== 'all' ? [{ label: `Works with ${SYSTEMS.find((x) => x.id === sys)?.label}`, clear: () => setSys('all') }] : []),
    ...(price !== 'any' ? [{ label: PRICE_OPTS.find((o) => o[0] === price)![1], clear: () => setPrice('any') }] : []),
    ...(setup !== 'any' ? [{ label: SETUP_OPTS.find((o) => o[0] === setup)![1], clear: () => setSetup('any') }] : []),
    ...(ind !== 'all' ? [{ label: INDUSTRIES.find((i) => i.id === ind)!.label, clear: () => setInd('all') }] : []),
  ]
  const clearAll = () =>
    reset(() => {
      setProb('all')
      setSys('all')
      setPrice('any')
      setSetup('any')
      setInd('all')
      setQ('')
    })

  const ai = list.filter((t) => !t.connector).length
  const countText = `${ai} AI tool${ai === 1 ? '' : 's'}${list.length > ai ? ' + Zapier' : ''}`

  const selectCls = 'min-h-12 w-full rounded-xl border-[1.5px] border-black/10 bg-white px-3 text-[15px] focus:border-ink focus:outline-none'
  const filters = (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1 block font-semibold">Problem</span>
        <select className={selectCls} value={prob} onChange={(e) => reset(() => setProb(e.target.value))}>
          <option value="all">Any problem</option>
          {CATEGORIES.map((c) => (
            <optgroup key={c.id} label={c.label}>
              {probOpts
                .filter((p) => p.category === c.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {problemLabel(p, ind === 'all' ? null : ind)}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">Works with</span>
        <select className={selectCls} value={sys} onChange={(e) => reset(() => setSys(e.target.value as SystemId | 'all'))}>
          <option value="all">Any software</option>
          {sysOpts.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">Monthly price</span>
        <select className={selectCls} value={price} onChange={(e) => reset(() => setPrice(e.target.value as PriceF))}>
          {PRICE_OPTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">Setup time</span>
        <select className={selectCls} value={setup} onChange={(e) => reset(() => setSetup(e.target.value as SetupF))}>
          {SETUP_OPTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold">Business</span>
        <select className={selectCls} value={ind} onChange={(e) => reset(() => setInd(e.target.value as IndustryId | 'all'))}>
          <option value="all">Any business</option>
          {INDUSTRIES.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )

  return (
    <div className="fade-in">
      <DarkHero
        eyebrow="The catalog"
        title="Browse all tools"
        sub={<>{real.length} AI tools researched for Main Street businesses, plus Zapier, the helper app that connects them. Every price and connection links to a source.</>}
      >
        <p className="text-sm font-semibold text-fog">What the fine print says across all {real.length} tools</p>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
          {stats.map((x, i) => (
            <HeroStat key={x.label} gold={i === 0} value={`${x.value}%`} label={`of tools ${x.label}`} />
          ))}
        </div>
        <p className="mt-5 text-sm text-fog">
          {flagged} tools have fine print worth knowing · Prices checked {fmtDate(CHECKED)}
        </p>
      </DarkHero>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-20 rounded-3xl border border-black/[0.07] bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">Filters</h2>
              {active.length > 0 && (
                <button onClick={clearAll} className="min-h-11 px-1 font-semibold text-brand underline underline-offset-2">
                  Clear all
                </button>
              )}
            </div>
            {filters}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block flex-1">
              <span className="sr-only">Search tools</span>
              <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input value={q} onChange={(e) => reset(() => setQ(e.target.value))} placeholder="Search by name or what it does" className="min-h-12 w-full rounded-full border-[1.5px] border-black/10 bg-white pl-11 pr-4 focus:border-ink focus:outline-none" />
            </label>
            <div className="flex gap-2">
              <button onClick={() => setSheet(true)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border-[1.5px] border-black/10 bg-white px-4 font-semibold lg:hidden" aria-haspopup="dialog">
                <SlidersHorizontal size={18} aria-hidden /> Filters{active.length ? ` (${active.length})` : ''}
              </button>
              <label className="flex-1 sm:flex-none">
                <span className="sr-only">Sort by</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortF)} className="min-h-12 w-full rounded-full border-[1.5px] border-black/10 bg-white px-4 font-semibold focus:border-ink focus:outline-none">
                  <option value="match">Sort: Best match</option>
                  <option value="price">Sort: Lowest price</option>
                  <option value="setup">Sort: Quickest setup</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <p className="mr-1 font-semibold text-ink-soft" aria-live="polite">
              {countText}
            </p>
            {active.map((f) => (
              <button key={f.label} onClick={() => reset(f.clear)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-[15px] font-medium text-brand hover:bg-info-soft" aria-label={`Remove filter: ${f.label}`}>
                {f.label} <X size={15} aria-hidden />
              </button>
            ))}
            {active.length > 1 && (
              <button onClick={clearAll} className="min-h-10 px-1 text-[15px] font-semibold text-brand underline underline-offset-2">
                Clear all
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.slice(0, shown).map((t) => {
              const st = CATEGORY_STYLE[t.category]
              const connects = Object.entries(t.works ?? {})
                .filter(([, v]) => v === 'native')
                .map(([k]) => SYSTEMS.find((x) => x.id === k)?.label)
                .filter((x): x is string => !!x)
              const notes = t.flags?.filter((f) => f.kind !== 'good').length ?? 0
              return (
                <button
                  key={t.id + (t.pending ? '-p' : '')}
                  onClick={() => openTool(t)}
                  className="lift group flex flex-col gap-3 rounded-3xl border border-black/[0.06] bg-white p-5 text-left hover:border-brand/40"
                >
                  <span className="flex items-start gap-3">
                    <Logo name={t.name} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug group-hover:underline">{t.name}</span>
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold ${st.tile}`}>{st.label}</span>
                      {t.pending && <span className="ml-1 inline-flex rounded-full bg-warn-soft px-2 py-0.5 text-sm font-semibold text-warn">Pending</span>}
                      {t.connector && <span className="ml-1 inline-flex rounded-full bg-muted-soft px-2 py-0.5 text-sm font-semibold">Connector</span>}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[15px] text-ink-soft">{t.does}</span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-soft">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} aria-hidden /> {setupText(t.setupMinutes)}
                    </span>
                    <span>Checked {fmtDate(t.checked)}</span>
                  </span>
                  <span className="mt-auto flex items-end justify-between gap-3 border-t border-black/[0.06] pt-3">
                    <span className="flex items-center gap-1" title={connects.length ? `Connects to ${connects.join(', ')}` : 'Works on its own'}>
                      {connects.length ? (
                        <>
                          <span className="sr-only">Connects to {connects.join(', ')}</span>
                          {connects.slice(0, 4).map((n) => (
                            <Logo key={n} name={n} size={24} />
                          ))}
                          {connects.length > 4 && <span className="text-sm text-ink-soft">+{connects.length - 4}</span>}
                        </>
                      ) : (
                        <span className="text-sm text-ink-soft">Works on its own</span>
                      )}
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold tabular-nums">{t.price === null ? 'Quote' : t.price === 0 ? 'Included' : `${money(t.price)}/mo`}</span>
                      {notes > 0 && <span className="block text-sm text-warn">{notes} fine-print note{notes > 1 ? 's' : ''}</span>}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {list.length > shown && (
            <div className="mt-6 text-center">
              <Button variant="secondary" size="lg" onClick={() => setShown((n) => n + PAGE)}>
                Show more ({list.length - shown} left)
              </Button>
            </div>
          )}

          {list.length === 0 && (
            <div className="mt-6 rounded-3xl bg-white p-6 text-center">
              <p className="font-semibold">No tools match all of these filters.</p>
              <p className="mt-1 text-ink-soft">{active.length ? `Try removing “${active[active.length - 1].label}”.` : 'Try a shorter search, like “calls” or “reviews”.'}</p>
              <Button variant="secondary" className="mt-4" onClick={clearAll}>
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters" onKeyDown={(e) => e.key === 'Escape' && setSheet(false)}>
          <button aria-label="Close filters" className="absolute inset-0 bg-ink/40" onClick={() => setSheet(false)} />
          <div className="fade-in absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl">Filters</h2>
              <button onClick={() => setSheet(false)} autoFocus className="grid h-11 w-11 place-items-center rounded-full hover:bg-line" aria-label="Close filters">
                <X />
              </button>
            </div>
            {filters}
            <div className="sticky bottom-0 -mx-5 mt-5 flex gap-2 border-t border-line bg-paper px-5 pt-4">
              <Button variant="secondary" className="flex-1" onClick={clearAll}>
                Clear all
              </Button>
              <Button className="flex-1" onClick={() => setSheet(false)}>
                Show {countText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Small section label inside a vendor form card, with an optional count */
function SubLabel({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
      {children}
      {count ? <span className="rounded-full bg-ink px-2 text-xs leading-5 text-white">{count}</span> : null}
    </p>
  )
}

/** A tappable row with a checkbox look */
function CheckRow({ on, onClick, children, boxed = false }: { on: boolean; onClick: () => void; children: ReactNode; boxed?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 px-3.5 text-left text-[15px] transition ${boxed ? `rounded-xl border-[1.5px] ${on ? 'border-brand bg-brand-soft' : 'border-black/[0.07] hover:border-black/20'}` : 'first:rounded-t-2xl last:rounded-b-2xl hover:bg-paper'}`}
    >
      <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${on ? 'bg-brand text-white' : 'border-2 border-black/25'}`}>
        {on && <Check size={15} strokeWidth={3.5} />}
      </span>
      {children}
    </button>
  )
}

/** One numbered section of the vendor form (kept outside Vendor so inputs keep their values) */
function Part({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
  <fieldset className="rounded-3xl border border-black/[0.07] bg-white p-5 sm:p-6">
    <legend className="sr-only">{title}</legend>
    <p aria-hidden className="flex items-center gap-3 text-lg font-semibold">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-ink font-display text-sm text-white">{n}</span>
      {title}
    </p>
    <div className="mt-4 space-y-4">{children}</div>
  </fieldset>
)
}

export function Vendor({ addVendorTool, go }: { addVendorTool: (t: Tool) => void; go: (r: Route) => void }) {
  const [done, setDone] = useState<string | null>(null)
  const [cat, setCat] = useState<CategoryId>('phones')
  const [inds, setInds] = useState<IndustryId[]>([])
  const [probs, setProbs] = useState<string[]>([])
  const [works, setWorks] = useState<SystemId[]>([])
  const [published, setPublished] = useState(true)
  const [pvName, setPvName] = useState('')
  const [pvDoes, setPvDoes] = useState('')
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
          <Button variant="secondary" onClick={() => { setDone(null); setPvName(''); setPvDoes('') }}>
            Submit another
          </Button>
        </div>
      </Card>
    )
  }

  const field = 'mt-1.5 w-full rounded-2xl border-[1.5px] border-black/10 bg-paper p-3 focus:border-ink focus:bg-white focus:outline-none'
  return (
    <div className="fade-in">
      <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <Eyebrow>For AI vendors</Eyebrow>
          <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">List your tool. Free, and the same rules for everyone.</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-soft">Owners reach you already knowing their problem, their software, and their budget. Nobody can pay for a higher rank.</p>
        </div>
        <ol className="grid gap-3">
          {[
            [Send, 'Tell us about your tool', 'Price, what it does, and which software it works with.', 'bg-brand-soft text-brand'],
            [SearchCheck, 'We check every claim', 'Prices and connections need a public source.', 'bg-accent-soft text-warn'],
            [Users, 'Owners see it when it fits', 'Same Match score as everyone. No fees, no boosts.', 'bg-ok-soft text-ok'],
          ].map(([Icon, t, d, tone], i) => {
            const I = Icon as typeof Send
            return (
              <li key={t as string} className="flex items-center gap-4 rounded-3xl border border-black/[0.06] bg-white p-4">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone as string}`}>
                  <I size={22} aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">
                    {i + 1}. {t as string}
                  </span>
                  <span className="block text-[15px] text-ink-soft">{d as string}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <form onSubmit={submit} className="mt-10 grid gap-4 lg:grid-cols-2">
        <Part n={1} title="About your tool">
          <label className="block">
            <span className="font-semibold">Tool name *</span>
            <input name="name" required className={field} onChange={(e) => setPvName(e.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="font-semibold">Company</span>
              <input name="vendor" className={field} />
            </label>
            <label className="block">
              <span className="font-semibold">Website</span>
              <input name="url" type="url" placeholder="https://" className={field} />
            </label>
          </div>
          <label className="block">
            <span className="font-semibold">What it does, in one plain sentence *</span>
            <input name="does" required maxLength={160} placeholder="Answers calls and books appointments into your calendar." className={field} onChange={(e) => setPvDoes(e.target.value)} />
          </label>
          <div className="rounded-2xl border border-dashed border-black/15 bg-paper p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">How owners will see it</p>
            <div className="mt-3 rounded-2xl border border-black/[0.07] bg-white p-4">
              <div className="flex items-center gap-3">
                <Logo name={pvName || 'Your tool'} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{pvName || 'Your tool'}</p>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_STYLE[cat].tile}`}>{CATEGORY_STYLE[cat].label}</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-soft">{pvDoes || 'Your one-sentence description shows here.'}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {works.length === 0 ? <span className="text-xs text-ink-soft">Works on its own</span> : works.map((w) => <Logo key={w} name={SYSTEMS.find((x) => x.id === w)?.label ?? w} size={22} />)}
              </div>
            </div>
          </div>
        </Part>

        <Part n={2} title="Who it helps">
          <div>
            <SubLabel>Problem area</SubLabel>
            <div className="grid grid-cols-5 gap-1.5">
              {CATEGORIES.map((c) => {
                const st = CATEGORY_STYLE[c.id]
                const Icon = st.icon
                const on = cat === c.id
                return (
                  <button
                    type="button"
                    key={c.id}
                    aria-pressed={on}
                    onClick={() => (setCat(c.id), setProbs([]))}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-xs font-semibold transition ${on ? `${st.tile} ring-2 ring-current` : 'bg-paper text-ink-soft hover:bg-black/[0.05]'}`}
                  >
                    <Icon size={18} aria-hidden />
                    {st.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <SubLabel count={probs.length}>Problems it solves</SubLabel>
            <div className="divide-y divide-black/[0.06] rounded-2xl border border-black/[0.07]">
              {problems.map((p) => (
                <CheckRow key={p.id} on={probs.includes(p.id)} onClick={() => setProbs((x) => (x.includes(p.id) ? x.filter((y) => y !== p.id) : [...x, p.id]))}>
                  {problemLabel(p, null)}
                </CheckRow>
              ))}
            </div>
          </div>
          <div>
            <SubLabel count={inds.length}>Businesses</SubLabel>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {INDUSTRIES.map((i) => (
                <CheckRow key={i.id} boxed on={inds.includes(i.id)} onClick={() => setInds((x) => (x.includes(i.id) ? x.filter((y) => y !== i.id) : [...x, i.id]))}>
                  {i.label}
                </CheckRow>
              ))}
            </div>
          </div>
          <details className="group rounded-2xl border border-black/[0.07]">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold">
              <span>
                Connects directly to <span className="font-normal text-ink-soft">{works.length ? `· ${works.length} picked` : '· optional'}</span>
              </span>
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-paper text-lg leading-none transition group-open:rotate-45">+</span>
            </summary>
            <div className="grid grid-cols-2 gap-1.5 px-3 pb-3 sm:grid-cols-3">
              {SYSTEMS.filter((x) => x.kind !== 'none').map((x) => {
                const on = works.includes(x.id)
                return (
                  <button
                    type="button"
                    key={x.id}
                    aria-pressed={on}
                    onClick={() => setWorks((w) => (w.includes(x.id) ? w.filter((y) => y !== x.id) : [...w, x.id]))}
                    className={`flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] px-2 text-left text-sm font-medium leading-tight transition ${on ? 'border-brand bg-brand-soft' : 'border-transparent bg-paper hover:border-black/10'}`}
                  >
                    <Logo name={x.label} size={24} />
                    <span className="min-w-0">{x.label}</span>
                  </button>
                )
              })}
            </div>
          </details>
        </Part>

        <Part n={3} title="Price and terms">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block">
                <span className="font-semibold">Monthly price</span>
                <input name="price" type="number" min={0} step="0.01" disabled={!published} placeholder="USD" className={field} />
              </label>
              <label className="mt-1.5 inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
                <input type="checkbox" className="h-7 w-7 accent-brand" checked={!published} onChange={(e) => setPublished(!e.target.checked)} /> Not published
              </label>
            </div>
            <label className="block">
              <span className="font-semibold">Free trial</span>
              <input name="trial" placeholder="14-day trial" className={field} />
            </label>
            <label className="block">
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
        </Part>

        <Part n={4} title="Proof">
          <label className="block">
            <span className="font-semibold">What happens to customer data?</span>
            <input name="data" placeholder="Where it’s stored, whether it trains AI models" className={field} />
          </label>
          <label className="block">
            <span className="font-semibold">Evidence links (one per line) *</span>
            <textarea name="evidence" required rows={3} placeholder="Pricing page, integration docs, privacy policy" className={field} />
          </label>
          <p className="text-sm text-ink-soft">A person checks every claim against your public pages. Until then your tool is kept out of recipes.</p>
        </Part>

        <div className="flex justify-end lg:col-span-2">
          <Button type="submit" size="lg">
            Submit for verification
          </Button>
        </div>
      </form>
    </div>
  )
}

function More({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-3xl border border-black/[0.07] bg-white p-5 sm:p-6">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
        {title}
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-paper transition group-open:rotate-45">+</span>
      </summary>
      <div className="mt-4 space-y-2 text-ink-soft">{children}</div>
    </details>
  )
}

const LABELS: { icon: typeof Check; name: string; means: string; tone: string }[] = [
  { icon: Check, name: 'Connects directly', means: 'Its work shows up in your software on its own.', tone: 'bg-ok-soft text-ok' },
  { icon: ArrowLeftRight, name: 'Through Zapier', means: 'A helper app copies it over. Zapier’s cost is in your total.', tone: 'bg-warn-soft text-warn' },
  { icon: Minus, name: 'Works alongside', means: 'Runs on its own. Nothing is sent to your software.', tone: 'bg-muted-soft text-ink-soft' },
  { icon: HelpCircle, name: 'Not confirmed', means: 'We couldn’t find proof. Ask the company before you buy.', tone: 'bg-muted-soft text-muted' },
  { icon: X, name: 'Doesn’t connect', means: 'It can’t send anything to that software.', tone: 'bg-bad-soft text-bad' },
]

export function HowWeRank() {
  const C = COMPAT_POINTS
  const parts = [
    { label: 'Solves your problem', max: WEIGHTS.problem, color: 'bg-[#ffd84d]', short: 'Covers the problems you picked', how: 'Points for how many of the problems you picked this tool covers.' },
    { label: 'Works with your software', max: WEIGHTS.compat, color: 'bg-[#ffe79a]', short: 'Connects to what you already use', how: `Direct connection ${C.native} · through Zapier or works alongside ${C.zapier} · not confirmed ${C.unknown} · doesn’t connect ${C.none}.` },
    { label: 'Trust signals', max: WEIGHTS.trust, color: 'bg-[#c7d7ee]', short: 'Clear price, free trial, easy to cancel', how: 'Publishes a price 8 · free trial or plan 6 · cancel anytime 6 (2 if not stated, 0 if a contract is required). If you need to be very careful with customer data: +4 for tools that keep data in software you already use, −4 for unreviewed tools.' },
    { label: 'Fits your budget', max: WEIGHTS.budget, color: 'bg-[#93acd6]', short: 'Real monthly cost vs. your budget', how: `Including usage fees: within budget ${WEIGHTS.budget} · up to 1.5× budget ${Math.round(WEIGHTS.budget / 2)} · price not published ${Math.round(WEIGHTS.budget / 3)} · above that 0.` },
    { label: 'Setup matches your comfort', max: WEIGHTS.effort, color: 'bg-[#6382b8]', short: 'Not harder than you want', how: 'Full points when setup effort is at or below the comfort level you chose.' },
  ]
  const total = parts.reduce((a, p) => a + p.max, 0)
  const promises: [typeof ShieldCheck, string, string][] = [
    [ShieldCheck, 'Nothing is for sale', 'No ads, no affiliate boosts, no “featured” spots.'],
    [Link2, 'We show our sources', 'Every price and connection links to where we found it.'],
    [HelpCircle, 'We say “not confirmed”', 'If we can’t find proof a tool connects, we tell you.'],
    [Calculator, 'No AI picks your tools', 'Plain keyword rules and the math on this page. Phone demos are scripted and labeled.'],
  ]
  return (
    <div className="fade-in">
      <DarkHero
        eyebrow="How we rank"
        title="Every tool gets the same score out of 100. Nothing is for sale."
        sub="The score comes from your answers. Here’s exactly how it adds up."
      >
        <div className="flex h-4 gap-1" role="img" aria-label={parts.map((p) => `${p.label} ${p.max} points`).join(', ')}>
          {parts.map((p) => (
            <span key={p.label} className={`${p.color} rounded-full`} style={{ width: `${(p.max / total) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {parts.map((p) => (
            <li key={p.label} className="rounded-2xl bg-white/[0.06] p-4">
              <span className="flex items-center gap-2">
                <span aria-hidden className={`h-3 w-3 rounded-full ${p.color}`} />
                <span className="font-display text-3xl tabular-nums">{p.max}</span>
                <span className="text-sm text-fog">pts</span>
              </span>
              <span className="mt-2 block font-semibold leading-snug">{p.label}</span>
              <span className="mt-1 block text-sm text-fog">{p.short}</span>
            </li>
          ))}
        </ul>
      </DarkHero>

      <section aria-labelledby="labels-h" className="mt-6 rounded-3xl border-2 border-ink bg-white p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Eyebrow>Read this first</Eyebrow>
            <h2 id="labels-h" className="mt-2 font-display text-3xl sm:text-4xl">What the connection labels mean</h2>
            <p className="mt-2 max-w-2xl text-ink-soft">Every tool shows one of these next to each app you use. It tells you whether the tool’s work lands in your software on its own.</p>
          </div>
          <p className="rounded-full bg-paper px-3.5 py-1.5 text-sm font-semibold">Example: <span className="text-ok">✓ Connects to Toast</span></p>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LABELS.map(({ icon: Icon, name, means, tone }) => (
            <li key={name} className="rounded-2xl bg-paper p-4">
              <span className={`grid h-10 w-10 place-items-center rounded-full ${tone}`}>
                <Icon size={20} strokeWidth={2.5} aria-hidden />
              </span>
              <p className="mt-3 font-semibold leading-snug">{name}</p>
              <p className="mt-1 text-[15px] leading-snug text-ink-soft">{means}</p>
            </li>
          ))}
        </ul>
        <p className="mt-5 flex items-center gap-2 text-[15px] font-medium">
          <ShieldCheck size={18} className="shrink-0 text-ok" aria-hidden /> A connection is green only when a vendor page or review we checked shows it.
        </p>
      </section>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {promises.map(([Icon, t, d]) => (
          <PromiseCard key={t} icon={<Icon size={20} aria-hidden />} title={t}>
            {d}
          </PromiseCard>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="font-display text-3xl">The three recipes</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(
            [
              ['Simple', 1, 'One easy tool for your first problem: the cheapest one that scores close to the best.', 'Lowest cost'],
              ['Balanced', 2, 'Covers as many of your problems as possible within your budget.', 'Within budget'],
              ['Stretch', 3, 'Covers more of your problems, up to twice your budget.', 'Up to 2× budget'],
            ] as const
          ).map(([n, level, d, cost]) => (
            <div key={n} className="rounded-3xl border border-black/[0.07] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-display text-2xl">{n}</p>
                <span className="flex gap-1" role="img" aria-label={`Coverage level ${level} of 3`}>
                  {[1, 2, 3].map((k) => (
                    <span key={k} className={`h-2 w-6 rounded-full ${k <= level ? 'bg-brand' : 'bg-black/10'}`} />
                  ))}
                </span>
              </div>
              <p className="mt-2 text-[15px] leading-snug text-ink-soft">{d}</p>
              <p className="mt-3 inline-flex rounded-full bg-paper px-3 py-1 text-sm font-semibold">{cost}</p>
            </div>
          ))}
        </div>
      </section>


      <section className="mt-10 space-y-3">
        <h2 className="font-display text-3xl">The details</h2>
        <More title="Exact points for each part of the score">
          <ul className="space-y-3">
            {parts.map((p) => (
              <li key={p.label}>
                <strong className="text-ink">
                  {p.label} ({p.max})
                </strong>
                : {p.how}
              </li>
            ))}
          </ul>
          <p className="text-sm">This is a ToolRecipe evaluation to help you compare, not a security certification.</p>
        </More>
        <More title="How recipes are put together">
          <p>If a tool only reaches your software through Zapier, we add Zapier’s cost to the total. Fees tied to your software (for example, Toast’s fee for MarginEdge) are added too.</p>
          <p>A recipe never has two tools doing the same job, and only solves problems you picked. Helpful extras show separately under “Also worth a look” and aren’t in your total.</p>
          <p>Tools with a published price come first. A price-by-quote tool is only used when no priced tool solves that problem.</p>
          <p>Each step up must cover more of your problems. If Balanced or Stretch would be the same as the one before, we show them as one card.</p>
          <p>Tools built into software you already use only appear when you’ve tapped that software.</p>
        </More>
        <More title="Fine print and usage fees">
          <p>Fine print notes are plain-English summaries of contracts, extra fees, and customer data from a vendor page or review. Every note links to its source.</p>
          <p>Usage fees are estimated from your business size: {(['solo', 'small', 'medium'] as const).map((k) => `${SIZE_LABEL[k]} ≈ ${USAGE_VOLUME.calls[k]} calls a month`).join(', ')}.</p>
        </More>
        <More title="Where the data comes from, and what’s simulated">
          <p>Prices were checked on {fmtDate(CHECKED)}; some come from third-party price trackers because vendors don’t publish them. After {STALE_DAYS} days a price is marked “needs re-check” and can’t be the Best start.</p>
          <p>Setup times are our estimates unless the vendor publishes one. Day-30 results say “Not enough check-ins yet” until real owners report back.</p>
          <p>The day preview is an estimate from your numbers. Your answers stay in your browser; nothing is sent to a server. “Something else” professions only see tools that work for any business.</p>
        </More>
        <More title="Your AI starting point">
          <p>Out of 100: software you already use (30), comfort with new apps (30), setup time (25), and budget room (15). It’s not a grade; it decides which recipe we suggest first and whether to point you to free setup help.</p>
        </More>
      </section>
    </div>
  )
}
