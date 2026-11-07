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
    primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm',
    accent: 'bg-accent text-ink hover:brightness-95 shadow-sm',
    secondary: 'bg-white text-ink border-2 border-line hover:border-brand',
    ghost: 'text-brand hover:bg-brand-soft',
  }[variant]
  const s = { sm: 'min-h-10 px-3 text-sm', md: 'min-h-12 px-5', lg: 'min-h-14 px-7 text-lg' }[size]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${v} ${s} ${className}`}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card ${className}`}>{children}</div>
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
    <div className="flex flex-wrap gap-2 text-sm">
      {(Object.keys(BADGE) as BadgeStatus[]).map((k) => (
        <span key={k} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${BADGE[k].cls}`}>
          <span aria-hidden className={`h-2 w-2 rounded-full ${BADGE[k].dot}`} />
          {{ native: 'Connects directly', zapier: 'Via Zapier (+cost)', none: 'Doesn’t connect', alongside: 'Works alongside', unknown: 'Not confirmed' }[k]}
        </span>
      ))}
    </div>
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
  const labels = ['Your business', 'Problem area', 'Your words', 'Your setup', 'Your ToolRecipe']
  return (
    <nav aria-label="Progress" className="mb-6">
      <ol className="flex items-center gap-2">
        {labels.map((l, i) => (
          <li key={l} className="flex flex-1 flex-col gap-1">
            <span className={`h-2 rounded-full ${i <= step ? 'bg-brand' : 'bg-line'}`} />
            <span className={`hidden text-xs sm:block ${i === step ? 'font-semibold text-ink' : 'text-muted'}`} aria-current={i === step ? 'step' : undefined}>
              {l}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-muted sm:hidden">
        Step {step + 1} of 5: {labels[step]}
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
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
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
      className={`rounded-2xl border-2 p-4 text-left transition ${selected ? 'border-brand bg-brand-soft' : 'border-line bg-white hover:border-brand/60'} ${className}`}
    >
      {children}
    </button>
  )
}

export function money(n: number): string {
  return n % 1 === 0 ? `$${n.toLocaleString()}` : `$${n.toFixed(2)}`
}
