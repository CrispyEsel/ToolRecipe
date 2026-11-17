import type { CategoryId } from '../types'

/**
 * Short research facts shown on the home and results pages, one at random.
 * Every figure comes from the team's research brief and was checked word for
 * word against the publisher's own page on Nov 7, 2026. Keep the survey and year with
 * each number, and link the original source, not the brief.
 */
export interface Fact {
  id: string
  /** The headline number, bolded in the sentence. */
  stat: string
  /** The rest of the sentence after the number. */
  text: string
  /** One plain line on why it matters to the owner. Optional. */
  tie?: string
  source: string
  url: string
  where: ('home' | 'results')[]
  /** Shown first on results when the owner picked one of these areas. */
  cats?: CategoryId[]
}

const FED = {
  source: 'Federal Reserve Small Business Credit Survey, 2026 report',
  url: 'https://www.fedsmallbusiness.org/2026-report-on-employer-firms',
}

export const FACTS: Fact[] = [
  {
    id: 'finding-tools',
    stat: '54%',
    text: 'of small firms planning to use AI name finding tools that meet their needs as a top challenge.',
    tie: 'That’s the part ToolRecipe does for you.',
    ...FED,
    where: ['home', 'results'],
  },
  {
    id: 'already-using',
    stat: 'Nearly half',
    text: 'of small employer firms (46%) already use AI, and another 15% plan to start within a year.',
    ...FED,
    where: ['home'],
  },
  {
    id: 'smallest-firms',
    stat: 'Fewer than 20%',
    text: 'of businesses with four or fewer employees use AI, compared with 37% of firms with 250 or more.',
    tie: 'That gap is why ToolRecipe is built for small shops.',
    source: 'U.S. Census Bureau, May 2026',
    url: 'https://www.census.gov/library/stories/2026/05/ai-use-businesses.html',
    where: ['home'],
  },
  {
    id: 'productivity',
    stat: '71%',
    text: 'of small firms using AI say it made them more productive, and 31% say it brought higher sales.',
    tie: 'Results are self-reported and vary by business, so we show the math instead of promising a number.',
    ...FED,
    where: ['home', 'results'],
  },
  {
    id: 'marketing',
    stat: '83%',
    text: 'of small firms that use AI use it for writing or marketing, the most common use by far.',
    ...FED,
    where: ['results'],
    cats: ['marketing'],
  },
  {
    id: 'integrated',
    stat: 'Only 7%',
    text: 'of small firms using AI say it’s fully built into how they work. About half are still experimenting.',
    tie: 'Your 30-day plan takes it one step at a time.',
    ...FED,
    where: ['results'],
  },
  {
    id: 'accuracy',
    stat: '46%',
    text: 'of small firms using AI name accuracy as their top challenge.',
    tie: 'That’s why we mark anything we couldn’t confirm, and why AI drafts are yours to check.',
    ...FED,
    where: ['results'],
    cats: ['marketing', 'money', 'office'],
  },
  {
    id: 'reliability',
    stat: '45.8%',
    text: 'of businesses that adopted AI between 2020 and 2022 did it to improve the quality or reliability of their processes, the most common reason given.',
    source: 'U.S. Census Bureau Annual Business Survey, Sept 2025',
    url: 'https://www.census.gov/library/stories/2025/09/technology-impact.html',
    where: ['results'],
    cats: ['phones', 'scheduling', 'office'],
  },
  {
    id: 'kenya',
    stat: 'Access alone isn’t enough.',
    text: 'In a five-month experiment with 640 small-business owners, getting an AI assistant didn’t raise average revenue or profit. Results depended on what owners used it for.',
    tie: 'That’s why each recipe starts from your problem, not the tool.',
    source: 'Otis et al., Management Science, 2026',
    url: 'https://doi.org/10.1287/mnsc.2024.06909',
    where: ['results'],
  },
]

/** Facts for a page, with ones matching the owner's areas first. */
export function factsFor(where: 'home' | 'results', cats: CategoryId[] = []): Fact[] {
  const pool = FACTS.filter((f) => f.where.includes(where))
  const related = pool.filter((f) => f.cats?.some((c) => cats.includes(c)))
  return related.length ? [...related, ...pool.filter((f) => !related.includes(f))] : pool
}
