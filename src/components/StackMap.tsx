import { ArrowDown, ArrowRight, Calculator, CalendarClock, CalendarDays, Check, ClipboardList, FileText, HandCoins, Megaphone, MessageSquareText, Sparkles, PhoneIncoming, ReceiptText, ShoppingBag, Star, Truck, User, type LucideIcon } from 'lucide-react'
import { systemById } from '../lib/repo'
import type { Recipe, ScoredTool } from '../engine/recipes'
import type { Profile } from '../types'
import { Logo } from './Logo'

/**
 * "How it works for you": one plain-language lane per tool, in the order an
 * owner would see it happen. What starts it → what the AI does → where it ends
 * up → what you have to do. No technical words; Zapier is explained in passing.
 * Updates as soon as the owner changes their software in Stack Snap.
 */

const TRIGGER: Record<string, [LucideIcon, string]> = {
  'missed-calls': [PhoneIncoming, 'A customer calls'],
  'after-hours': [PhoneIncoming, 'A customer calls after you close'],
  'phone-orders': [PhoneIncoming, 'A customer calls to order'],
  'no-shows': [CalendarClock, 'An appointment is coming up'],
  'staff-scheduling': [CalendarDays, 'It’s time to make next week’s schedule'],
  'booking-jobs': [CalendarDays, 'A customer wants to book a job'],
  'slow-estimates': [Calculator, 'A customer asks for a quote'],
  'invoice-chasing': [HandCoins, 'A job is done and needs to be paid'],
  reviews: [Star, 'A customer finishes a visit'],
  'social-posts': [Megaphone, 'You want to post something new'],
  'direct-orders': [ShoppingBag, 'A customer wants to order online'],
  bookkeeping: [ReceiptText, 'Receipts and bills come in'],
  'food-costs': [Truck, 'A supplier invoice arrives'],
  writing: [FileText, 'You need to write something'],
}

type Outcome = { kind: 'auto' | 'helper' | 'own' | 'check'; where: string; system?: string; you: string }

function outcomeFor(s: ScoredTool): Outcome {
  const by = (k: string) => s.badges.find((b) => b.status === k)
  const native = by('native')
  const zap = by('zapier')
  const label = (id?: string) => (id ? (systemById(id)?.label ?? id) : '')
  if (native) return { kind: 'auto', system: label(native.system), where: `Shows up in ${label(native.system)} on its own`, you: 'Nothing. It’s already where you work.' }
  if (zap)
    return {
      kind: 'helper',
      system: label(zap.system),
      where: `A helper app (Zapier) copies it into ${label(zap.system)}`,
      you: 'Nothing after a one-time setup. Zapier’s cost is in your total.',
    }
  const unknown = by('unknown') ?? by('none')
  if (unknown && !s.tool.standalone)
    return { kind: 'check', system: label(unknown.system), where: `We couldn’t confirm it connects to ${label(unknown.system)}`, you: 'Ask the company before you buy, or plan to copy it over.' }
  const texts = /text|summary/i.test(s.tool.role)
  return {
    kind: 'own',
    where: texts ? 'You get a text or email with the details' : `You see it in the ${s.tool.name} app`,
    you: 'Glance at it once a day. Nothing to connect.',
  }
}

const KIND_STYLE: Record<Outcome['kind'], { box: string; mark: string; icon: LucideIcon }> = {
  auto: { box: 'bg-ok-soft text-ok', mark: 'bg-ok text-white', icon: Check },
  helper: { box: 'bg-warn-soft text-warn', mark: 'bg-warn text-white', icon: ArrowRight },
  own: { box: 'bg-brand-soft text-brand', mark: 'bg-brand text-white', icon: MessageSquareText },
  check: { box: 'bg-muted-soft text-ink-soft', mark: 'bg-ink-soft text-white', icon: ClipboardList },
}

function Arrow() {
  return (
    <span aria-hidden className="flex items-center justify-center text-ink/30">
      <ArrowRight size={22} className="hidden md:block" />
      <ArrowDown size={20} className="md:hidden" />
    </span>
  )
}

function Lane({ s, profile, i }: { s: ScoredTool; profile: Profile; i: number }) {
  const prob = s.tool.problems.find((p) => profile.problems.includes(p)) ?? s.tool.problems[0]
  const [TrigIcon, trigText] = TRIGGER[prob] ?? [ClipboardList, 'Work comes in']
  const o = outcomeFor(s)
  const k = KIND_STYLE[o.kind]
  const KindIcon = k.icon
  const role = s.tool.role.charAt(0).toLowerCase() + s.tool.role.slice(1)
  return (
    <li className="fade-in overflow-hidden rounded-2xl border border-black/[0.07] bg-white" style={{ animationDelay: `${i * 90}ms` }}>
      <ol className="grid items-stretch gap-2 p-3 sm:p-4 md:grid-cols-[1fr_auto_1.35fr_auto_1fr] md:gap-2.5" aria-label={`How ${s.tool.name} works for you`}>
        <li className="flex items-center gap-3 rounded-xl bg-paper p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-white">
            <TrigIcon size={18} aria-hidden />
          </span>
          <span className="text-[15px] font-semibold leading-snug">{trigText}</span>
        </li>
        <Arrow />
        <li className="relative flex items-center gap-3 rounded-xl bg-brand p-3.5 text-white shadow-[0_6px_18px_rgb(36_64_107/0.28)] ring-2 ring-accent/70">
          <Logo name={s.tool.name} size={46} />
          <span className="min-w-0 leading-snug">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-bold uppercase tracking-[0.08em] text-ink">
              <Sparkles size={11} aria-hidden /> AI does this
            </span>
            <strong className="mt-1 block font-display text-lg leading-tight">{s.tool.name}</strong>
            <span className="block text-[15px] text-fog">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
          </span>
        </li>
        <Arrow />
        <li className={`flex items-center gap-3 rounded-xl p-3 ${k.box}`}>
          {o.system ? (
            <span className="relative shrink-0">
              <Logo name={o.system} size={40} />
              <span className={`absolute -bottom-1.5 -right-2 grid h-4 w-4 place-items-center rounded-full ring-2 ring-white ${k.mark}`}>
                <KindIcon size={10} strokeWidth={3} aria-hidden />
              </span>
            </span>
          ) : (
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${k.mark}`}>
              <KindIcon size={18} aria-hidden />
            </span>
          )}
          <span className="text-[15px] font-semibold leading-snug">{o.where}</span>
        </li>
      </ol>
      <p className="flex items-center gap-2.5 border-t border-black/[0.06] bg-paper/60 px-4 py-2.5 text-[15px] sm:px-5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-ink">
          <User size={15} aria-hidden />
        </span>
        <span>
          <strong className="font-semibold">Your part:</strong> {o.you}
        </span>
      </p>
    </li>
  )
}

export function StackMap({ recipe, profile }: { recipe: Recipe; profile: Profile }) {
  const autos = recipe.items.filter((s) => outcomeFor(s).kind === 'auto').length
  return (
    <section aria-labelledby="how-for-you">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id="how-for-you" className="text-xl font-semibold tracking-tight">
            How it works for you
          </h3>
          <p className="text-ink-soft">What happens, step by step, once it’s set up.</p>
        </div>
        <p className="text-sm text-ink-soft">
          {(() => {
            const n = recipe.items.length
            if (n === 1) return autos ? 'It sends its work into your software automatically.' : 'It works on its own; nothing to connect.'
            if (autos === 0) return 'These work on their own; nothing to connect.'
            return autos === n ? `All ${n} send their work into your software automatically.` : `${autos} of ${n} send their work into your software automatically.`
          })()}
        </p>
      </div>
      <ul key={profile.systems.join()} className="mt-4 space-y-3">
        {recipe.items.map((s, i) => (
          <Lane key={s.tool.id} s={s} profile={profile} i={i} />
        ))}
      </ul>
      <p className="mt-3 text-sm text-ink-soft">Change your software with “Add or change” above and these steps update.</p>
    </section>
  )
}
