import { TOOLS } from '../src/data/tools'
import { buildRecipes } from '../src/engine/recipes'
import { readiness } from '../src/engine/readiness'
import { readText } from '../src/engine/match'
import type { Profile } from '../src/types'

const base: Omit<Profile, 'industry'|'problems'|'systems'|'budget'|'comfort'> = { category: null, freeText: '', size: 'small', setupTime: 2, dataCare: 2 }
const scenarios: [string, Profile][] = [
  ['Restaurant Toast $150 missed calls + staff', { ...base, industry: 'restaurant', problems: ['missed-calls','staff-scheduling'], systems: ['toast','google','quickbooks'], budget: 150, comfort: 2 }],
  ['Same on Square', { ...base, industry: 'restaurant', problems: ['missed-calls','staff-scheduling'], systems: ['square','google','quickbooks'], budget: 150, comfort: 2 }],
  ['Restaurant Toast food costs', { ...base, industry: 'restaurant', problems: ['food-costs'], systems: ['toast','quickbooks'], budget: 400, comfort: 2 }],
  ['HVAC Jobber+QB estimates handy', { ...base, industry: 'hvac', problems: ['slow-estimates','invoice-chasing'], systems: ['jobber','quickbooks'], budget: 200, comfort: 3 }],
  ['Salon Square no budget rebook set-up-for-me', { ...base, industry: 'salon', problems: ['no-shows'], systems: ['square'], budget: null, comfort: 1 }],
]
for (const [name, p] of scenarios) {
  console.log('\n==', name, '| readiness', readiness(p).score, readiness(p).level)
  for (const r of buildRecipes(TOOLS, p)) {
    console.log(` ${r.name}: $${r.knownTotal}${r.unknownCount?` +${r.unknownCount} quote`:''} score ${r.score} | ${r.items.map(i=>`${i.tool.name}[${i.badges.map(b=>b.system+':'+b.status).join(',')}]`).join(' + ')}${r.connector?' + Zapier':''} | missing ${r.missing}`)
  }
}
console.log(readText('We miss about 20 calls every Friday night during dinner rush', 'restaurant', 'phones'))
