import { Fragment, useMemo, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, CalendarDays, FolderOpen, Lightbulb, Phone, Scissors, Shapes, Star, Trees, UtensilsCrossed, Wallet, Wrench, type LucideIcon } from 'lucide-react'
import { BUSINESS_TYPES, businessLabel, isOther, problemsFor, wordingIndustry } from '../lib/business'
import { logProfession } from '../components/NeedForm'
import type { BusinessTypeId } from '../types'
import { CATEGORIES, EXAMPLES, INDUSTRIES, categoryById, getTools, problemById, problemLabel } from '../lib/repo'
import { readText } from '../engine/match'
import { StackSnap } from '../components/StackSnap'
import { Button, Choice, Explain, Steps } from '../components/ui'
import type { Route } from '../state'
import type { Profile, SizeBand } from '../types'
import { SIZE_LABEL } from '../lib/config'
import { track } from '../lib/storage'

type Props = { profile: Profile; update: (p: Partial<Profile>) => void; go: (r: Route) => void }

function Nav({ back, next, nextLabel = 'Next', disabled }: { back?: () => void; next: () => void; nextLabel?: string; disabled?: boolean }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex items-center justify-between gap-3 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
      {back ? (
        <Button variant="ghost" onClick={back}>
          <ArrowLeft size={18} aria-hidden /> Back
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={next} disabled={disabled} size="lg">
        {nextLabel} <ArrowRight size={18} aria-hidden />
      </Button>
    </div>
  )
}

/** Simple line icons instead of emoji, so every card looks like one design */
const INDUSTRY_ICON: Record<string, LucideIcon> = { restaurant: UtensilsCrossed, hvac: Wrench, salon: Scissors, landscaping: Trees }
const CATEGORY_ICON: Record<string, LucideIcon> = { phones: Phone, scheduling: CalendarDays, money: Wallet, marketing: Star, office: FolderOpen }

const HOW_IT_WORKS: [number, string, string][] = [
  [1, 'Your problem', 'Start with what eats your week, in your own words: missed calls, no-shows, slow estimates. Not software categories you’ve never heard of.'],
  [2, 'Your software', 'Tap what you already use, like Toast, Square, Jobber, or QuickBooks. Every tool is checked against it before we suggest it.'],
  [3, 'Your recipe', 'Two or three tools that work together, the real monthly cost with add-ons and hidden fees, and a 30-day plan to get started.'],
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
    go('category')
  }
  return (
    <div className="fade-in mx-auto max-w-5xl">
      <section className="pb-8 pt-6 text-center sm:pb-10 sm:pt-10">
        <h1 className="text-balance font-display text-4xl font-semibold leading-tight sm:text-5xl">What’s taking up your week?</h1>
        <p className="mx-auto mt-3 max-w-2xl text-balance text-lg text-ink-soft">
          Tell us what’s eating your time. We’ll find AI tools that fit the software you already use.
        </p>
        <div className="mx-auto mt-8 max-w-4xl rounded-2xl bg-ink p-5 text-left text-white sm:p-6">
          <ol className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-start">
            {HOW_IT_WORKS.map(([n, title, text], i) => (
              <Fragment key={title}>
                {i > 0 && (
                  <li aria-hidden className="flex justify-center text-accent lg:pt-7">
                    <ArrowDown size={22} className="lg:hidden" />
                    <ArrowRight size={22} className="hidden lg:block" />
                  </li>
                )}
                <li>
                  <p className="flex items-center gap-2 font-semibold text-accent">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-sm font-bold text-ink">{n}</span>
                    {title}
                  </p>
                  <p className="mt-2 text-white/85">{text}</p>
                </li>
              </Fragment>
            ))}
          </ol>
          <p className="mt-5 border-t border-white/15 pt-4 text-sm text-white/70">
            {getTools().filter((t) => !t.connector).length} tools so far, each checked against its own sources.
          </p>
        </div>
      </section>
      <p className="text-sm font-semibold text-ink-soft">Step 1 of 5</p>
      <h2 className="mb-4 mt-1 text-2xl font-semibold">First, what kind of business do you run?</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {INDUSTRIES.map((i) => {
          const Icon = INDUSTRY_ICON[i.id] ?? Shapes
          return (
            <Choice
              key={i.id}
              selected={profile.industry === i.id && !profile.other}
              onClick={() => {
                const same = profile.industry === i.id && !profile.other && !profile.example
                update({ ...fresh, industry: i.id, other: undefined, problems: same ? profile.problems : [], systems: same ? profile.systems : [] })
                go('category')
              }}
              className="flex items-start gap-3 lg:flex-col"
            >
              <Icon aria-hidden size={30} strokeWidth={1.75} className="shrink-0 text-brand" />
              <span>
                <span className="block text-lg font-semibold leading-snug">{i.label}</span>
                <span className="mt-1 block text-sm text-ink-soft">{i.blurb}</span>
              </span>
            </Choice>
          )
        })}
        <Choice selected={otherOpen || isOther(profile)} onClick={() => setOtherOpen(true)} className="flex items-start gap-3 border-dashed lg:flex-col">
          <Shapes aria-hidden size={30} strokeWidth={1.75} className="shrink-0 text-brand" />
          <span>
            <span className="block text-lg font-semibold leading-snug">Something else</span>
            <span className="mt-1 block text-sm text-ink-soft">Dentist, bakery, cleaning, tutor…</span>
          </span>
        </Choice>
      </div>
      {otherOpen && (
        <form
          className="fade-in mt-3 rounded-2xl border-2 border-brand/40 bg-white p-4 sm:p-5"
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
      <div className="mt-10 border-t border-line pt-6 text-center">
        <p className="text-sm font-semibold text-ink-soft">Just looking? Open an example business:</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => {
                update(ex.build())
                track('example_opened', { example: ex.id })
                go('results')
              }}
              className="min-h-11 rounded-xl border-2 border-line bg-white px-3 py-2 text-left text-sm hover:border-brand"
            >
              <span className="block font-semibold">{ex.label}</span>
              <span className="block text-xs text-ink-soft">{ex.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CategoryStep({ profile, update, go }: Props) {
  const allowed = problemsFor(profile)
  return (
    <div className="fade-in">
      <Steps step={1} />
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Where does your time go?</h1>
      <p className="mt-2 text-lg text-ink-soft">Pick the area that bugs you most{profile.industry ? ` at your ${businessLabel(profile)}` : ''}. You can add others next.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CATEGORIES.filter((c) => allowed.some((p) => p.category === c.id)).map((c) => (
          <Choice
            key={c.id}
            selected={profile.category === c.id}
            onClick={() => {
              update({ category: c.id })
              go('problem')
            }}
            className="flex items-center gap-4"
          >
            {(() => {
              const Icon = CATEGORY_ICON[c.id] ?? Shapes
              return <Icon aria-hidden size={28} strokeWidth={1.75} className="shrink-0 text-brand" />
            })()}
            <span>
              <span className="block text-lg font-semibold">{c.label}</span>
              <span className="block text-ink-soft">{c.blurb}</span>
            </span>
          </Choice>
        ))}
      </div>
      <Nav back={() => go('home')} next={() => go('problem')} disabled={!profile.category} />
    </div>
  )
}

export function ProblemStep({ profile, update, go }: Props) {
  const cat = categoryById(profile.category)
  const inIndustry = problemsFor(profile)
  const main = inIndustry.filter((p) => p.category === profile.category)
  const others = inIndustry.filter((p) => p.category !== profile.category)
  const insights = useMemo(() => readText(profile.freeText, profile.industry, profile.category), [profile.freeText, profile.industry, profile.category])
  const suggestions = insights.problemIds.filter((id) => !profile.problems.includes(id) && inIndustry.some((p) => p.id === id))

  const toggle = (id: string) => {
    const has = profile.problems.includes(id)
    if (!has && profile.problems.length >= 3) return
    update({ problems: has ? profile.problems.filter((x) => x !== id) : [...profile.problems, id] })
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
        className={`min-h-12 rounded-xl border-2 px-4 py-2 text-left font-medium transition ${on ? 'border-brand bg-brand text-white' : full ? 'border-line bg-white text-muted' : 'border-line bg-white hover:border-brand'}`}
      >
        {problemLabel(p, wordingIndustry(profile))}
      </button>
    )
  }

  return (
    <div className="fade-in">
      <Steps step={2} />
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">
        {cat?.label}: what’s happening?
      </h1>
      <p className="mt-2 text-lg text-ink-soft">Tap what sounds like you. Pick up to 3 problems. More than one lets us combine tools.</p>
      <div className="mt-6 flex flex-wrap gap-2">{main.map((p) => chip(p.id))}</div>

      <div className="mt-8">
        <label htmlFor="freetext" className="text-lg font-semibold">
          Tell us in your own words <span className="font-normal text-ink-soft">(optional)</span>
        </label>
        <p className="text-ink-soft">For example: “We miss about 20 calls every Friday night during dinner rush.”</p>
        <textarea
          id="freetext"
          rows={3}
          value={profile.freeText}
          onChange={(e) => update({ freeText: e.target.value })}
          className="mt-2 w-full rounded-xl border-2 border-line bg-white p-3 text-lg focus:border-brand focus:outline-none"
          placeholder="What eats your time?"
        />
        {profile.freeText.trim().length > 3 && (
          <div aria-live="polite" className="fade-in mt-3 rounded-xl bg-accent-soft p-4">
            <p className="flex items-center gap-2 font-semibold text-warn">
              <Lightbulb size={18} aria-hidden /> What we picked up
            </p>
            <ul className="mt-1 text-ink-soft">
              {insights.callsMentioned !== null && <li>• About {insights.callsMentioned} calls or orders. We’ll use this in your day preview.</li>}
              {insights.hoursMentioned !== null && <li>• About {insights.hoursMentioned} hours. We’ll use this in your day preview.</li>}
              {insights.when && <li>• It happens mostly during {insights.when}.</li>}
              {insights.problemIds.length === 0 && <li>• Nothing matched yet. Try words like “calls,” “reviews,” or “schedule.”</li>}
            </ul>
            {suggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold">Sounds like this too. Tap to add:</p>
                <div className="mt-2 flex flex-wrap gap-2">{suggestions.map((id) => chip(id))}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <details className="mt-8 rounded-xl border border-line bg-white p-4">
        <summary className="cursor-pointer font-semibold">Add a problem from another area</summary>
        <div className="mt-3 flex flex-wrap gap-2">{others.map((p) => chip(p.id))}</div>
      </details>

      <p className="mt-4 text-sm text-ink-soft" aria-live="polite">
        {profile.problems.length}/3 selected
      </p>
      <Nav back={() => go('category')} next={() => go('profile')} disabled={profile.problems.length === 0} />
    </div>
  )
}

export function ProfileStep({ profile, update, go }: Props) {
  const opt = <T extends string | number>(label: string, value: T, current: T, set: (v: T) => void, sub?: string) => (
    <Choice key={String(value)} selected={current === value} onClick={() => set(value)} className="flex-1">
      <span className="block font-semibold">{label}</span>
      {sub && <span className="block text-sm text-ink-soft">{sub}</span>}
    </Choice>
  )
  return (
    <div className="fade-in">
      <Steps step={3} />
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">Your AI starting point</h1>
      <p className="mt-2 text-lg text-ink-soft">Five quick questions. There are no wrong answers. They decide which tools fit and how much setup help to suggest.</p>

      <section className="mt-8" aria-labelledby="q0">
        <h2 id="q0" className="mb-3 text-xl font-semibold">
          How many people work here?
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(['solo', 'small', 'medium'] as SizeBand[]).map((k) => opt(SIZE_LABEL[k], k, profile.size, (v) => update({ size: v as SizeBand })))}
        </div>
        <p className="mt-1 text-sm text-ink-soft">We use this to estimate per-call and usage fees.</p>
      </section>

      <section className="mt-8" aria-labelledby="q1">
        <h2 id="q1" className="text-xl font-semibold">
          1. Tap the software you already use
        </h2>
        <p className="mb-3 text-ink-soft">This is the most important question: tools that connect to what you have are easier to adopt.</p>
        <StackSnap general={isOther(profile)} industry={profile.industry} value={profile.systems} onChange={(systems) => update({ systems })} />
      </section>

      <section className="mt-8" aria-labelledby="q2">
        <h2 id="q2" className="mb-3 text-xl font-semibold">
          2. How do you feel about setting up new apps?
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          {opt('Set it up for me', 1, profile.comfort, (v) => update({ comfort: v as 1 }), 'I want done-for-you help')}
          {opt('I can follow steps', 2, profile.comfort, (v) => update({ comfort: v as 2 }), 'Point-and-click is fine')}
          {opt('I’m handy', 3, profile.comfort, (v) => update({ comfort: v as 3 }), 'I like tinkering with settings')}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="q3">
        <h2 id="q3" className="text-xl font-semibold">
          3. Monthly budget for AI tools
        </h2>
        <div className="mt-3 rounded-2xl border border-line bg-white p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold">{profile.budget === null ? 'No set budget' : `$${profile.budget}/mo`}</span>
            <label className="flex items-center gap-2 text-ink-soft">
              <input type="checkbox" className="h-5 w-5" checked={profile.budget === null} onChange={(e) => update({ budget: e.target.checked ? null : 150 })} />
              I’m not sure
            </label>
          </div>
          <input
            type="range"
            min={25}
            max={600}
            step={25}
            value={profile.budget ?? 150}
            disabled={profile.budget === null}
            onChange={(e) => update({ budget: Number(e.target.value) })}
            aria-label="Monthly budget in dollars"
            className="mt-3 w-full"
          />
          <div className="flex justify-between text-sm text-muted">
            <span>$25</span>
            <span>$600</span>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="q4">
        <h2 id="q4" className="mb-3 text-xl font-semibold">
          4. How much time can you give setup in the first week?
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          {opt('Under an hour', 1, profile.setupTime, (v) => update({ setupTime: v as 1 }))}
          {opt('A few hours', 2, profile.setupTime, (v) => update({ setupTime: v as 2 }))}
          {opt('A day or more', 3, profile.setupTime, (v) => update({ setupTime: v as 3 }))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="q5">
        <h2 id="q5" className="mb-1 text-xl font-semibold">
          5. How careful do you need to be with customer information?
        </h2>
        <Explain term="customer information">Names, phone numbers, addresses, card details, or anything customers tell you on the phone. AI tools may record or store it.</Explain>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {opt('Normal', 1, profile.dataCare, (v) => update({ dataCare: v as 1 }), 'Names and phone numbers')}
          {opt('Careful', 2, profile.dataCare, (v) => update({ dataCare: v as 2 }), 'Addresses, home access')}
          {opt('Very careful', 3, profile.dataCare, (v) => update({ dataCare: v as 3 }), 'Health or payment details')}
        </div>
      </section>

      <Nav
        back={() => go('problem')}
        next={() => {
          track('profile_completed', { industry: profile.industry, problems: profile.problems, systems: profile.systems, size: profile.size })
          go('results')
        }}
        nextLabel="Show my ToolRecipe"
        disabled={profile.problems.length === 0}
      />
    </div>
  )
}
