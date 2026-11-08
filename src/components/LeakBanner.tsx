import { TrendingDown } from 'lucide-react'
import { wordingIndustry } from '../lib/business'
import { leakEstimate } from '../engine/simulate'
import { problemById, problemLabel } from '../lib/repo'
import type { Route } from '../state'
import type { Profile } from '../types'
import { money } from './ui'
import { useCountUpFromZero } from '../lib/useCountUp'

/**
 * Money-leak finder: what the owner's problems may cost today, before any
 * tool. Uses the same numbers as "Preview my day", so editing them there
 * updates this line too.
 */
export function LeakBanner({ profile, go, dark = false }: { profile: Profile; go: (r: Route) => void; dark?: boolean }) {
  const leak = leakEstimate(profile)
  const shown = useCountUpFromZero(leak ? Math.round(leak.monthly / 10) * 10 : 0, 900)
  if (!leak) return null
  const timeTasks = profile.problems
    .map((id) => problemById(id))
    .filter((p) => p?.measure === 'hours')
    .map((p) => p!.noun ?? problemLabel(p!, wordingIndustry(profile)).toLowerCase())
  const what = [leak.callMonthly > 0 ? 'Missed calls' : null, timeTasks.length ? `time spent on ${timeTasks.join(' and ')}` : null]
    .filter(Boolean)
    .join(', plus ')
  const lead = what.charAt(0).toUpperCase() + what.slice(1)

  if (dark) {
    return (
      <div className="mt-6 flex flex-col gap-4 border-t border-white/15 pt-6 sm:flex-row sm:items-end sm:justify-between" role="note" aria-label="Money-leak estimate">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fog">What it may be costing you now</p>
          <p className="mt-1 font-display text-4xl tabular-nums leading-none text-accent sm:text-5xl">
            <span aria-hidden>{money(Math.round(shown))}</span>
            <span className="sr-only">{money(Math.round(leak.monthly / 10) * 10)}</span>
            <span className="ml-1 font-sans text-lg font-normal text-fog">a month</span>
          </p>
          <p className="mt-2 max-w-2xl text-sm text-fog">
            {lead}, based on {leak.basis.join('; and ')}.{' '}
            {profile.example ? 'These are the example business’s numbers.' : leak.usingDefaults ? 'These are starting guesses.' : 'Using your numbers.'}
          </p>
        </div>
        <button onClick={() => go('day')} className="shrink-0 self-start text-sm font-semibold text-white underline underline-offset-4 hover:text-accent sm:self-end">
          {leak.usingDefaults || profile.example ? 'Change the numbers' : 'See the math'} →
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-line border-l-4 border-l-brand bg-white p-4 sm:p-5" role="note" aria-label="Money-leak estimate">
      <div className="flex items-start gap-3">
        <TrendingDown className="mt-1 shrink-0 text-brand" size={24} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-lg leading-snug">
            {lead} may be costing you about <strong className="text-brand">{money(Math.round(leak.monthly / 10) * 10)} a month</strong>.
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Based on {leak.basis.join('; and ')}.{' '}
            {profile.example ? 'These are the example business’s numbers.' : leak.usingDefaults ? 'These are starting guesses: put in your own to make it yours.' : 'Using your numbers.'}
          </p>
          <button onClick={() => go('day')} className="mt-2 text-sm font-semibold text-brand underline underline-offset-2 hover:no-underline">
            {leak.usingDefaults || profile.example ? 'Change the numbers' : 'See the math'} in Preview my day →
          </button>
        </div>
      </div>
    </div>
  )
}
