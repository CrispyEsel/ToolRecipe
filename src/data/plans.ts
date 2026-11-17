import type { CategoryId } from '../types'

export interface PlanStepTemplate {
  day: number
  title: string
  how: string
}

/**
 * 30-day adoption steps by tool category. {tool} and {system} are filled in
 * with the chosen tool and the owner's main system.
 */
export const PLAN_TEMPLATES: Record<CategoryId, PlanStepTemplate[]> = {
  phones: [
    { day: 1, title: 'Sign up for {tool}', how: 'Start the trial or plan. Have your hours, services, and prices handy.' },
    { day: 2, title: 'Teach it your business', how: 'Add your hours, services, prices, and the 5 questions customers ask most.' },
    { day: 3, title: 'Connect it to {system}', how: 'Follow the connection steps so calls turn into orders or bookings automatically.' },
    { day: 4, title: 'Test it yourself', how: 'Call your own number from another phone. Ask a normal question and something it shouldn’t handle.' },
    { day: 5, title: 'Forward your calls', how: 'Start with “forward when we don’t answer” so staff still pick up when they can.' },
    { day: 14, title: 'Read two weeks of call summaries', how: 'Fix any wrong answers. Count how many calls it caught that would have gone to voicemail.' },
  ],
  scheduling: [
    { day: 1, title: 'Sign up for {tool}', how: 'Start the trial or turn it on in your account.' },
    { day: 2, title: 'Connect it to {system}', how: 'Link it so staff, clients, or bookings stay in one place.' },
    { day: 4, title: 'Set your rules', how: 'Pick reminder timing, who gets messaged, and which hours are open.' },
    { day: 7, title: 'Run it for one week', how: 'Let it send reminders or build one schedule. Check every message before it goes out.' },
    { day: 14, title: 'Compare to last month', how: 'Count no-shows, rebookings, or hours spent scheduling.' },
  ],
  money: [
    { day: 1, title: 'Sign up for {tool}', how: 'Start the trial or turn it on in your account.' },
    { day: 2, title: 'Connect it to {system}', how: 'Link your customer list and price list so you don’t retype anything.' },
    { day: 3, title: 'Make one real estimate or invoice', how: 'Do one job start to finish with the tool and check every number.' },
    { day: 7, title: 'Turn on automatic follow-ups', how: 'Set a polite reminder for unpaid invoices or unsigned quotes.' },
    { day: 14, title: 'Check the time saved', how: 'Compare how long estimates or collections took before and after.' },
  ],
  marketing: [
    { day: 1, title: 'Sign up for {tool}', how: 'Start the trial or plan.' },
    { day: 2, title: 'Connect your Google listing and customer list', how: 'This lets it ask the right people for reviews or post in the right places.' },
    { day: 3, title: 'Set your voice', how: 'Write 2–3 sentences about how you talk to customers so drafts sound like you.' },
    { day: 7, title: 'Approve the first week of messages', how: 'Read every review request, reply, or post before it goes out.' },
    { day: 21, title: 'Check your numbers', how: 'Count new reviews, replies sent, or posts published this month.' },
  ],
  office: [
    { day: 1, title: 'Sign up for {tool}', how: 'Start the trial or turn it on in your account.' },
    { day: 2, title: 'Connect it to {system}', how: 'Link your accounting or POS so numbers flow in automatically.' },
    { day: 3, title: 'Try it on one real task', how: 'One invoice, one week of receipts, or one email. Check the result carefully.' },
    { day: 10, title: 'Make it a habit', how: 'Pick one time each week to let the tool handle this task.' },
    { day: 21, title: 'Check the time saved', how: 'Write down how long this task takes now compared with before.' },
  ],
}

export const FINAL_STEPS: PlanStepTemplate[] = [
  { day: 30, title: 'Day-30 check-in: is it working?', how: 'Keep it, change the settings, or cancel before the next bill. Your answer helps the next owner like you.' },
]
