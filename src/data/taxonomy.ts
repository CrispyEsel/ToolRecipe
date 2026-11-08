import type { Category, Industry, Problem, System } from '../types'

export const INDUSTRIES: Industry[] = [
  {
    id: 'restaurant',
    label: 'Restaurant or Cafe',
    emoji: '🍽️',
    blurb: 'Dine-in, takeout, coffee shops',
    defaults: { avgValue: 45, valueLabel: 'Average phone order', hourlyValue: 25 },
  },
  {
    id: 'hvac',
    label: 'HVAC or Trades',
    emoji: '🔧',
    blurb: 'Heating, cooling, plumbing, electrical',
    defaults: { avgValue: 350, valueLabel: 'Average job', hourlyValue: 40 },
  },
  {
    id: 'salon',
    label: 'Salon or Barbershop',
    emoji: '💇',
    blurb: 'Hair, nails, beauty, spa',
    defaults: { avgValue: 75, valueLabel: 'Average appointment', hourlyValue: 30 },
  },
  {
    id: 'landscaping',
    label: 'Landscaping and Lawncare',
    emoji: '🌿',
    blurb: 'Mowing, planting, hardscape, snow',
    defaults: { avgValue: 250, valueLabel: 'Average job', hourlyValue: 35 },
  },
]

export const CATEGORIES: Category[] = [
  { id: 'phones', label: 'Phones and customers', emoji: '📞', blurb: 'Missed calls, after-hours, phone orders' },
  { id: 'scheduling', label: 'Scheduling and booking', emoji: '📅', blurb: 'No-shows, staff schedules, booking jobs' },
  { id: 'money', label: 'Quotes, invoices, and payments', emoji: '💵', blurb: 'Slow estimates, unpaid invoices' },
  { id: 'marketing', label: 'Marketing and reviews', emoji: '⭐', blurb: 'Reviews, social posts, direct orders' },
  { id: 'office', label: 'Office work and inventory', emoji: '🗂️', blurb: 'Bookkeeping, food costs, writing' },
]

export const PROBLEMS: Problem[] = [
  {
    id: 'missed-calls',
    category: 'phones',
    industries: ['restaurant', 'hvac', 'salon', 'landscaping'],
    label: 'I miss calls when I’m busy',
    noun: 'missed calls',
    labelBy: {
      restaurant: 'I miss calls during the rush',
      hvac: 'I miss calls while I’m on a job',
      salon: 'I can’t pick up while I’m with a client',
      landscaping: 'I miss calls while the crew is out',
    },
    keywords: ['miss', 'missed', 'call', 'calls', 'phone', 'ring', 'voicemail', 'answer', 'pick up', 'rush'],
    measure: 'missedCalls',
  },
  {
    id: 'after-hours',
    category: 'phones',
    industries: ['restaurant', 'hvac', 'salon', 'landscaping'],
    label: 'Customers call after we close',
    noun: 'after-hours calls',
    keywords: ['after hours', 'closed', 'night', 'weekend', 'late', 'emergency', 'overnight'],
    measure: 'missedCalls',
  },
  {
    id: 'phone-orders',
    category: 'phones',
    industries: ['restaurant'],
    label: 'Phone orders tie up my staff',
    noun: 'phone orders',
    keywords: ['order', 'orders', 'takeout', 'pickup', 'to go', 'delivery'],
    measure: 'missedCalls',
  },
  {
    id: 'no-shows',
    category: 'scheduling',
    industries: ['salon'],
    label: 'Clients don’t rebook or don’t show up',
    noun: 'no-shows and rebooking',
    keywords: ['rebook', 'no-show', 'no show', 'cancel', 'cancellations', 'come back', 'repeat', 'empty chair', 'gaps'],
    measure: 'hours',
  },
  {
    id: 'staff-scheduling',
    category: 'scheduling',
    industries: ['restaurant'],
    label: 'Building the staff schedule takes hours',
    noun: 'the staff schedule',
    keywords: ['schedule', 'shifts', 'staff', 'employees', 'servers', 'roster', 'call out', 'labor'],
    measure: 'hours',
  },
  {
    id: 'booking-jobs',
    category: 'scheduling',
    industries: ['hvac', 'landscaping'],
    label: 'Booking and dispatching jobs is messy',
    noun: 'booking jobs',
    keywords: ['book', 'booking', 'dispatch', 'appointment', 'calendar', 'schedule jobs', 'route'],
    measure: 'hours',
  },
  {
    id: 'slow-estimates',
    category: 'money',
    industries: ['hvac', 'landscaping'],
    label: 'Estimates and quotes take forever',
    noun: 'estimates',
    keywords: ['estimate', 'estimates', 'quote', 'quotes', 'bid', 'bids', 'measure', 'proposal'],
    measure: 'hours',
  },
  {
    id: 'invoice-chasing',
    category: 'money',
    industries: ['restaurant', 'hvac', 'salon', 'landscaping'],
    label: 'I spend time chasing unpaid invoices',
    noun: 'chasing invoices',
    keywords: ['invoice', 'invoices', 'unpaid', 'chase', 'payment', 'paid', 'overdue', 'collect'],
    measure: 'hours',
  },
  {
    id: 'reviews',
    category: 'marketing',
    industries: ['restaurant', 'hvac', 'salon', 'landscaping'],
    label: 'Reviews pile up and I can’t reply',
    noun: 'replying to reviews',
    keywords: ['review', 'reviews', 'yelp', 'google', 'reply', 'rating', 'stars', 'reputation'],
    measure: 'hours',
  },
  {
    id: 'social-posts',
    category: 'marketing',
    industries: ['restaurant', 'hvac', 'salon', 'landscaping'],
    label: 'I never have time to post on social media',
    noun: 'social posts',
    keywords: ['instagram', 'facebook', 'social', 'post', 'posts', 'tiktok', 'marketing', 'content', 'flyer'],
    measure: 'hours',
  },
  {
    id: 'direct-orders',
    category: 'marketing',
    industries: ['restaurant'],
    label: 'Delivery apps take a big cut',
    noun: 'delivery orders',
    keywords: ['doordash', 'uber eats', 'grubhub', 'commission', 'delivery app', 'website', 'online ordering'],
    measure: 'hours',
  },
  {
    id: 'bookkeeping',
    category: 'office',
    industries: ['restaurant', 'hvac', 'salon', 'landscaping'],
    label: 'Bookkeeping eats my evenings',
    noun: 'bookkeeping',
    keywords: ['bookkeeping', 'books', 'receipts', 'expenses', 'accounting', 'taxes', 'categorize'],
    measure: 'hours',
  },
  {
    id: 'food-costs',
    category: 'office',
    industries: ['restaurant'],
    label: 'Supplier invoices pile up and I don’t know my food costs',
    noun: 'supplier invoices',
    keywords: ['food cost', 'supplier', 'vendor invoice', 'inventory', 'margins', 'menu price', 'sysco'],
    measure: 'hours',
  },
  {
    id: 'writing',
    category: 'office',
    industries: ['restaurant', 'hvac', 'salon', 'landscaping'],
    label: 'Writing emails, menus, and job posts takes too long',
    noun: 'writing',
    keywords: ['write', 'writing', 'email', 'emails', 'menu', 'job post', 'hiring', 'description'],
    measure: 'hours',
  },
]

export const SYSTEMS: System[] = [
  { id: 'toast', label: 'Toast', kind: 'pos', short: 'To', industries: ['restaurant'] },
  { id: 'square', label: 'Square', kind: 'pos', short: 'Sq', industries: ['restaurant', 'salon', 'landscaping', 'hvac'] },
  { id: 'clover', label: 'Clover', kind: 'pos', short: 'Cl', industries: ['restaurant', 'salon'] },
  { id: 'jobber', label: 'Jobber', kind: 'fsm', short: 'Jb', industries: ['hvac', 'landscaping'] },
  { id: 'housecallpro', label: 'Housecall Pro', kind: 'fsm', short: 'HP', industries: ['hvac', 'landscaping'] },
  { id: 'servicetitan', label: 'ServiceTitan', kind: 'fsm', short: 'ST', industries: ['hvac'] },
  { id: 'vagaro', label: 'Vagaro', kind: 'booking', short: 'Va', industries: ['salon'] },
  { id: 'glossgenius', label: 'GlossGenius', kind: 'booking', short: 'GG', industries: ['salon'] },
  { id: 'quickbooks', label: 'QuickBooks', kind: 'accounting', short: 'QB', industries: ['restaurant', 'hvac', 'salon', 'landscaping'] },
  { id: 'google', label: 'Google Business Profile', kind: 'google', short: 'G', industries: ['restaurant', 'hvac', 'salon', 'landscaping'] },
  { id: 'social', label: 'Instagram / Facebook', kind: 'social', short: 'IG', industries: ['restaurant', 'hvac', 'salon', 'landscaping'] },
  { id: 'email', label: 'Gmail / Outlook calendar', kind: 'email', short: '@', industries: ['restaurant', 'hvac', 'salon', 'landscaping'] },
  { id: 'paper', label: 'Paper or nothing yet', kind: 'none', short: '✎', industries: ['restaurant', 'hvac', 'salon', 'landscaping'] },
]

export const industryById = (id: string | null) => INDUSTRIES.find((i) => i.id === id)
export const categoryById = (id: string | null) => CATEGORIES.find((c) => c.id === id)
export const problemById = (id: string) => PROBLEMS.find((p) => p.id === id)
export const systemById = (id: string) => SYSTEMS.find((s) => s.id === id)

export function problemLabel(p: Problem, industry: string | null): string {
  if (industry && p.labelBy && p.labelBy[industry as keyof typeof p.labelBy]) {
    return p.labelBy[industry as keyof typeof p.labelBy] as string
  }
  return p.label
}
