import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, ChevronDown, Clock, MessageSquareText, PhoneIncoming, Timer, Check, Lightbulb, Lock, Receipt, Scissors, Shapes, ShieldCheck, Trees, UtensilsCrossed, Wrench, type LucideIcon } from 'lucide-react'
import { BUSINESS_TYPES, businessLabel, isOther, problemsFor, wordingIndustry } from '../lib/business'
import { FunFact } from '../components/FunFact'
import { HeroStage, getSample } from '../components/SamplePreview'
import { Logo } from '../components/Logo'
import { CATEGORY_STYLE } from '../lib/categoryStyle'
import { ImageSlot } from '../components/ImageSlot'
import { fmtDate } from '../lib/format'
import { logProfession } from '../components/NeedForm'
import type { BusinessTypeId } from '../types'
import { CATEGORIES, CHECKED, EXAMPLES, INDUSTRIES, SYSTEMS, getTools, problemById, problemLabel } from '../lib/repo'
import { readText } from '../engine/match'
import { StackSnap } from '../components/StackSnap'
import { Button, Choice, Explain, Eyebrow, PromiseCard, Steps } from '../components/ui'
import type { Route } from '../state'
import type { Profile, SizeBand } from '../types'
import { SIZE_LABEL } from '../lib/config'
import { track } from '../lib/storage'

type Props = { profile: Profile; update: (p: Partial<Profile>) => void; go: (r: Route) => void }

function Nav({ back, next, nextLabel = 'Next', disabled }: { back?: () => void; next: () => void; nextLabel?: string; disabled?: boolean }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex items-center justify-between gap-3 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
      {back ? (
        <Button variant="ghost" size="sm" onClick={back} className="sm:text-base">
          <ArrowLeft size={18} aria-hidden /> Back
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={next} disabled={disabled} size="lg" className="whitespace-nowrap">
        {nextLabel} <ArrowRight size={18} aria-hidden />
      </Button>
    </div>
  )
}

/** Simple line icons instead of emoji, so every card looks like one design */


/** Quick-start buttons in the hero */
const QUICK_ICON: Record<string, LucideIcon> = { restaurant: UtensilsCrossed, hvac: Wrench, salon: Scissors, landscaping: Trees }
const QUICK_LABEL: Record<string, string> = { restaurant: 'Restaurant or Cafe', hvac: 'HVAC or Trades', salon: 'Salon or Barbershop', landscaping: 'Landscaping and Lawncare' }

/** Bento tiles on the home page */
const BENTO: Record<string, { area: string; quote: string; sys: string[]; bg: string }> = {
  restaurant: { area: 'lg:[grid-area:r]', quote: 'The phone rings nonstop during the lunch rush', sys: ['Toast', 'Square', 'Clover'], bg: 'bg-white' },
  hvac: { area: 'lg:[grid-area:h]', quote: 'I miss calls when I’m on a job', sys: ['Jobber', 'Housecall Pro'], bg: 'bg-accent-soft' },
  salon: { area: 'lg:[grid-area:s]', quote: 'Clients forget to rebook', sys: ['Vagaro', 'GlossGenius'], bg: 'bg-brand-soft' },
  landscaping: { area: 'lg:[grid-area:l]', quote: 'Quotes eat my evenings', sys: ['Jobber', 'QuickBooks'], bg: 'bg-[#e9efe4]' },
}

/** Photo strips on the smaller industry tiles (files in public/photos) */
const PHOTO: Record<string, string> = {
  hvac: 'An HVAC technician servicing an outdoor unit',
  salon: 'Barbers cutting clients’ hair in a busy barbershop',
  landscaping: 'A landscaping crew planting a garden bed',
}

const TRUST: [LucideIcon, string, string][] = [
  [ShieldCheck, 'No paid placement', 'Vendors can’t buy a better spot. Ever.'],
  [Receipt, 'Real monthly totals', 'Usage fees, connector apps and add-ons included.'],
  [BadgeCheck, 'Green means proven', '“Connects to” only when we found a source.'],
  [Lock, 'Your answers stay with you', 'Saved in your browser. No account, no sales calls.'],
]

/** Research band. Each figure was checked against the publisher's own release (Nov 7, 2026). */
const STATS: { n: string; text: string; src: string; url: string }[] = [
  {
    n: '93%',
    text: 'of small business owners using AI say it has had a positive impact on their business.',
    src: 'Goldman Sachs 10,000 Small Businesses Voices, March 2026',
    url: 'https://www.goldmansachs.com/pressroom/press-releases/2026/small-businesses-embrace-ai-but-need-training-and-support-to-fully-harness-it',
  },
  {
    n: '14%',
    text: 'say AI is fully built into their core operations.',
    src: 'Goldman Sachs 10,000 Small Businesses Voices, March 2026',
    url: 'https://www.goldmansachs.com/pressroom/press-releases/2026/small-businesses-embrace-ai-but-need-training-and-support-to-fully-harness-it',
  },
  {
    n: '73%',
    text: 'say more training and implementation help would let them put AI to work.',
    src: 'Goldman Sachs 10,000 Small Businesses Voices, March 2026',
    url: 'https://www.goldmansachs.com/pressroom/press-releases/2026/small-businesses-embrace-ai-but-need-training-and-support-to-fully-harness-it',
  },
]

export function Home({ profile, update, go }: Props) {
  const [otherOpen, setOtherOpen] = useState(!!profile.other)
  const [profession, setProfession] = useState(profile.other?.profession ?? '')
  const [type, setType] = useState<BusinessTypeId | null>(profile.other?.type ?? null)
  /** Starting your own answers after trying an example: drop the example's name and numbers */
  const fresh = profile.example ? { example: undefined, sim: undefined, businessName: undefined, freeText: '' } : {}
  const startOther = () => {
    const base = BUSINESS_TYPES.find((b) => b.id === type)!.base
    const same = profile.other?.type === type
    logProfession(profession.trim(), type!)
    update({
      ...fresh,
      industry: base,
      other: { profession: profession.trim(), type: type! },
      problems: same ? profile.problems : [],
      systems: same ? profile.systems : [],
      category: same ? profile.category : null,
    })
    go('problem')
  }
  const sample = useMemo(() => getSample(), [])
  const openExample = (p: Profile, from: string) => {
    update(p)
    track('example_opened', { example: p.businessName ?? 'example', from })
    go('results')
  }
  const toStart = () => document.getElementById('start')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const pickIndustry = (id: Profile['industry']) => {
    const same = profile.industry === id && !profile.other && !profile.example
    update({ ...fresh, industry: id, other: undefined, category: same ? profile.category : null, problems: same ? profile.problems : [], systems: same ? profile.systems : [] })
    go('problem')
  }

  return (
    <div className="fade-in">
      {/* Hero */}
      <section className="grid items-center gap-10 pb-8 pt-4 sm:pt-8 lg:grid-cols-2 lg:gap-14 lg:pb-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-sm font-medium">
            <span aria-hidden className="h-2 w-2 rounded-full bg-ok" /> Independent guide · vendors can’t pay for placement
          </span>
          <h1 className="mt-6 text-balance font-display text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[4.1rem]">Find AI tools that work with what you already use.</h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-soft sm:text-xl">
            Tell us what’s eating your week. We’ll show tools that fit your software, the real monthly cost, and a 30-day plan.
          </p>
          <div className="mt-8 rounded-3xl border border-black/[0.07] bg-white p-3 shadow-[0_2px_4px_rgb(0_0_0/0.04),0_16px_40px_rgb(0_0_0/0.08)] sm:p-4">
            <p className="px-2 pb-2 pt-1 text-base font-semibold"><span className="text-brand">Start here</span> — I run a…</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((i) => {
                const Icon = QUICK_ICON[i.id] ?? Shapes
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => pickIndustry(i.id)}
                    className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-black/10 bg-paper px-4 font-semibold transition hover:border-brand hover:bg-brand-soft"
                  >
                    <Icon size={18} className="text-brand" aria-hidden /> {QUICK_LABEL[i.id] ?? i.label}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => {
                  setOtherOpen(true)
                  toStart()
                }}
                className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-dashed border-black/25 px-4 font-semibold transition hover:border-brand"
              >
                <Shapes size={18} className="text-brand" aria-hidden /> Something else
              </button>
            </div>
          </div>
          {sample && (
            <button type="button" onClick={() => openExample(sample.profile, 'hero')} className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand hover:underline">
              Just looking? See a sample result <ArrowRight size={16} aria-hidden />
            </button>
          )}
          <p className="mt-6 text-sm text-ink-soft">{getTools().filter((t) => !t.connector).length} tools · every price and connection linked to a source · prices checked {fmtDate(CHECKED)}</p>
        </div>
        {sample && <HeroStage sample={sample} />}
      </section>

      {/* Step 1: pick a business type (bento) */}
      <section id="start" aria-labelledby="start-h" className="scroll-mt-24 py-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="start-h" className="mt-2 max-w-[18ch] font-display text-4xl leading-[1.05] sm:text-5xl">
              Built for businesses like yours
            </h2>
          </div>
          <p className="max-w-sm text-ink-soft">Tap yours. We’ll start with the problems owners like you mention most.</p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-4 lg:[grid-template-areas:'r_r_h_s''r_r_l_o']">
          {INDUSTRIES.map((i) => {
            const meta = BENTO[i.id]
            const big = i.id === 'restaurant'
            const on = profile.industry === i.id && !profile.other
            return (
              <button
                key={i.id}
                type="button"
                aria-pressed={on}
                onClick={() => pickIndustry(i.id)}
                className={`lift group flex flex-col justify-between gap-5 overflow-hidden rounded-3xl border-2 p-5 text-left sm:p-6 ${meta.area} ${on ? 'border-brand' : 'border-black/[0.06]'} ${meta.bg}`}
              >
                {big && (
                  <span className="block h-44 overflow-hidden rounded-2xl sm:h-60 lg:h-auto lg:min-h-64 lg:flex-1">
                    <ImageSlot id="industry-restaurant" label="A busy café counter at lunch" />
                  </span>
                )}
                {!big && PHOTO[i.id] && (
                  <span className="block h-28 overflow-hidden rounded-2xl">
                    <ImageSlot id={`industry-${i.id}`} label={PHOTO[i.id]} />
                  </span>
                )}
                <span className="flex flex-col gap-3">
                  <span className={`font-display leading-tight ${big ? 'text-3xl' : 'text-2xl'}`}>{i.label}</span>
                  <span className={`self-start rounded-xl bg-white/80 px-3.5 py-2 font-medium leading-snug ${big ? 'text-xl' : 'text-lg'}`}>“{meta.quote}”</span>
                </span>
                <span className="flex items-center justify-between gap-3 text-sm font-medium">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex shrink-0 -space-x-1.5">
                      {meta.sys.map((n) => (
                        <Logo key={n} name={n} size={26} className="ring-2 ring-white" />
                      ))}
                    </span>
                    <span className="min-w-0">Works with {meta.sys.join(', ')}</span>
                  </span>
                  <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white transition group-hover:bg-brand">
                    <ArrowRight size={18} />
                  </span>
                </span>
              </button>
            )
          })}
          <button
            type="button"
            aria-pressed={otherOpen || isOther(profile)}
            onClick={() => setOtherOpen(true)}
            className={`lift group flex flex-col justify-between gap-5 overflow-hidden rounded-3xl border-2 border-dashed p-5 text-left sm:p-6 lg:[grid-area:o] ${otherOpen || isOther(profile) ? 'border-brand bg-brand-soft' : 'border-black/20 bg-white'}`}
          >
            <span className="block h-28 overflow-hidden rounded-2xl">
              <ImageSlot id="industry-other" label="Two shopkeepers at the counter of a busy corner store" className="object-[50%_35%]" />
            </span>
            <span className="flex flex-col gap-3">
              <span className="font-display text-2xl leading-tight">Something else</span>
              <span className="text-[15px] text-ink-soft">Dentist, bakery, cleaning company, tutor…</span>
            </span>
            <span className="flex items-center justify-between gap-3 text-sm font-medium">
              <span>Tools that work for any business</span>
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[1.5px] border-ink transition group-hover:bg-ink group-hover:text-white">
                <ArrowRight size={18} />
              </span>
            </span>
          </button>
        </div>
      {otherOpen && (
        <form
          className="fade-in mt-4 rounded-3xl border-2 border-brand/40 bg-white p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault()
            if (profession.trim() && type) startOther()
          }}
        >
          <label className="block">
            <span className="font-semibold">What kind of business is it?</span>
            <input
              autoFocus
              value={profession}
              maxLength={60}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="e.g. dog grooming, bakery, house cleaning"
              className="mt-1 w-full rounded-xl border-2 border-line bg-white p-3 text-lg focus:border-brand focus:outline-none"
            />
          </label>
          <fieldset className="mt-4">
            <legend className="font-semibold">Which sounds most like it?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {BUSINESS_TYPES.map((b) => (
                <Choice key={b.id} selected={type === b.id} onClick={() => setType(b.id)}>
                  <span className="block font-semibold">{b.label}</span>
                  <span className="block text-sm text-ink-soft">For example: {b.examples}</span>
                </Choice>
              ))}
            </div>
          </fieldset>
          <p className="mt-3 text-sm text-ink-soft">
            We haven’t built a full profile for every profession yet. You’ll see tools that work for any business, and your answer tells us which profession to add next.
          </p>
          <div className="mt-4 flex justify-end">
            <Button type="submit" size="lg" disabled={!profession.trim() || !type}>
              Next <ArrowRight size={18} aria-hidden />
            </Button>
          </div>
        </form>
      )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
          <p className="text-sm font-semibold text-ink-soft">Just looking? Open an example:</p>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => openExample(ex.build(), 'chips')}
              className="lift min-h-11 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-sm hover:border-brand/50"
            >
              <span className="font-semibold">{ex.label}</span> <span className="text-ink-soft">· {ex.sub.split(' · ')[0]}</span>
            </button>
          ))}
        </div>
      </section>

      <FunFact where="home" feature className="mt-4" />

      {/* How it works, shown as the real screens in miniature */}
      <section aria-labelledby="steps-h" className="py-8 sm:py-10">
        <Eyebrow>How it works</Eyebrow>
        <h2 id="steps-h" className="mt-2 font-display text-4xl leading-[1.05] sm:text-5xl">
          Three steps. No jargon, no account.
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          <li className="flex flex-col gap-4 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.05)]">
            <StepHead n={1} title="Pick your problem" />
            <span className="flex items-center gap-2.5 rounded-2xl border-2 border-brand bg-brand-soft px-3.5 py-3 font-medium">
              <span className="grid h-5 w-5 place-items-center rounded-md bg-brand text-white">
                <Check size={13} strokeWidth={3.5} aria-hidden />
              </span>
              I miss calls during the rush
            </span>
            <span className="flex items-center gap-2.5 rounded-2xl border-[1.5px] border-black/15 px-3.5 py-3 font-medium">
              <span className="h-5 w-5 rounded-md border-2 border-black/30" />
              Reviews pile up and I can’t reply
            </span>
          </li>
          <li className="flex flex-col gap-4 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.05)]">
            <StepHead n={2} title="Tap your software" />
            <span className="grid grid-cols-2 gap-2">
              {[
                ['Toast', true],
                ['QuickBooks', true],
                ['Square', false],
                ['Clover', false],
              ].map(([name, on]) => (
                <span key={name as string} className={`flex items-center gap-2 rounded-2xl px-2.5 py-2.5 font-semibold ${on ? 'border-2 border-brand bg-brand-soft' : 'border-[1.5px] border-black/15'}`}>
                  <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs ${on ? 'bg-brand text-white' : 'bg-muted-soft text-ink-soft'}`}>
                    {on ? <Check size={14} strokeWidth={3} aria-hidden /> : (name as string).slice(0, 2)}
                  </span>
                  {name}
                </span>
              ))}
            </span>
          </li>
          <li className="flex flex-col gap-4 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_rgb(0_0_0/0.05)]">
            <StepHead n={3} title="Get a plan" />
            <span className="overflow-hidden rounded-2xl border-[1.5px] border-black/10">
              {[
                ['Day 1', 'Sign up for Hostie AI', 'done'],
                ['Day 3', 'Connect it to Toast', ''],
                ['Day 30', 'Is it working?', 'check'],
              ].map(([d, t, k]) => (
                <span key={d} className={`flex gap-3 border-b border-black/[0.06] px-3.5 py-2.5 last:border-0 ${k === 'check' ? 'bg-accent-soft' : ''}`}>
                  <span className="w-14 shrink-0 text-sm font-semibold tabular-nums text-ink-soft">{d}</span>
                  <span className={k === 'done' ? 'text-ink-soft line-through' : ''}>{t}</span>
                </span>
              ))}
            </span>
          </li>
        </ol>
      </section>

      {/* Trust strip */}
      <section aria-label="Why owners can trust ToolRecipe" className="pb-10 sm:pb-12">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(([Icon, title, text]) => (
            <PromiseCard key={title} icon={<Icon size={20} aria-hidden />} title={title}>
              {text}
            </PromiseCard>
          ))}
        </ul>
      </section>

      {/* Research */}
      <section aria-labelledby="why-h" className="band band-ink -mb-6 py-12 text-white sm:py-16">
        <Eyebrow dark>The research</Eyebrow>
        <h2 id="why-h" className="mt-3 max-w-[20ch] text-balance font-display text-4xl leading-[1.05] sm:text-5xl">
          The hard part isn’t the AI. It’s knowing what fits.
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {STATS.map((x) => (
            <figure key={x.n} className="border-t border-white/20 pt-5">
              <span className="font-display text-7xl tabular-nums leading-none sm:text-8xl [background:linear-gradient(transparent_80%,var(--color-accent)_80%,var(--color-accent)_90%,transparent_90%)]">
                {x.n}
              </span>
              <figcaption className="mt-4">
                <span className="block text-lg leading-snug text-fog">{x.text}</span>
                <a href={x.url} target="_blank" rel="noreferrer" className="mt-3 block text-sm text-fog underline underline-offset-2 hover:text-white">
                  {x.src}
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-10 text-xs text-fog/70">Survey of 1,256 owners in the Goldman Sachs 10,000 Small Businesses program, Jan 27 – Feb 4, 2026. Not a national sample.</p>
      </section>

    </div>
  )
}

function StepHead({ n, title }: { n: number; title: string }) {
  return (
    <span className="flex items-center gap-3">
      <span className={`grid h-9 w-9 place-items-center rounded-full font-display text-base ${n === 1 ? 'bg-brand text-white' : n === 2 ? 'bg-accent text-ink' : 'bg-ink text-white'}`}>{n}</span>
      <span className="font-display text-[1.35rem]">{title}</span>
    </span>
  )
}

/** Live summary beside the steps: the recipe fills in as you answer */
function RecipeSoFar({ profile }: { profile: Profile }) {
  const ind = INDUSTRIES.find((i) => i.id === profile.industry)
  const systems = profile.systems.filter((x) => x !== 'paper')
  const rows: [string, React.ReactNode, boolean][] = [
    ['Business', profile.other ? profile.other.profession : ind?.label ?? '—', !!profile.industry],
    [
      'Problems',
      profile.problems.length ? (
        <span className="flex flex-col gap-1">
          {profile.problems.map((id) => (
            <span key={id}>
              “{problemLabel(problemById(id)!, wordingIndustry(profile))}”
            </span>
          ))}
        </span>
      ) : (
        'Pick up to 3'
      ),
      profile.problems.length > 0,
    ],
    [
      'Software',
      systems.length ? (
        <span className="flex flex-wrap gap-1.5">
          {systems.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 py-0.5 pl-0.5 pr-2 text-sm">
              <Logo name={SYSTEMS.find((x) => x.id === id)?.label ?? id} size={20} />
              {SYSTEMS.find((x) => x.id === id)?.label.replace('Google Business Profile', 'Google listing')}
            </span>
          ))}
        </span>
      ) : profile.systems.includes('paper') ? (
        'Paper or nothing yet'
      ) : (
        '—'
      ),
      profile.systems.length > 0,
    ],
    ['Budget', profile.budgetSet ? (profile.budget === null ? 'No set budget' : `$${profile.budget}/mo`) : `Default: $${profile.budget ?? 150}/mo`, !!profile.budgetSet],
  ]
  const filled = rows.filter((r) => r[2]).length
  return (
    <aside className="sticky top-24 rounded-3xl bg-ink p-5 text-white" aria-label="Your recipe so far">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Your recipe so far</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${(filled / rows.length) * 100}%` }} />
      </div>
      <ul className="mt-4 space-y-3.5">
        {rows.map(([k, v, ok]) => (
          <li key={k} className="flex gap-3">
            <span aria-hidden className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${ok ? 'bg-accent text-ink' : 'bg-white/10 text-fog'}`}>
              {ok ? '✓' : ''}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-fog">{k}</p>
              <div className={`mt-0.5 text-[15px] leading-snug ${ok ? 'text-white' : 'text-fog'}`}>{v}</div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function StepLayout({ step, profile, children }: { step: number; profile: Profile; children: React.ReactNode }) {
  const ind = INDUSTRIES.find((i) => i.id === profile.industry)
  const sys = profile.systems.filter((x) => x !== 'paper').map((id) => SYSTEMS.find((x) => x.id === id)?.label.replace('Google Business Profile', 'Google listing') ?? id)
  const summary = [
    profile.other ? profile.other.profession : ind?.label,
    profile.problems.length ? `${profile.problems.length} problem${profile.problems.length > 1 ? 's' : ''}` : null,
    sys.length ? sys.slice(0, 2).join(', ') + (sys.length > 2 ? ` +${sys.length - 2}` : '') : null,
  ].filter(Boolean)
  return (
    <div className="fade-in">
      <Steps step={step} />
      {summary.length > 0 && (
        <p className="-mt-4 mb-6 text-center text-[15px] text-ink-soft lg:hidden" aria-label="Your answers so far">
          {summary.join(' · ')}
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <div className="min-w-0">{children}</div>
        <div className="hidden lg:block">
          <RecipeSoFar profile={profile} />
        </div>
      </div>
    </div>
  )
}

/** Old "Problem area" address: the area choice is now part of the problems screen */
export function CategoryStep(props: Props) {
  return <ProblemStep {...props} />
}

export function ProblemStep({ profile, update, go }: Props) {
  const inIndustry = problemsFor(profile)
  const groups = CATEGORIES.map((c) => ({ c, items: inIndustry.filter((p) => p.category === c.id) })).filter((g) => g.items.length)
  const insights = useMemo(() => readText(profile.freeText, profile.industry, profile.category), [profile.freeText, profile.industry, profile.category])
  const suggestions = insights.problemIds.filter((id) => !profile.problems.includes(id) && inIndustry.some((p) => p.id === id))

  const toggle = (id: string) => {
    const has = profile.problems.includes(id)
    if (!has && profile.problems.length >= 3) return
    const problems = has ? profile.problems.filter((x) => x !== id) : [...profile.problems, id]
    // The area is whatever the first pick belongs to; it only tunes wording and suggestions
    update({ problems, category: problems.length ? problemById(problems[0])?.category ?? null : null })
  }

  const chip = (id: string) => {
    const p = problemById(id)!
    const on = profile.problems.includes(id)
    const full = !on && profile.problems.length >= 3
    return (
      <button
        key={id}
        type="button"
        role="checkbox"
        aria-checked={on}
        aria-disabled={full}
        onClick={() => toggle(id)}
        className={`inline-flex min-h-12 items-center gap-2.5 rounded-2xl border-2 px-4 py-2 text-left font-medium transition ${on ? 'pop border-brand bg-brand-soft text-ink' : full ? 'border-line bg-white text-muted' : 'lift border-black/[0.06] bg-white hover:border-brand/50'}`}
      >
        <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${on ? 'bg-brand text-white' : 'border-2 border-black/25'}`}>
          {on && <Check size={15} strokeWidth={3.5} />}
        </span>
        {problemLabel(p, wordingIndustry(profile))}
      </button>
    )
  }

  return (
    <StepLayout step={1} profile={profile}>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">What’s eating your week?</h1>
      <p className="mt-3 text-lg text-ink-soft">Pick up to 3{profile.industry ? ` for your ${businessLabel(profile)}` : ''}. More than one lets us combine tools.</p>

      <div className="sticky top-16 z-10 -mx-4 mt-5 flex items-center gap-3 bg-paper/95 px-4 py-3 backdrop-blur" aria-live="polite">
        <span className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-2.5 w-8 rounded-full transition ${i < profile.problems.length ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </span>
        <span className="font-semibold text-ink-soft">{profile.problems.length} of 3 picked</span>
      </div>

      <div className="mt-2 space-y-3">
        {groups.map(({ c, items }) => {
          const st = CATEGORY_STYLE[c.id]
          const Icon = st.icon
          const picked = items.filter((p) => profile.problems.includes(p.id)).length
          return (
            <details key={c.id} open className="group rounded-3xl border border-black/[0.07] bg-white">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${st.tile}`}>
                  <Icon size={20} aria-hidden />
                </span>
                <h2 className="flex-1 font-display text-xl">{c.label}</h2>
                {picked > 0 && <span className="rounded-full bg-brand px-2.5 py-0.5 text-sm font-semibold text-white">{picked} picked</span>}
                <ChevronDown size={20} aria-hidden className="text-ink-soft transition group-open:rotate-180" />
              </summary>
              <div className="flex flex-wrap gap-2.5 px-5 pb-5">{items.map((p) => chip(p.id))}</div>
            </details>
          )
        })}
      </div>

      <div className="mt-6 rounded-3xl border border-black/[0.07] bg-white p-5 sm:p-6">
        <label htmlFor="freetext" className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquareText size={20} className="text-brand" aria-hidden /> Anything else? <span className="font-normal text-ink-soft">(optional)</span>
        </label>
        <p id="freetext-help" className="mt-1 text-ink-soft">It doesn’t change your picks. We use it to suggest problems you can tap to add, and any numbers (calls, hours) go into your day preview.</p>
        <textarea
          id="freetext"
          aria-describedby="freetext-help"
          rows={3}
          value={profile.freeText}
          onChange={(e) => update({ freeText: e.target.value })}
          className="mt-3 w-full rounded-2xl border-2 border-line bg-paper p-4 text-lg focus:border-brand focus:bg-white focus:outline-none"
          placeholder="e.g. “We miss about 20 calls every Friday night during the dinner rush.”"
        />
        {profile.freeText.trim().length > 3 && (
          <div aria-live="polite" className="fade-in mt-4 rounded-2xl bg-accent-soft p-4">
            <p className="flex items-center gap-2 font-semibold text-warn">
              <Lightbulb size={18} aria-hidden /> What we picked up
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {insights.callsMentioned !== null && <span className="pop inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[15px] font-medium"><PhoneIncoming size={15} aria-hidden /> About {insights.callsMentioned} calls or orders</span>}
              {insights.hoursMentioned !== null && <span className="pop inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[15px] font-medium"><Timer size={15} aria-hidden /> About {insights.hoursMentioned} hours</span>}
              {insights.when && <span className="pop inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[15px] font-medium"><Clock size={15} aria-hidden /> Mostly {insights.when}</span>}
              {insights.problemIds.length === 0 && <span className="text-[15px] text-ink-soft">Nothing matched yet. Try words like “calls,” “reviews,” or “schedule.”</span>}
            </div>
            {suggestions.length > 0 && (
              <div className="mt-3">
                <p className="font-semibold">Sounds like this too. Tap to add:</p>
                <div className="mt-2 flex flex-wrap gap-2">{suggestions.map((id) => chip(id))}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <Nav back={() => go('home')} next={() => go('profile')} disabled={profile.problems.length === 0} />
    </StepLayout>
  )
}

const BUDGET_CHIPS: (number | null)[] = [50, 100, 150, 250, null]
const COMFORT_LABEL = { 1: 'Set it up for me', 2: 'I can follow steps', 3: 'I’m handy' } as const
const TIME_LABEL = { 1: 'Under an hour', 2: 'A few hours', 3: 'A day or more' } as const
const CARE_LABEL = { 1: 'Normal', 2: 'Careful', 3: 'Very careful' } as const

export function ProfileStep({ profile, update, go }: Props) {
  const opt = <T extends string | number>(label: string, value: T, current: T, set: (v: T) => void, sub?: string) => (
    <Choice key={String(value)} selected={current === value} onClick={() => set(value)} className="flex-1">
      <span className="block font-semibold">{label}</span>
      {sub && <span className="block text-[15px] text-ink-soft">{sub}</span>}
    </Choice>
  )
  const assumed = `${SIZE_LABEL[profile.size]} · ${COMFORT_LABEL[profile.comfort]} · ${TIME_LABEL[profile.setupTime]} for setup · ${CARE_LABEL[profile.dataCare]} with customer info`
  const noSoftware = profile.systems.length === 0
  return (
    <StepLayout step={2} profile={profile}>
      <h1 className="font-display text-4xl leading-tight sm:text-5xl">What do you already use?</h1>
      <p className="mt-3 text-lg text-ink-soft">Tools that connect to your software are the easiest to keep using, so this matters most.</p>

      <section className="mt-6 rounded-3xl border border-black/[0.07] bg-white p-5 sm:p-6" aria-labelledby="q-software">
        <h2 id="q-software" className="text-xl font-semibold">
          Your software <span className="text-base font-normal text-ink-soft">(pick at least one)</span>
        </h2>
        <p className="mb-3 text-ink-soft">Tap everything you use. No software? Tap “Paper or nothing yet.”</p>
        <StackSnap general={isOther(profile)} industry={profile.industry} value={profile.systems} onChange={(systems) => update({ systems })} />
      </section>

      <section className="mt-5 rounded-3xl border border-black/[0.07] bg-white p-5 sm:p-6" aria-labelledby="q-budget">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="q-budget" className="text-xl font-semibold">
            Monthly budget for AI tools
          </h2>
          <span className="font-display text-3xl tabular-nums">{profile.budget === null ? 'Not sure' : `$${profile.budget}/mo`}</span>
        </div>
        {!profile.budgetSet && <p className="text-ink-soft">We assumed $150 a month. Change it if that’s off.</p>}
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Budget">
          {BUDGET_CHIPS.map((b) => {
            const on = profile.budget === b
            return (
              <button
                key={String(b)}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => update({ budget: b, budgetSet: true })}
                className={`min-h-12 rounded-2xl border-2 px-5 font-semibold transition ${on ? 'border-brand bg-brand-soft' : 'border-black/[0.08] bg-white hover:border-brand/50'}`}
              >
                {b === null ? 'Not sure' : `$${b}`}
              </button>
            )
          })}
        </div>
        <label className="mt-4 block text-[15px] font-medium text-ink-soft" htmlFor="budget-range">
          Or slide to any amount
        </label>
        <input
          id="budget-range"
          type="range"
          min={25}
          max={600}
          step={25}
          value={profile.budget ?? 150}
          onChange={(e) => update({ budget: Number(e.target.value), budgetSet: true })}
          className="range-lg mt-1 w-full"
        />
        <div className="flex justify-between text-[15px] text-ink-soft">
          <span>$25</span>
          <span>$600</span>
        </div>
      </section>

      <details className="group mt-5 rounded-3xl border border-black/[0.07] bg-white">
        <summary className="flex min-h-14 cursor-pointer list-none items-start gap-3 px-5 py-4 sm:px-6">
          <span className="flex-1">
            <span className="block text-xl font-semibold">Fine-tune <span className="text-base font-normal text-ink-soft">(optional)</span></span>
            <span className="mt-1 block text-[15px] text-ink-soft">We assumed: {assumed}.</span>
          </span>
          <ChevronDown size={22} aria-hidden className="mt-1 text-ink-soft transition group-open:rotate-180" />
        </summary>
        <div className="space-y-6 border-t border-black/[0.06] px-5 py-5 sm:px-6">
          <fieldset>
            <legend className="mb-2 font-semibold">How many people work here?</legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              {(['solo', 'small', 'medium'] as SizeBand[]).map((k) => opt(SIZE_LABEL[k], k, profile.size, (v) => update({ size: v as SizeBand })))}
            </div>
            <p className="mt-1 text-[15px] text-ink-soft">Used to estimate per-call and usage fees.</p>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold">How do you feel about setting up new apps?</legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              {opt('Set it up for me', 1, profile.comfort, (v) => update({ comfort: v as 1 }), 'I want done-for-you help')}
              {opt('I can follow steps', 2, profile.comfort, (v) => update({ comfort: v as 2 }), 'Point-and-click is fine')}
              {opt('I’m handy', 3, profile.comfort, (v) => update({ comfort: v as 3 }), 'I like tinkering with settings')}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-semibold">How much time can you give setup in the first week?</legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              {opt('Under an hour', 1, profile.setupTime, (v) => update({ setupTime: v as 1 }))}
              {opt('A few hours', 2, profile.setupTime, (v) => update({ setupTime: v as 2 }))}
              {opt('A day or more', 3, profile.setupTime, (v) => update({ setupTime: v as 3 }))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 font-semibold">How careful do you need to be with customer information?</legend>
            <Explain term="customer information">Names, phone numbers, addresses, card details, or anything customers tell you on the phone. AI tools may record or store it.</Explain>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              {opt('Normal', 1, profile.dataCare, (v) => update({ dataCare: v as 1 }), 'Names and phone numbers')}
              {opt('Careful', 2, profile.dataCare, (v) => update({ dataCare: v as 2 }), 'Addresses, home access')}
              {opt('Very careful', 3, profile.dataCare, (v) => update({ dataCare: v as 3 }), 'Health or payment details')}
            </div>
          </fieldset>
        </div>
      </details>

      {noSoftware && <p className="mt-4 text-center text-[15px] text-ink-soft sm:text-right">Pick at least one software (or “Paper or nothing yet”) to see your recipe.</p>}
      <Nav
        back={() => go('problem')}
        next={() => {
          track('profile_completed', { industry: profile.industry, problems: profile.problems, systems: profile.systems, size: profile.size })
          go('results')
        }}
        nextLabel="Show my recipe"
        disabled={profile.problems.length === 0 || noSoftware}
      />
    </StepLayout>
  )
}
