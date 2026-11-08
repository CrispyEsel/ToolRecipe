import { useId, useState, type ReactNode } from 'react'
import { HelpCircle, X } from 'lucide-react'
import type { BadgeStatus } from '../engine/recipes'
import { systemById } from '../lib/repo'
import type { SystemId } from '../types'

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  className = '',
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent'
  size?: 'md' | 'lg' | 'sm'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  ariaLabel?: string
}) {
  const v = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    accent: 'bg-accent text-ink hover:brightness-95',
    secondary: 'bg-white text-ink border-[1.5px] border-black/15 hover:border-ink',
    ghost: 'text-brand hover:bg-brand-soft',
  }[variant]
  const s = { sm: 'min-h-10 px-4 text-sm', md: 'min-h-12 px-6', lg: 'min-h-14 px-5 text-lg sm:px-8' }[size]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${v} ${s} ${className}`}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>) {
  return (
    <div {...rest} className={`rounded-3xl border border-black/[0.07] bg-card ${className}`}>
      {children}
    </div>
  )
}

const BADGE: Record<BadgeStatus, { cls: string; dot: string; text: (s: string) => string; help: string }> = {
  native: {
    cls: 'bg-ok-soft text-ok',
    dot: 'bg-ok',
    text: (s) => `Connects to ${s}`,
    help: 'A source we checked documents a direct connection.',
  },
  zapier: {
    cls: 'bg-warn-soft text-warn',
    dot: 'bg-accent',
    text: (s) => `Via Zapier to ${s}`,
    help: 'Works through Zapier, a connector app with its own monthly cost. We add it to the total.',
  },
  none: { cls: 'bg-bad-soft text-bad', dot: 'bg-bad', text: (s) => `Doesn’t connect to ${s}`, help: 'Documented as not connecting.' },
  alongside: {
    cls: 'bg-info-soft text-info',
    dot: 'bg-info',
    text: (s) => `Works alongside ${s}`,
    help: 'Works on its own (for example, by forwarding calls). Nothing is sent into this system automatically.',
  },
  unknown: {
    cls: 'bg-muted-soft text-muted',
    dot: 'bg-muted',
    text: (s) => `${s}: not confirmed`,
    help: 'We could not find a source confirming a connection. Ask the vendor.',
  },
}

export function CompatBadge({ system, status, compact }: { system: SystemId; status: BadgeStatus; compact?: boolean }) {
  const b = BADGE[status]
  const label = systemById(system)?.label ?? system
  return (
    <span title={b.help} className={`pop inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${b.cls}`}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${b.dot}`} />
      {compact ? label : b.text(label)}
      <span className="sr-only">. {b.help}</span>
    </span>
  )
}

const LINE: Record<BadgeStatus, { cls: string; mark: string }> = {
  native: { cls: 'text-ok', mark: '✓' },
  zapier: { cls: 'text-warn', mark: '↔' },
  none: { cls: 'text-bad', mark: '✕' },
  alongside: { cls: 'text-ink-soft', mark: '–' },
  unknown: { cls: 'text-muted', mark: '?' },
}

/** Compatibility as a plain line of text ("✓ Connects to Toast"), no pill */
export function CompatLine({ system, status }: { system: SystemId; status: BadgeStatus }) {
  const b = BADGE[status]
  const l = LINE[status]
  const label = systemById(system)?.label ?? system
  return (
    <span title={b.help} className={`inline-flex items-baseline gap-1.5 text-sm font-medium ${l.cls}`}>
      <span aria-hidden className="w-3 text-center font-bold">
        {l.mark}
      </span>
      {b.text(label)}
      <span className="sr-only">. {b.help}</span>
    </span>
  )
}

export function BadgeLegend() {
  return (
    <ul className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
      {(Object.keys(BADGE) as BadgeStatus[]).map((k) => (
        <li key={k} className={`flex items-baseline gap-1.5 font-medium ${LINE[k].cls}`}>
          <span aria-hidden className="w-3 text-center font-bold">
            {LINE[k].mark}
          </span>
          {{ native: 'Connects directly', zapier: 'Through Zapier (extra cost)', none: 'Doesn’t connect', alongside: 'Works alongside, nothing sent automatically', unknown: 'Not confirmed: ask the vendor' }[k]}
        </li>
      ))}
    </ul>
  )
}

export function Explain({ term, children }: { term: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-sm text-brand underline decoration-dotted underline-offset-4"
      >
        <HelpCircle size={16} aria-hidden /> What does “{term}” mean?
      </button>
      {open && (
        <span id={id} role="note" className="fade-in absolute left-0 top-8 z-30 w-72 rounded-xl border border-line bg-white p-3 text-sm text-ink shadow-lg">
          {children}
        </span>
      )}
    </span>
  )
}

export function Steps({ step }: { step: number }) {
  const labels = ['Your business', 'Your problems', 'Your software']
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-start">
        {labels.map((l, i) => {
          const done = i < step
          const now = i === step
          return (
            <li key={l} className="relative flex flex-1 flex-col items-center gap-2 text-center">
              {i > 0 && <span aria-hidden className={`absolute right-1/2 top-4 h-[3px] w-full -translate-y-1/2 ${i <= step ? 'bg-brand' : 'bg-line'}`} />}
              <span
                aria-current={now ? 'step' : undefined}
                className={`relative z-10 grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition ${done ? 'bg-brand text-white' : now ? 'bg-white text-brand ring-[3px] ring-brand' : 'bg-white text-muted ring-2 ring-line'}`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`hidden text-[15px] sm:block ${now ? 'font-semibold text-ink' : 'text-ink-soft'}`}>{l}</span>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 text-center text-sm font-semibold text-ink-soft sm:hidden">
        {step < labels.length ? `Step ${step + 1} of ${labels.length} · ${labels[step]}` : 'All set'}
      </p>
    </nav>
  )
}

export function ScoreRing({ score, size = 72, label }: { score: number; size?: number; label?: string }) {
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  const color = score >= 75 ? 'var(--color-ok)' : score >= 50 ? 'var(--color-gold-dark)' : 'var(--color-muted)'
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label ?? 'Score'} ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-line)" strokeWidth="8" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="8" fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} strokeLinecap="round" />
      </svg>
      <span className="absolute text-lg font-bold">{score}</span>
    </div>
  )
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <button aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="fade-in relative h-full w-full max-w-xl overflow-y-auto bg-paper p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} autoFocus className="rounded-lg p-2 hover:bg-line" aria-label="Close details">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Choice({
  selected,
  onClick,
  children,
  className = '',
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onClick}
      className={`lift rounded-2xl border-2 p-4 text-left ${selected ? 'border-brand bg-brand-soft' : 'border-black/[0.06] bg-white hover:border-brand/50'} ${className}`}
    >
      {children}
    </button>
  )
}

/** Small label above a heading, e.g. "HOW IT WORKS" */
export function Eyebrow({ children, className = '', dark = false }: { children: ReactNode; className?: string; dark?: boolean }) {
  return <p className={`text-xs font-bold uppercase tracking-[0.14em] ${dark ? 'text-accent' : 'text-brand'} ${className}`}>{children}</p>
}

/** Icon in a soft red square, used on clickable cards */
export function IconTile({ children, size = 'md' }: { children: ReactNode; size?: 'sm' | 'md' }) {
  return <span className={`grid shrink-0 place-items-center rounded-xl bg-brand-soft text-brand ${size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'}`}>{children}</span>
}

export function money(n: number): string {
  return n % 1 === 0 ? `$${n.toLocaleString()}` : `$${n.toFixed(2)}`
}

/**
 * Dark page header with red and gold glows. Same look as the results page,
 * so every main page opens the same way.
 */
export function DarkHero({
  eyebrow,
  title,
  sub,
  action,
  children,
}: {
  eyebrow: ReactNode
  title: ReactNode
  sub?: ReactNode
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#4a72b3]/50 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 right-1/4 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <Eyebrow dark>{eyebrow}</Eyebrow>
          <h1 className="mt-2 text-balance font-display text-4xl leading-tight sm:text-5xl">{title}</h1>
          {sub && <p className="mt-3 text-lg text-fog">{sub}</p>}
        </div>
        {action}
      </div>
      {children && <div className="relative mt-6 border-t border-white/15 pt-6">{children}</div>}
    </section>
  )
}

/** Big gold number on a dark header, like "What it may be costing you now". */
export function HeroStat({ value, label, gold = false }: { value: ReactNode; label: ReactNode; gold?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={`font-display text-4xl tabular-nums leading-none sm:text-5xl ${gold ? 'text-accent' : 'text-white'}`}>{value}</p>
      <p className="mt-2 text-sm leading-snug text-fog">{label}</p>
    </div>
  )
}

/** A promise we want owners to notice: navy icon badge, gold top edge, bold title. */
export function PromiseCard({ icon, title, children, row = false }: { icon: ReactNode; title: string; children: ReactNode; row?: boolean }) {
  return (
    <li className={`lift relative overflow-hidden rounded-3xl border border-black/[0.07] bg-white p-5 pt-6 ${row ? 'flex items-start gap-4' : ''}`}>
      <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-accent" />
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-accent shadow-[0_4px_12px_rgb(36_64_107/0.25)]">{icon}</span>
      <span className={`block ${row ? '' : 'mt-4'}`}>
        <strong className="block font-display text-xl leading-tight">{title}</strong>
        <span className="mt-1.5 block text-[15px] leading-snug text-ink-soft">{children}</span>
      </span>
    </li>
  )
}
