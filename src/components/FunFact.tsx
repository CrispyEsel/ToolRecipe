import { useState } from 'react'
import { ArrowUpRight, Lightbulb, RefreshCw } from 'lucide-react'
import { FACTS, factsFor } from '../data/facts'
import type { CategoryId } from '../types'

/**
 * One research fact, picked at random. On results, facts tied to the owner's
 * problem areas are picked first. "Show another fact" steps through the rest.
 */
export function FunFact({ where, cats = [], className = '', dark = false, feature = false }: { where: 'home' | 'results'; cats?: CategoryId[]; className?: string; dark?: boolean; feature?: boolean }) {
  const list = factsFor(where, cats)
  const relatedCount = list.filter((f) => f.cats?.some((c) => cats.includes(c))).length
  const [i, setI] = useState(() => Math.floor(Math.random() * (relatedCount || list.length)))
  const f = list[i % list.length] ?? FACTS[0]

  const label = (text: string) => (
    <p className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] ${dark ? 'text-fog' : 'text-ink-soft'}`}>
      <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-ink">
        <Lightbulb size={15} aria-hidden />
      </span>
      {text}
    </p>
  )

  // Source on the left, "Show another fact" on the right, always below the fact
  const footer = (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <a href={f.url} target="_blank" rel="noreferrer" className={`inline-block py-1.5 text-sm underline underline-offset-2 ${dark ? 'text-fog hover:text-white' : 'text-ink-soft hover:text-brand'}`}>
        {f.source}
        <ArrowUpRight size={14} aria-hidden className="ml-0.5 inline align-[-2px]" />
      </a>
      {list.length > 1 && (
        <button
          type="button"
          onClick={() => setI((n) => (n + 1) % list.length)}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border-[1.5px] px-3.5 text-sm font-semibold ${dark ? 'border-white/25 text-white hover:border-white' : 'border-black/15 text-ink hover:border-ink'}`}
        >
          <RefreshCw size={14} aria-hidden /> Show another fact
        </button>
      )}
    </div>
  )

  if (feature) {
    return (
      <figure className={`relative overflow-hidden rounded-3xl border border-black/[0.07] bg-white p-6 sm:p-8 ${className}`} aria-live="polite">
        <div aria-hidden className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative">{label('Did you know?')}</div>
        <div key={f.id} className="fade-in relative mt-4 grid gap-3 sm:grid-cols-[minmax(0,15rem)_1fr] sm:items-center sm:gap-8">
          <p className="font-display text-5xl leading-[0.95] text-brand sm:text-6xl">{f.stat}</p>
          <div>
            <p className="text-xl leading-snug">{f.text}</p>
            {f.tie && <p className="mt-2 text-ink-soft">{f.tie}</p>}
          </div>
        </div>
        <div className="relative">{footer}</div>
      </figure>
    )
  }

  return (
    <figure className={`rounded-3xl border p-5 ${dark ? 'border-white/15 bg-white/[0.06] text-white' : 'border-black/[0.07] bg-white'} ${className}`} aria-live="polite">
      {label('Worth knowing')}
      <blockquote key={f.id} className="fade-in mt-3 text-[17px] leading-snug">
        <strong className="font-display text-xl">{f.stat}</strong> {f.text}
        {f.tie && <span className={`mt-1.5 block text-[15px] ${dark ? 'text-fog' : 'text-ink-soft'}`}>{f.tie}</span>}
      </blockquote>
      <figcaption>{footer}</figcaption>
    </figure>
  )
}
