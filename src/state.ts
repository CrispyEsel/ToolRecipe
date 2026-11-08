import { useCallback, useEffect, useState } from 'react'
import type { PlanState, Profile, Tool } from './types'
import { load, save } from './lib/storage'

export type Route = 'home' | 'category' | 'problem' | 'profile' | 'results' | 'day' | 'compare' | 'plan' | 'catalog' | 'vendor' | 'how' | 'notfound'

export const ROUTES: Route[] = ['home', 'category', 'problem', 'profile', 'results', 'day', 'compare', 'plan', 'catalog', 'vendor', 'how']

export const EMPTY_PROFILE: Profile = {
  industry: null,
  category: null,
  problems: [],
  freeText: '',
  size: 'small',
  systems: [],
  budget: 150,
  comfort: 2,
  setupTime: 2,
  dataCare: 2,
}

/** Friendly spellings people may type or share, mapped to the real page */
const ALIASES: Record<string, Route> = {
  'how-we-rank': 'how',
  ranking: 'how',
  browse: 'catalog',
  tools: 'catalog',
  'browse-tools': 'catalog',
  vendors: 'vendor',
  'for-ai-vendors': 'vendor',
  'my-plan': 'plan',
  start: 'home',
  'find-tools': 'home',
}

function routeFromHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '').split(/[?#]/)[0].replace(/\/$/, '').toLowerCase()
  if (h === '') return 'home'
  // Shareable tool links: #/tool/<id> opens Browse with that tool's details
  if (h.startsWith('tool/')) return 'catalog'
  if ((ROUTES as string[]).includes(h)) return h as Route
  return ALIASES[h] ?? 'notfound'
}

/** Tool id from a #/tool/<id> link, if any */
export const toolIdFromHash = () => {
  const m = window.location.hash.match(/^#\/?tool\/([^/?#]+)/i)
  return m ? decodeURIComponent(m[1]) : null
}

/** href for a page, so menus can be real links */
export const hrefFor = (r: Route) => `#/${r}`

export function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(routeFromHash)
  useEffect(() => {
    const on = () => {
      setRoute(routeFromHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = useCallback((r: Route) => {
    window.location.hash = `/${r}`
    window.scrollTo({ top: 0 })
  }, [])
  return [route, go]
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(() => load('tb.profile', EMPTY_PROFILE))
  useEffect(() => save('tb.profile', profile), [profile])
  const update = useCallback((patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })), [])
  const reset = useCallback(() => setProfile(EMPTY_PROFILE), [])
  return { profile, update, reset }
}

export function usePlan() {
  const [plan, setPlan] = useState<PlanState | null>(() => {
    const p = load<PlanState | null>('tb.plan', null as unknown as PlanState)
    return p && (p as PlanState).toolIds ? p : null
  })
  useEffect(() => save('tb.plan', plan), [plan])
  return { plan, setPlan }
}

export function useVendorTools() {
  const [tools, setTools] = useState<Tool[]>(() => load<Tool[]>('tb.vendorTools', []))
  useEffect(() => save('tb.vendorTools', tools), [tools])
  return { vendorTools: tools, addVendorTool: (t: Tool) => setTools((x) => [...x, t]) }
}

export function useCheckins() {
  const [checkins, setCheckins] = useState<Record<string, string>>(() => load('tb.checkins', {}))
  useEffect(() => save('tb.checkins', checkins), [checkins])
  return { checkins, setCheckin: (toolId: string, v: string) => setCheckins((c) => ({ ...c, [toolId]: v })) }
}
