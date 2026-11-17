import { useState, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { load, save, track } from '../lib/storage'
import type { Profile } from '../types'
import { Button } from './ui'

export interface Need {
  text: string
  industry: string | null
  problems: string[]
  at: string
  /** 'profession' = someone picked "Something else" and typed a business we don't cover yet */
  kind?: 'need' | 'profession'
}

export const getNeeds = () => load<Need[]>('tb.needs', [])

/** Log a profession we don't cover yet; the counts decide which profession to add next. */
export function logProfession(profession: string, type: string) {
  save('tb.needs', [...getNeeds(), { text: profession, industry: type, problems: [], at: new Date().toISOString(), kind: 'profession' }])
  track('profession_requested', { profession, type })
}

/** Most-requested professions, highest first */
export function professionCounts(): [string, number][] {
  const counts = new Map<string, number>()
  for (const n of getNeeds()) if (n.kind === 'profession') counts.set(n.text.toLowerCase(), (counts.get(n.text.toLowerCase()) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

/** "Tell us what you need": logs an unmet need. Later these feed a public board vendors can see. */
export function NeedForm({ profile }: { profile: Profile }) {
  const [sent, setSent] = useState(false)
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const text = String(new FormData(e.currentTarget).get('need') || '').trim()
    if (!text) return
    save('tb.needs', [...getNeeds(), { text, industry: profile.industry, problems: profile.problems, at: new Date().toISOString() }])
    track('need_submitted', { industry: profile.industry })
    setSent(true)
  }
  if (sent)
    return (
      <p className="fade-in mt-3 flex items-center gap-2 rounded-xl bg-ok-soft p-3 text-ok">
        <CheckCircle2 size={18} aria-hidden /> Thanks. Your request is logged as an unmet need.
      </p>
    )
  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <label htmlFor="need" className="text-sm font-semibold">
        What do you wish a tool could do for your business?
      </label>
      <textarea id="need" name="need" rows={2} required placeholder="For example: answer calls in Spanish and book into my calendar" className="w-full rounded-xl border-2 border-line bg-white p-3 focus:border-brand focus:outline-none" />
      <Button type="submit" size="sm">
        Send request
      </Button>
    </form>
  )
}
