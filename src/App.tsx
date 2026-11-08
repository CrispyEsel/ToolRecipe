import { useEffect, useMemo, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { CHECKED, getTools } from './lib/repo'
import { fmtDate } from './lib/format'
import { track } from './lib/storage'
import { readiness } from './engine/readiness'
import { buildRecipes, recipeFor, recommendedKey, type Recipe } from './engine/recipes'
import { ToolDetail } from './components/ToolDetail'
import { TestDrive } from './components/TestDrive'
import { CategoryStep, Home, ProblemStep, ProfileStep } from './screens/Onboarding'
import { Results } from './screens/Results'
import { Day } from './screens/Day'
import { Compare } from './screens/Compare'
import { Plan } from './screens/Plan'
import { Catalog, HowWeRank, Vendor } from './screens/Pages'
import { hrefFor, toolIdFromHash, useCheckins, usePlan, useProfile, useRoute, useVendorTools, type Route } from './state'
import type { Tool } from './types'

/** Main menu, in priority order. "Find my tools" is the guided path and shows as the primary button. */
const NAV: [Route, string][] = [
  ['home', 'Find my tools'],
  ['catalog', 'Browse all tools'],
  ['how', 'How we rank'],
  ['plan', 'My plan'],
  ['vendor', 'For AI vendors'],
]

export default function App() {
  const [route, go] = useRoute()
  const { profile, update, reset } = useProfile()
  const { plan, setPlan } = usePlan()
  const { vendorTools, addVendorTool } = useVendorTools()
  const { checkins, setCheckin } = useCheckins()
  const [openTool, setOpenTool] = useState<Tool | null>(null)
  const [driveTool, setDriveTool] = useState<Tool | null>(null)
  const [menu, setMenu] = useState(false)
  const isActive = (r: Route) => route === r
  const navItem = ([r, label]: [Route, string]) => {
    const active = isActive(r)
    const primary = r === 'home'
    const style = primary
      ? `bg-brand text-white hover:bg-brand-dark ${active ? 'ring-2 ring-brand/30 ring-offset-2 ring-offset-paper' : ''}`
      : active
        ? 'bg-brand-soft text-brand'
        : 'text-ink hover:bg-black/[0.05]'
    return (
      <li key={r}>
        <a href={hrefFor(r)} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 font-medium ${style}`}>
          {label}
          {r === 'plan' && plan && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-accent" aria-label="(plan started)" />}
        </a>
      </li>
    )
  }

  const allTools = useMemo(() => getTools(vendorTools), [vendorTools])
  const recipes = useMemo(() => (profile.industry && profile.problems.length ? buildRecipes(allTools, profile) : []), [allTools, profile])

  const level = readiness(profile).level
  const recommended = recommendedKey(level, recipes)
  const [selected, setSelected] = useState<Recipe['key']>(recommended)
  // When answers change enough to move the recommendation, follow it
  useEffect(() => setSelected(recommended), [recommended])
  const recipe = recipeFor(recipes, selected) ?? recipes[0]
  // Close any open tool details when the page changes
  useEffect(() => {
    setOpenTool(null)
    setDriveTool(null)
    setMenu(false)
  }, [route])
  // Open a tool from a shared #/tool/<id> link (also when the hash changes on the Browse page)
  useEffect(() => {
    const open = () => {
      const id = toolIdFromHash()
      const t = id ? allTools.find((x) => x.id === id) : null
      if (t) setOpenTool(t)
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
    // Runs after the "close on page change" effect above, so a tool link wins
  }, [allTools, route])
  // On Browse, keep the address bar pointing at the open tool so it can be shared
  useEffect(() => {
    if (route !== 'catalog') return
    const want = openTool ? `#/tool/${openTool.id}` : '#/catalog'
    if (window.location.hash !== want) history.replaceState(null, '', want)
  }, [openTool, route])

  // Guard steps that need earlier answers
  useEffect(() => {
    const needs: Partial<Record<Route, boolean>> = {
      category: !profile.industry,
      problem: !profile.industry,
      profile: !profile.problems.length,
      results: !profile.problems.length,
      day: !recipe,
      compare: !recipe,
    }
    if (needs[route]) go('home')
  }, [route, profile, recipe, go])

  const startPlan = (r: Recipe) => {
    track('recipe_started', { recipe: r.key, tools: r.items.map((s) => s.tool.id), total: r.knownTotal })
    setPlan({ recipeName: r.name, toolIds: r.items.map((s) => s.tool.id), done: [], startedAt: new Date().toISOString(), total: r.knownTotal, unknownCount: r.unknownCount })
    go('plan')
  }

  const props = { profile, update, go }
  let screen: React.ReactNode
  switch (route) {
    case 'category':
      screen = <CategoryStep {...props} />
      break
    case 'problem':
      screen = <ProblemStep {...props} />
      break
    case 'profile':
      screen = <ProfileStep {...props} />
      break
    case 'results':
      screen = (
        <Results {...props} openTestDrive={setDriveTool} recommended={recommended} recipes={recipes} allTools={allTools} selected={selected} setSelected={setSelected} openTool={setOpenTool} startPlan={startPlan} />
      )
      break
    case 'day':
      screen = recipe ? <Day profile={profile} recipe={recipe} go={go} startPlan={startPlan} update={props.update} /> : null
      break
    case 'compare':
      screen = <Compare profile={profile} recipes={recipes} go={go} openTool={setOpenTool} startPlan={startPlan} recommended={recommended} />
      break
    case 'plan':
      screen = <Plan plan={plan} setPlan={setPlan} allTools={allTools} profile={profile} update={props.update} go={go} checkins={checkins} setCheckin={setCheckin} />
      break
    case 'catalog':
      screen = <Catalog allTools={allTools} openTool={setOpenTool} profile={profile} />
      break
    case 'vendor':
      screen = <Vendor addVendorTool={addVendorTool} go={go} />
      break
    case 'how':
      screen = <HowWeRank />
      break
    case 'notfound':
      screen = <NotFound />
      break
    default:
      screen = <Home {...props} />
  }

  return (
    <div className="app-shell flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-black/[0.08] bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <a href={hrefFor('home')} className="flex shrink-0 items-center gap-2" aria-label="ToolRecipe home">
            <img src="/favicon.svg" alt="" className="h-10 w-10" />
            <span className="font-display text-2xl text-ink">ToolRecipe</span>
          </a>
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1.5">{NAV.map(navItem)}</ul>
          </nav>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-black/15 bg-white px-4 font-semibold lg:hidden" aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu((m) => !m)}>
            {menu ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />} Menu
          </button>
        </div>
      </header>
        {menu && (
          <nav id="mobile-menu" aria-label="Main" className="fade-in fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-black/[0.08] bg-paper lg:hidden">
            <ul className="mx-auto max-w-6xl space-y-1 px-4 py-3">
              {NAV.map(([r, label]) => (
                <li key={r}>
                  <a
                    href={hrefFor(r)}
                    onClick={() => setMenu(false)}
                    aria-current={isActive(r) ? 'page' : undefined}
                    className={`flex min-h-14 w-full items-center justify-between rounded-2xl px-4 text-lg font-semibold ${r === 'home' ? 'bg-brand text-white' : isActive(r) ? 'bg-brand-soft text-brand' : 'hover:bg-black/[0.05]'}`}
                  >
                    {label}
                    {r === 'plan' && plan && <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-label="(plan started)" />}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {screen}
      </main>

      <footer className="on-dark border-t-4 border-accent bg-ink text-fog">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="flex items-center gap-2">
              <img src="/favicon.svg" alt="" className="h-8 w-8" />
              <span className="font-display text-xl text-white">ToolRecipe</span>
            </p>
            <p className="mt-3 max-w-xs">A neutral guide to AI tools for small businesses. We don’t sell AI tools, and vendors can’t pay for placement.</p>
          </div>
          <FooterCol
            title="Product"
            links={[
              ['Find my tools', 'home'],
              ['Browse all tools', 'catalog'],
              ['My 30-day plan', 'plan'],
            ]}
          />
          <FooterCol
            title="Trust"
            links={[
              ['How we rank tools', 'how'],
              ['For AI vendors', 'vendor'],
            ]}
          />
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-fog">Data</p>
            <ul className="mt-3 space-y-2">
              <li>Prices checked {fmtDate(CHECKED)}</li>
              <li>Your answers stay in your browser</li>
              <li>
                <button
                  className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-white"
                  onClick={() => {
                    reset()
                    setPlan(null)
                    go('home')
                  }}
                >
                  Start over
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-fog">Prototype for the UMD Smith AI for Small Business Hack-a-thon, Fall 2026.</p>
        </div>
      </footer>

      <ToolDetail tool={openTool} profile={profile} onClose={() => setOpenTool(null)} />
      {driveTool && <TestDrive key={driveTool.id} tool={driveTool} profile={profile} onClose={() => setDriveTool(null)} />}
    </div>
  )
}

function FooterCol({ title, links }: { title: string; links: [string, Route][] }) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-fog">{title}</p>
      <ul className="mt-2">
        {links.map(([label, r]) => (
          <li key={label}>
            <a href={hrefFor(r)} className="inline-flex min-h-11 items-center hover:text-white hover:underline">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Shown for any address that isn't a real page, instead of quietly showing the home page */
function NotFound() {
  const links: [Route, string][] = [
    ['home', 'Find tools for my business'],
    ['catalog', 'Browse all tools'],
    ['how', 'How we rank'],
    ['vendor', 'For AI vendors'],
  ]
  return (
    <section className="mx-auto max-w-xl py-12 text-center">
      <p className="font-display text-6xl text-brand">404</p>
      <h1 className="mt-3 font-display text-3xl">We couldn’t find that page</h1>
      <p className="mt-2 text-ink-soft">The link may be mistyped or out of date. Try one of these:</p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {links.map(([r, label]) => (
          <li key={r}>
            <a href={hrefFor(r)} className="lift flex min-h-12 items-center justify-center rounded-2xl border border-black/[0.08] bg-white px-4 font-semibold hover:border-brand">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
