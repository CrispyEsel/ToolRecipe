import { Check } from 'lucide-react'
import { buildRecipes, recommendedKey, type Recipe } from '../engine/recipes'
import { readiness } from '../engine/readiness'
import { EXAMPLES, getTools, systemById } from '../lib/repo'
import type { Profile } from '../types'
import { ImageSlot } from './ImageSlot'
import { Logo } from './Logo'
import { hoursLabel } from '../lib/format'

/** A real result for one example business, built from the live catalog (not a mockup). */
export function getSample(): { profile: Profile; recipe: Recipe } | null {
  const ex = EXAMPLES.find((e) => e.id === 'restaurant')
  if (!ex) return null
  const profile = ex.build()
  const recipes = buildRecipes(getTools(), profile)
  const key = recommendedKey(readiness(profile).level, recipes)
  const recipe = recipes.find((r) => r.key === key) ?? recipes[0]
  return recipe ? { profile, recipe } : null
}

/**
 * Hero visual: a gold stage with a photo slot and floating cards showing what
 * a real result looks like for the Main Street Kitchen example.
 */
export function HeroStage({ sample }: { sample: { profile: Profile; recipe: Recipe } }) {
  const { profile, recipe } = sample
  const linked = recipe.items.flatMap((s) => s.badges.filter((b) => b.status === 'native').map((b) => ({ tool: s.tool.name, system: systemById(b.system)?.label ?? b.system })))[0]

  return (
    <div className="relative h-[560px] sm:h-[460px]" aria-label={`Sample result for ${profile.businessName}: ${recipe.items.map((s) => s.tool.name).join(' and ')}, $${recipe.knownTotal.toFixed(2)} a month`} role="img">
      <div aria-hidden className="absolute inset-y-9 left-[10%] right-0 rounded-[32px] bg-accent" />
      <div aria-hidden className="absolute right-[5%] top-[64px] h-[30%] w-[52%] overflow-hidden rounded-[22px] shadow-lg sm:h-[46%] sm:w-[42%]">
        <ImageSlot id="hero-owner" label="A café owner checking orders on a tablet at the counter" />
      </div>

      {linked && (
        <div aria-hidden className="absolute right-0 top-0 inline-flex items-center gap-2.5 rounded-full bg-white py-2 pl-2 pr-4 font-semibold shadow-[0_12px_30px_rgb(0_0_0/0.14)]">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-ok text-white">
            <Check size={16} strokeWidth={3} />
          </span>
          Works with {linked.system}
        </div>
      )}

      <div aria-hidden className="absolute left-0 top-[200px] w-[min(310px,86%)] rounded-[20px] bg-white p-5 shadow-[0_2px_4px_rgb(0_0_0/0.06),0_18px_40px_rgb(0_0_0/0.14)] sm:top-[120px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">Your recipe</span>
          <span className="rounded-full border-[1.5px] border-dashed border-ink-soft/60 px-2.5 py-0.5 text-xs font-semibold text-ink-soft">Sample</span>
        </div>
        <p className="mt-2 font-display text-xl leading-tight">Catch every call during the rush</p>
        <ul className="mt-3 space-y-1.5 text-sm">
          {recipe.items.map((s) => (
            <li key={s.tool.id} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 font-medium">
                <Logo name={s.tool.name} size={22} />
                {s.tool.name}
              </span>
              <span className="tabular-nums text-ink-soft">{s.tool.price === null ? 'quote' : s.tool.price === 0 ? 'included' : `$${s.tool.price}`}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-soft">
          {profile.businessName} · setup about {hoursLabel(recipe.setupHours)}
        </p>
      </div>

      <div aria-hidden className="absolute bottom-0 right-[4%] w-[min(250px,64%)] rounded-[20px] bg-white px-5 py-4 shadow-[0_18px_40px_rgb(0_0_0/0.16)]">
        <p className="font-display text-5xl tabular-nums leading-none">
          ${Math.round(recipe.knownTotal)}
          <span className="ml-1 text-lg font-semibold text-ink-soft">/mo</span>
        </p>
        <p className="mt-1.5 text-sm leading-snug text-ink-soft">Real monthly total, every fee we found</p>
      </div>
    </div>
  )
}
