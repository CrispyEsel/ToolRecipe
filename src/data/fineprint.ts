import type { Flag } from '../types'

/**
 * Fine Print: plain-English notes about terms, fees, and data that owners
 * would otherwise find only after signing up. Every flag links to its source.
 * Wording is ours (paraphrased); follow the link for the exact terms.
 */
const s = (label: string, url: string) => ({ label, url })

const SRC = {
  slangTR: s('Toolradar: Slang.ai', 'https://toolradar.com/tools/slang-ai'),
  slangLoc: s('Slang AI pricing: per location', 'https://dailyaifixs.com/blog/slang-ai-pricing-2026-the-per-location-catch'),
  goodcallCT: s('CloudTalk: Goodcall pricing', 'https://www.cloudtalk.io/blog/goodcall-pricing/'),
  goodcallSV: s('Solvea: Goodcall review', 'https://solvea.cx/blog/goodcall-ai-receptionist-pricing'),
  rosieMacha: s('Macha: Rosie guide', 'https://www.getmacha.com/blog/rosie-complete-guide'),
  rosieCT: s('CloudTalk: Rosie review', 'https://www.cloudtalk.io/blog/rosie-ai-review/'),
  smithMacha: s('Macha: Smith.ai pricing', 'https://www.getmacha.com/blog/smith-ai-pricing-explained'),
  upfirstSF: s('SourceForge: Upfirst', 'https://sourceforge.net/software/product/Upfirst'),
  upfirstJC: s('JustCall: Upfirst', 'https://justcall.io/blog/best-smith-ai-alternatives.html'),
  jobberCarly: s('Carly: Jobber AI Receptionist', 'https://www.usecarly.com/blog/jobber-ai-receptionist/'),
  podium: s('Pabau: Podium pricing', 'https://pabau.com/blog/podium-pricing/'),
  owner: s('Owner.com pricing', 'https://www.owner.com/pricing-com'),
  meToast: s('Toolradar: restaurant AP guide', 'https://toolradar.com/guides/best-accounts-payable-software-for-restaurants'),
  meApis: s('MarginEdge plans', 'https://apis.io/plans/marginedge/marginedge-plans-pricing/'),
  shifts: s('MakerStack: 7shifts review', 'https://makerstack.co/reviews/7shifts-review/'),
  openai: s('OpenAI Help Center', 'https://help.openai.com/en/articles/8983130-what-if-i-want-to-keep-my-history-on-but-disable-model-training'),
  openaiSeats: s('Lenz: ChatGPT Business pricing', 'https://lenz.io/c/openai-chatgpt-business-5-dollar-price-cut-2026-72b95dee'),
  canva: s('CostBench: Canva AI', 'https://www.costbench.com/software/ai-image-generators/canva-ai/'),
  sameday: s('Sameday', 'https://sameday.ai/post/best-virtual-receptionist-for-servicetitan-why-contractors-choose-sameday'),
  avoca: s('B2B Sales Tools: Avoca', 'https://b2bsalestools-com.pages.dev/compare/avoca-vs-rilla/'),
  agentzap: s('Stork: salon receptionists', 'https://www.stork.ai/blog/ai-receptionist-for-salons-2026'),
  squareAI: s('Square AI ordering setup test', 'https://sagnikbhattacharya.com/blog/restaurants-square-ai-voice-ordering-setup-test'),
  nicejobFG: s('FitGap: NiceJob', 'https://us.fitgap.com/products/nicejob'),
  nicejobSS: s('SoftwareSuggest: NiceJob', 'https://www.softwaresuggest.com/nicejob/pricing'),
  loman: s('CloudTalk: Loman review', 'https://www.cloudtalk.io/blog/loman-ai-review/'),
  hostie: s('Hostie buyer’s guide', 'https://hostie.ai/resources/2025-buyers-guide-top-7-ai-phone-ordering-systems-small-restaurants-under-300-month'),
  fastest: s('Capterra: FastEstimate', 'https://www.capterra.com/p/10043845/FastEstimate/'),
  housecall: s('Carly: Housecall Pro CSR AI', 'https://www.usecarly.com/blog/housecall-pro-ai-receptionist/'),
}

export const FINE_PRINT: Record<string, Flag[]> = {
  slang: [
    { kind: 'watch', text: 'Uses a new phone number you put on your website and Google listing', source: SRC.slangTR },
    { kind: 'fees', text: 'Priced per location, so a second location doubles the bill', source: SRC.slangLoc },
  ],
  goodcall: [
    { kind: 'good', text: 'Unlimited call minutes on every plan', source: SRC.goodcallCT },
    { kind: 'fees', text: '$0.50 for each caller after 100 different callers a month', source: SRC.goodcallCT },
    { kind: 'watch', text: 'Some users report price changes at billing time with little notice', source: SRC.goodcallSV },
  ],
  rosie: [
    { kind: 'fees', text: 'Plans are metered by minutes, so long calls use up your plan', source: SRC.rosieMacha },
    { kind: 'watch', text: 'Answers incoming calls only; it won’t call customers back', source: SRC.rosieCT },
  ],
  smithai: [
    { kind: 'contract', text: 'AI plans need 30 days’ notice to cancel', source: SRC.smithMacha },
    { kind: 'fees', text: 'Every call past your bundle is billed extra', source: SRC.smithMacha },
  ],
  upfirst: [
    { kind: 'good', text: 'Spam and very short calls aren’t billed', source: SRC.upfirstJC },
    { kind: 'fees', text: '$1.50 for each call after the first 30', source: SRC.upfirstSF },
  ],
  'jobber-receptionist': [{ kind: 'fees', text: '$0.79 per conversation after the first 30', source: SRC.jobberCarly }],
  'housecall-csr': [{ kind: 'watch', text: 'Housecall Pro doesn’t publish the price of this add-on', source: SRC.housecall }],
  loman: [{ kind: 'watch', text: 'No price on Loman’s website; you need a sales call', source: SRC.loman }],
  hostie: [{ kind: 'watch', text: 'Some listings mention per-minute charges on top of the plan', source: SRC.hostie }],
  podium: [
    { kind: 'contract', text: 'Plans assume a 12-month contract', source: SRC.podium },
    { kind: 'watch', text: 'Podium doesn’t publish prices; these come from independent reviews', source: SRC.podium },
  ],
  owner: [
    { kind: 'fees', text: 'The $249 plan adds a 5% fee on every online order', source: SRC.owner },
    { kind: 'good', text: 'Month-to-month with no long-term contract', source: SRC.owner },
  ],
  marginedge: [
    { kind: 'fees', text: 'Toast restaurants also pay Toast $50/mo per location', source: SRC.meToast },
    { kind: 'good', text: 'No contracts', source: SRC.meApis },
  ],
  '7shifts': [{ kind: 'watch', text: 'AI auto-scheduling is only on the most expensive plan', source: SRC.shifts }],
  chatgpt: [
    { kind: 'data', text: 'Business plan chats aren’t used to train OpenAI’s models by default', source: SRC.openai },
    { kind: 'fees', text: 'Two-seat minimum on the Business plan', source: SRC.openaiSeats },
  ],
  canva: [{ kind: 'fees', text: 'AI features draw from a monthly allowance of uses', source: SRC.canva }],
  sameday: [
    { kind: 'good', text: 'Sameday says no contracts', source: SRC.sameday },
    { kind: 'watch', text: 'Prices aren’t published; the figure here is from a third party', source: SRC.sameday },
  ],
  avoca: [{ kind: 'watch', text: 'Built for large operations; setup reported at 4–8 weeks', source: SRC.avoca }],
  agentzap: [{ kind: 'fees', text: '$499 one-time setup fee', source: SRC.agentzap }],
  'square-ai-orders': [{ kind: 'fees', text: 'Needs the Square Plus plan ($49/mo) if you’re on Square’s free plan', source: SRC.squareAI }],
  nicejob: [
    { kind: 'good', text: 'No contract', source: SRC.nicejobFG },
    { kind: 'fees', text: 'AI-written review replies need the $125/mo Pro plan', source: SRC.nicejobSS },
  ],
  fastestimate: [{ kind: 'good', text: 'Cancel anytime; free plan for 3 estimates a month', source: SRC.fastest }],
}
