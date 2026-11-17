/**
 * Professions we haven't added yet. An owner who picks "Something else" types
 * their profession and the closest business type. Under the hood they borrow
 * the matching industry's problems and math, but only see tools that work for
 * any business, generic wording, and starting numbers for their type.
 * Adding a real profession later is data work, not new screens.
 */
import type { BusinessTypeId, IndustryId, Problem, Profile, SystemId, Tool } from '../types'
import { INDUSTRIES, PROBLEMS, SYSTEMS, getTools, industryById } from './repo'

export interface BusinessType {
  id: BusinessTypeId
  label: string
  examples: string
  base: IndustryId
  defaults: { avgValue: number; valueLabel: string; hourlyValue: number }
}

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: 'appointments',
    label: 'Customers book appointments',
    examples: 'dentist, tutor, pet groomer, fitness studio, massage',
    base: 'salon',
    defaults: { avgValue: 90, valueLabel: 'Average appointment', hourlyValue: 35 },
  },
  {
    id: 'field',
    label: 'I go to customers’ homes or job sites',
    examples: 'house cleaning, pest control, roofing, painting, moving',
    base: 'hvac',
    defaults: { avgValue: 250, valueLabel: 'Average job', hourlyValue: 35 },
  },
  {
    id: 'shop',
    label: 'Customers come in to buy',
    examples: 'bakery, boutique, florist, food truck, gift shop',
    base: 'restaurant',
    defaults: { avgValue: 30, valueLabel: 'Average sale', hourlyValue: 22 },
  },
]

export const businessTypeById = (id: BusinessTypeId | undefined) => BUSINESS_TYPES.find((b) => b.id === id)

export const isOther = (p: Profile) => !!p.other

/** A tool that works for any kind of business (tagged for every industry we cover) */
export const isGeneralTool = (t: Tool) => INDUSTRIES.every((i) => t.industries.includes(i.id))

/** Industry to use for problem wording: none for "Something else", so labels stay generic */
export const wordingIndustry = (p: Profile): IndustryId | null => (p.other ? null : p.industry)

/** "your dog grooming business" / "your salon or barbershop" */
export function businessLabel(p: Profile): string {
  if (p.other) {
    const name = p.other.profession.trim().toLowerCase()
    // "dog grooming" → "dog grooming business"; "bakery" or "cleaning company" stay as typed
    return /(business|shop|store|studio|salon|office|company|clinic|practice|bakery|service|services|agency|firm|cafe|café|truck|center|gym|spa)$/.test(name) ? name : `${name} business`
  }
  return (industryById(p.industry)?.label ?? 'business').toLowerCase().replace('hvac', 'HVAC')
}

export function defaultsFor(p: Profile) {
  if (p.other) return businessTypeById(p.other.type)!.defaults
  return industryById(p.industry)?.defaults ?? { avgValue: 50, valueLabel: 'Average sale', hourlyValue: 25 }
}

/** Problems an owner can pick. "Something else" only sees problems a general tool can solve. */
export function problemsFor(p: Profile): Problem[] {
  const inIndustry = PROBLEMS.filter((x) => !p.industry || x.industries.includes(p.industry))
  if (!p.other) return inIndustry
  const solvable = new Set(getTools().filter(isGeneralTool).flatMap((t) => t.problems))
  return inIndustry.filter((x) => solvable.has(x.id))
}

/** Software shown in Stack Snap: "Something else" sees software any business might use */
export function systemsFor(industry: IndustryId | null, general: boolean): SystemId[] {
  return SYSTEMS.filter((s) => (general ? INDUSTRIES.every((i) => s.industries.includes(i.id)) : !industry || s.industries.includes(industry))).map((s) => s.id)
}

export function titleCase(s: string) {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
