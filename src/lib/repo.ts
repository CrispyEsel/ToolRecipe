/**
 * Data access layer: the only module that reads the catalog files.
 * Screens and the engine call these functions instead of importing data.
 * Later: the same function names call a database or API, and nothing else
 * in the app has to change.
 */
import { CATEGORIES, INDUSTRIES, PROBLEMS, SYSTEMS } from '../data/taxonomy'
import { TOOLS, CHECKED } from '../data/tools'
import { FINE_PRINT } from '../data/fineprint'
import { FINAL_STEPS, PLAN_TEMPLATES } from '../data/plans'
import { upcomingSeasons } from '../data/seasons'
import type { Tool } from '../types'

export { CHECKED }

const withFlags = (t: Tool): Tool => (FINE_PRINT[t.id] ? { ...t, flags: FINE_PRINT[t.id] } : t)
const CATALOG: Tool[] = TOOLS.map(withFlags)

/** All verified tools plus any vendor submissions (marked pending) */
export function getTools(vendorTools: Tool[] = []): Tool[] {
  return [...CATALOG, ...vendorTools]
}
export const getIndustries = () => INDUSTRIES
export const getCategories = () => CATEGORIES
export const getProblems = () => PROBLEMS
export const getSystems = () => SYSTEMS
export const getSeasons = upcomingSeasons
export { EXAMPLES } from '../data/examples'
export const getPlanTemplates = () => ({ templates: PLAN_TEMPLATES, final: FINAL_STEPS })

export const industryById = (id: string | null) => INDUSTRIES.find((i) => i.id === id)
export const categoryById = (id: string | null) => CATEGORIES.find((c) => c.id === id)
export const problemById = (id: string) => PROBLEMS.find((p) => p.id === id)
export const systemById = (id: string) => SYSTEMS.find((s) => s.id === id)
export { problemLabel } from '../data/taxonomy'
/** Read-only lists for screens that render every option */
export { CATEGORIES, INDUSTRIES, PROBLEMS, SYSTEMS }
