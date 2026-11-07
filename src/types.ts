export type IndustryId = 'restaurant' | 'hvac' | 'salon' | 'landscaping'

export type CategoryId = 'phones' | 'scheduling' | 'money' | 'marketing' | 'office'

export type SystemKind = 'pos' | 'fsm' | 'booking' | 'accounting' | 'google' | 'social' | 'email' | 'none'

export type SystemId =
  | 'toast'
  | 'square'
  | 'clover'
  | 'jobber'
  | 'housecallpro'
  | 'servicetitan'
  | 'vagaro'
  | 'glossgenius'
  | 'quickbooks'
  | 'google'
  | 'social'
  | 'email'
  | 'paper'

export type Compat = 'native' | 'zapier' | 'none'

export interface Industry {
  id: IndustryId
  label: string
  emoji: string
  blurb: string
  /** Number used in the Day-in-the-life simulator */
  defaults: { avgValue: number; valueLabel: string; hourlyValue: number }
}

export interface Category {
  id: CategoryId
  label: string
  emoji: string
  blurb: string
}

export interface Problem {
  id: string
  category: CategoryId
  industries: IndustryId[]
  /** Plain-language label, optionally reworded per industry */
  label: string
  labelBy?: Partial<Record<IndustryId, string>>
  /** Short noun phrase for sentences, e.g. "replying to reviews" */
  noun?: string
  keywords: string[]
  /** How the simulator measures this problem */
  measure: 'missedCalls' | 'hours'
}

export interface System {
  id: SystemId
  label: string
  kind: SystemKind
  short: string
  industries: IndustryId[]
}

export type SizeBand = 'solo' | 'small' | 'medium'

/** A plain-English note about a tool's terms, fees, or data, always with a source */
export interface Flag {
  kind: 'good' | 'fees' | 'contract' | 'data' | 'watch'
  text: string
  source: { label: string; url: string }
}

/** Usage-based fees, estimated from the business size (assumptions in lib/config.ts) */
export interface Usage {
  unit: 'calls' | 'callers' | 'conversations'
  included: number
  overage: number
}

export interface Tool {
  id: string
  name: string
  vendor: string
  url: string
  /** One plain-language sentence */
  does: string
  /** What it does inside a recipe, used for the "how these work together" flow */
  role: string
  category: CategoryId
  problems: string[]
  industries: IndustryId[]
  /** Only recommended when the owner already uses this system */
  requires?: SystemId
  /** Which kinds of the owner's systems matter for this tool */
  relevant: SystemKind[]
  works: Partial<Record<SystemId, Compat>>
  /** True when it works on its own, e.g. call forwarding, without needing a connection */
  standalone?: boolean
  /** Monthly price in USD. null = vendor does not publish a price */
  price: number | null
  priceLabel: string
  extraFees: string
  freeTrial: string | null
  cancelAnytime: boolean | null
  cancelNote?: string
  /** Estimated setup time in minutes */
  setupMinutes: number
  setupNote: string
  /** 1 = point-and-click, 2 = some setup, 3 = needs help or vendor onboarding */
  effort: 1 | 2 | 3
  dataNote: string | null
  sources: { label: string; url: string }[]
  checked: string
  usage?: Usage
  flags?: Flag[]
  /** Extra monthly fees charged only when the owner uses a given system */
  systemFees?: Partial<Record<SystemId, { amount: number; note: string }>>
  connector?: boolean
  pending?: boolean
}

export type BusinessTypeId = 'appointments' | 'field' | 'shop'

export interface Profile {
  industry: IndustryId | null
  category: CategoryId | null
  problems: string[]
  freeText: string
  size: SizeBand
  businessName?: string
  /** Set when the owner picked "Something else": their own words for the business, and the closest business type */
  other?: { profession: string; type: BusinessTypeId }
  /** Loaded from an example business on the home page */
  example?: boolean
  /** The owner's own numbers from the day preview, shared with the money-leak banner */
  sim?: Partial<Record<'missedPerWeek' | 'avgValue' | 'captureRate' | 'bookRate' | 'hoursPerWeek' | 'timeSaved' | 'hourlyValue', number>>
  systems: SystemId[]
  budget: number | null
  comfort: 1 | 2 | 3
  setupTime: 1 | 2 | 3
  dataCare: 1 | 2 | 3
}

export interface PlanState {
  recipeName: string
  toolIds: string[]
  done: string[]
  startedAt: string
}
