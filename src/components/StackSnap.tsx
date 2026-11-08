import { Check } from 'lucide-react'
import { Logo } from './Logo'
import { systemsFor } from '../lib/business'
import { SYSTEMS } from '../lib/repo'
import type { IndustryId, SystemId } from '../types'

/**
 * Stack Snap: tap the software you already use. Results re-sort live.
 */
export function StackSnap({
  industry,
  general,
  value,
  onChange,
  compact,
}: {
  industry: IndustryId | null
  /** Only software any business might use (for "Something else") */
  general?: boolean
  value: SystemId[]
  onChange: (v: SystemId[]) => void
  compact?: boolean
}) {
  const allowed = systemsFor(industry, !!general)
  const list = SYSTEMS.filter((s) => allowed.includes(s.id))
  const toggle = (id: SystemId) => {
    if (id === 'paper') return onChange(value.includes('paper') ? [] : ['paper'])
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value.filter((x) => x !== 'paper'), id]
    onChange(next)
  }
  return (
    <div role="group" aria-label="Software you already use" className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {list.map((s) => {
        const on = value.includes(s.id)
        return (
          <button
            key={s.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(s.id)}
            className={`relative flex min-h-12 min-w-0 items-center gap-2 lift rounded-xl border-2 ${compact ? 'gap-1.5 px-1.5' : 'px-3'} py-2 text-left ${on ? 'border-brand bg-brand-soft' : 'border-black/[0.06] bg-white hover:border-brand/50'}`}
          >
            <Logo name={s.label} size={compact ? 26 : 34} />
            <span className={`${compact ? 'text-xs' : ''} min-w-0 pr-3 font-medium leading-tight`}>{compact ? s.label.replace('Google Business Profile', 'Google listing').replace('Gmail / Outlook calendar', 'Gmail / Outlook').replace('Instagram / Facebook', 'Instagram / FB').replace('Paper or nothing yet', 'Paper / none') : s.label}</span>
            {on && (
              <span aria-hidden className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-brand text-white">
                <Check size={10} strokeWidth={3.5} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
