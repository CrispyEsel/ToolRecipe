import { CalendarClock, Check, Plus } from 'lucide-react'
import { wordingIndustry } from '../lib/business'
import { getSeasons, problemById, problemLabel } from '../lib/repo'
import { track } from '../lib/storage'
import type { Profile } from '../types'

/**
 * "Coming up" cards: seasonal crunches for the owner's industry, each tied to
 * a problem in the catalog so it can be added to the recipe in one tap.
 */
export function SeasonCards({
  profile,
  update,
  onAdded,
  compact = false,
  date,
}: {
  profile: Profile
  update: (p: Partial<Profile>) => void
  onAdded?: () => void
  compact?: boolean
  date?: Date
}) {
  // Seasons are written per industry, so professions we haven't added yet don't get them
  const seasons = profile.other ? [] : getSeasons(profile.industry, date)
  if (!seasons.length) return null

  const add = (problem: string, season: string) => {
    update({ problems: [...profile.problems, problem] })
    track('season_added', { season, problem })
    onAdded?.()
  }

  return (
    <section aria-label="Coming up for your business" className={compact ? 'space-y-3' : 'space-y-3'}>
      <p className="flex items-center gap-2 font-semibold">
        <CalendarClock size={18} aria-hidden className="text-brand" /> Coming up for you
      </p>
      <div className={compact ? 'space-y-3' : 'grid gap-3 sm:grid-cols-2'}>
        {seasons.map((s) => {
          const prob = problemById(s.problem)
          if (!prob) return null
          const label = problemLabel(prob, wordingIndustry(profile))
          const have = profile.problems.includes(s.problem)
          const full = !have && profile.problems.length >= 3
          return (
            <div key={s.id} className="rounded-xl border border-line border-l-4 border-l-accent bg-white p-4">
              <p className="font-semibold">
                {s.title}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{s.why}</p>
              <p className="mt-2 text-sm">
                Watch for: <strong>“{label}”</strong>
              </p>
              {have ? (
                <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ok">
                  <Check size={16} aria-hidden /> Already in your recipe
                </p>
              ) : full ? (
                <p className="mt-2 text-sm text-ink-soft">You’ve picked 3 problems. Swap one in “Change answers” to plan for this.</p>
              ) : (
                <button
                  onClick={() => add(s.problem, s.id)}
                  className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg border-2 border-ink bg-white px-3 py-2 text-sm font-semibold hover:bg-ink hover:text-white"
                >
                  <Plus size={16} aria-hidden /> Show me tools for this
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
