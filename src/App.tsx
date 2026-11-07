import { useEffect, useMemo, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { getTools } from './lib/repo'
import { track } from './lib/storage'
import { readiness } from './engine/readiness'
import { buildRecipes, recommendedKey, type Recipe } from './engine/recipes'
import { ToolDetail } from './components/ToolDetail'
import { TestDrive } from './components/TestDrive'
import { CategoryStep, Home, ProblemStep, ProfileStep } from './screens/Onboarding'
import { Results } from './screens/Results'
import { Day } from './screens/Day'
import { Compare } from './screens/Compare'
import { Plan } from './screens/Plan'
import { Catalog, HowWeRank, Vendor } from './screens/Pages'
import { useCheckins, usePlan, useProfile, useRoute, useVendorTools, type Route } from './state'
import type { Tool } from './types'

const NAV: [Route, string][] = [
  ['home', 'Find tools'],
  ['plan', 'My plan'],
  ['catalog', 'Browse tools'],
  ['how', 'How we rank'],
  ['vendor', 'For AI vendors'],
]
/** Desktop header: links split around the centered logo */
const NAV_LEFT: [Route, string][] = [
  ['catalog', 'Browse tools'],
  ['home', 'Find tools'],
]
const NAV_RIGHT: [Route, string][] = [
  ['plan', 'My plan'],
  ['how', 'How we rank'],
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
    const style = active ? 'bg-brand text-white' : 'text-white/85 hover:bg-white/10'
    return (
      <li key={r}>
        <button onClick={() => go(r)} aria-current={active ? 'page' : undefined} className={`min-h-11 whitespace-nowrap rounded-lg px-3 font-medium ${style}`}>
          {label}
          {r === 'plan' && plan && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-accent" aria-label="(plan started)" />}
        </button>
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
  const recipe = recipes.find((r) => r.key === selected) ?? recipes[0]

  // Guard steps that need earlier answers
  useEffect(() => {
    const needs: Partial<Record<Route, boolean>> = {
      category: !profile.industry,
      problem: !profile.industry || !profile.category,
      profile: !profile.problems.length,
      results: !profile.problems.length,
      day: !recipe,
      compare: !recipe,
    }
    if (needs[route]) go('home')
  }, [route, profile, recipe, go])

  const startPlan = (r: Recipe) => {
    track('recipe_started', { recipe: r.key, tools: r.items.map((s) => s.tool.id), total: r.knownTotal })
    setPlan({ recipeName: r.name, toolIds: r.items.map((s) => s.tool.id), done: [], startedAt: new Date().toISOString() })
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
      screen = <Compare profile={profile} recipes={recipes} go={go} openTool={setOpenTool} />
      break
    case 'plan':
      screen = <Plan plan={plan} setPlan={setPlan} allTools={allTools} profile={profile} update={props.update} go={go} checkins={checkins} setCheckin={setCheckin} />
      break
    case 'catalog':
      screen = <Catalog allTools={allTools} openTool={setOpenTool} />
      break
    case 'vendor':
      screen = <Vendor addVendorTool={addVendorTool} go={go} />
      break
    case 'how':
      screen = <HowWeRank />
      break
    default:
      screen = <Home {...props} />
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">
        Skip to content
      </a>
      <header className="on-dark border-b-4 border-brand bg-ink text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
          <nav aria-label="Main, left" className="hidden justify-self-end lg:block">
            <ul className="flex gap-2">{NAV_LEFT.map(navItem)}</ul>
          </nav>
          <span className="lg:hidden" aria-hidden />
          <button onClick={() => go('home')} className="flex items-center gap-2 justify-self-center px-2" aria-label="ToolRecipe home">
            <img src="/favicon.svg" alt="" className="h-10 w-10" />
            <span className="font-display text-2xl font-semibold text-white sm:text-[1.7rem]">ToolRecipe</span>
          </button>
          <nav aria-label="Main, right" className="hidden justify-self-start lg:block">
            <ul className="flex gap-2">{NAV_RIGHT.map(navItem)}</ul>
          </nav>
          <button className="justify-self-end rounded-lg p-2 lg:hidden" aria-expanded={menu} aria-label="Menu" onClick={() => setMenu((m) => !m)}>
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        {menu && (
          <nav aria-label="Mobile" className="border-t border-white/20 lg:hidden">
            <ul className="mx-auto max-w-6xl px-4 py-2">
              {NAV.map(([r, label]) => (
                <li key={r}>
                  <button
                    onClick={() => {
                      setMenu(false)
                      go(r)
                    }}
                    aria-current={isActive(r) ? 'page' : undefined}
                    className={`block min-h-12 w-full text-left font-medium ${isActive(r) ? 'text-accent' : ''}`}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {screen}
      </main>

      <footer className="on-dark bg-ink text-white/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            <button onClick={() => go('how')} className="font-semibold text-accent underline">
              How we rank tools
            </button>{' '}
            · Vendors can’t pay for placement · Your answers stay in your browser
          </p>
          <p>
            Prototype for the UMD AI for Small Business Hack-a-thon ·{' '}
            <button
              className="underline"
              onClick={() => {
                reset()
                setPlan(null)
                go('home')
              }}
            >
              Start over
            </button>
          </p>
        </div>
      </footer>

      <ToolDetail tool={openTool} profile={profile} onClose={() => setOpenTool(null)} />
      {driveTool && <TestDrive key={driveTool.id} tool={driveTool} profile={profile} onClose={() => setDriveTool(null)} />}
    </div>
  )
}
