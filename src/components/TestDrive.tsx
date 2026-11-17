import { useEffect, useRef, useState } from 'react'
import { Pause, Phone, Play, Volume2 } from 'lucide-react'
import { titleCase } from '../lib/business'
import { badgesFor } from '../engine/recipes'
import { systemById } from '../lib/repo'
import { track } from '../lib/storage'
import type { BusinessTypeId, IndustryId, Profile, Tool } from '../types'
import { Button, Drawer } from './ui'

type Scenario = 'question' | 'book' | 'unusual'
interface Line {
  who: 'caller' | 'ai'
  text: string
}

const DEFAULTS: Record<IndustryId, { name: string; hours: string }> = {
  restaurant: { name: 'Main Street Kitchen', hours: '11 am to 9 pm' },
  hvac: { name: 'Bowie Heating and Air', hours: '7 am to 6 pm' },
  salon: { name: 'Studio Nine Salon', hours: '9 am to 7 pm' },
  landscaping: { name: 'Greenway Lawn Care', hours: '7 am to 5 pm' },
}

/** Builds a short, believable call. Whether the order or booking lands in the
 *  owner's software depends on the tool's real documented connection. */
function script(industry: IndustryId, scenario: Scenario, name: string, hours: string, lands: string | null): Line[] {
  const saved = lands ? `It’s already in ${lands}.` : `I’ve texted the details to the team so they can enter it.`
  const S: Record<IndustryId, Record<Scenario, Line[]>> = {
    restaurant: {
      question: [
        { who: 'ai', text: `Thanks for calling ${name}! How can I help?` },
        { who: 'caller', text: 'Hi, are you open tonight, and do you have gluten-free options?' },
        { who: 'ai', text: `Yes, we’re open today from ${hours}, and we have gluten-free pasta and salads. Would you like to place an order for pickup?` },
      ],
      book: [
        { who: 'ai', text: `Thanks for calling ${name}! How can I help?` },
        { who: 'caller', text: 'Can I order a large pepperoni pizza for pickup?' },
        { who: 'ai', text: 'Absolutely. One large pepperoni for pickup. Can I get a name for the order?' },
        { who: 'caller', text: 'Sam.' },
        { who: 'ai', text: `Thanks, Sam. It’ll be ready in about twenty minutes. ${saved}` },
      ],
      unusual: [
        { who: 'ai', text: `Thanks for calling ${name}! How can I help?` },
        { who: 'caller', text: 'Do you cater weddings for three hundred people?' },
        { who: 'ai', text: 'That’s a great question for our manager. I can’t book that over the phone, but I’ll take your name and number and have them call you back today.' },
      ],
    },
    hvac: {
      question: [
        { who: 'ai', text: `Thanks for calling ${name}. How can I help?` },
        { who: 'caller', text: 'What are your hours, and do you service heat pumps?' },
        { who: 'ai', text: `We’re open ${hours}, and yes, we repair and install heat pumps. Would you like to book a visit?` },
      ],
      book: [
        { who: 'ai', text: `Thanks for calling ${name}. How can I help?` },
        { who: 'caller', text: 'My AC stopped working. Can someone come today?' },
        { who: 'ai', text: 'I’m sorry to hear that. The earliest opening is today at three. What’s the address?' },
        { who: 'caller', text: '12 Oak Street in Bowie.' },
        { who: 'ai', text: `You’re booked for three o’clock at 12 Oak Street. ${saved}` },
      ],
      unusual: [
        { who: 'ai', text: `Thanks for calling ${name}. How can I help?` },
        { who: 'caller', text: 'Can you fix my refrigerator?' },
        { who: 'ai', text: 'We don’t repair refrigerators, sorry about that. We handle heating and cooling. Is there anything with your AC or furnace I can help with?' },
      ],
    },
    salon: {
      question: [
        { who: 'ai', text: `Thanks for calling ${name}! How can I help?` },
        { who: 'caller', text: 'How much is a women’s haircut, and are you open Sunday?' },
        { who: 'ai', text: `A women’s cut starts at fifty-five dollars. We’re open ${hours}, Tuesday through Saturday. Want me to find you a time?` },
      ],
      book: [
        { who: 'ai', text: `Thanks for calling ${name}! How can I help?` },
        { who: 'caller', text: 'Can I book a haircut with Maria on Saturday morning?' },
        { who: 'ai', text: 'Maria has ten or eleven thirty open on Saturday. Which works better?' },
        { who: 'caller', text: 'Ten, please.' },
        { who: 'ai', text: `You’re booked with Maria at ten on Saturday. You’ll get a reminder text the day before. ${saved}` },
      ],
      unusual: [
        { who: 'ai', text: `Thanks for calling ${name}! How can I help?` },
        { who: 'caller', text: 'Do you do tattoos?' },
        { who: 'ai', text: 'We don’t offer tattoos, sorry. We do cuts, color, and styling. Can I book you for any of those?' },
      ],
    },
    landscaping: {
      question: [
        { who: 'ai', text: `Thanks for calling ${name}. How can I help?` },
        { who: 'caller', text: 'Do you do weekly mowing in Bowie?' },
        { who: 'ai', text: `Yes, we mow weekly in Bowie, and we’re reachable ${hours}. Would you like a free quote?` },
      ],
      book: [
        { who: 'ai', text: `Thanks for calling ${name}. How can I help?` },
        { who: 'caller', text: 'I’d like a quote for spring cleanup and mulch.' },
        { who: 'ai', text: 'Happy to help. What’s the property address?' },
        { who: 'caller', text: '48 Maple Drive.' },
        { who: 'ai', text: `Thanks. Someone will come by Thursday morning to measure. ${saved}` },
      ],
      unusual: [
        { who: 'ai', text: `Thanks for calling ${name}. How can I help?` },
        { who: 'caller', text: 'Can you cut down a forty-foot oak tree?' },
        { who: 'ai', text: 'Large tree removal is outside what we do safely. I’ll take your number, and the owner can recommend a licensed arborist.' },
      ],
    },
  }
  return S[industry][scenario]
}

const GENERIC_HOURS: Record<BusinessTypeId, string> = { appointments: '9 am to 6 pm', field: '7 am to 5 pm', shop: '10 am to 7 pm' }

/** Calls for professions we haven't added yet: no trade-specific details, so nothing rings false. */
function genericScript(type: BusinessTypeId, scenario: Scenario, name: string, hours: string, lands: string | null): Line[] {
  const saved = lands ? `It’s already in ${lands}.` : `I’ve texted the details to the team so they can enter it.`
  const hello: Line = { who: 'ai', text: `Thanks for calling ${name}! How can I help?` }
  const unusual: Line[] = [
    hello,
    { who: 'caller', text: 'Is the owner there? I have a big custom request.' },
    { who: 'ai', text: 'They’re with a customer right now. I can’t promise that over the phone, but I’ll take your name and number and have them call you back today.' },
  ]
  const S: Record<BusinessTypeId, Record<Scenario, Line[]>> = {
    appointments: {
      question: [hello, { who: 'caller', text: 'What are your hours, and are you taking new clients?' }, { who: 'ai', text: `We’re open ${hours}, and yes, we’re taking new clients. Want me to find you a time?` }],
      book: [
        hello,
        { who: 'caller', text: 'Can I book an appointment for Saturday morning?' },
        { who: 'ai', text: 'We have ten or eleven thirty open on Saturday. Which works better?' },
        { who: 'caller', text: 'Ten, please.' },
        { who: 'ai', text: `You’re booked at ten on Saturday, and you’ll get a reminder the day before. ${saved}` },
      ],
      unusual,
    },
    field: {
      question: [hello, { who: 'caller', text: 'Do you work in Bowie, and what are your hours?' }, { who: 'ai', text: `Yes, we serve the Bowie area, and we’re reachable ${hours}. Would you like to set up a visit?` }],
      book: [
        hello,
        { who: 'caller', text: 'I need someone to come out this week.' },
        { who: 'ai', text: 'Happy to help. What’s the address?' },
        { who: 'caller', text: '12 Oak Street in Bowie.' },
        { who: 'ai', text: `You’re set for Thursday morning at 12 Oak Street. ${saved}` },
      ],
      unusual,
    },
    shop: {
      question: [hello, { who: 'caller', text: 'Are you open today, and is there parking?' }, { who: 'ai', text: `Yes, we’re open today from ${hours}, and there’s parking out front. Anything else I can help with?` }],
      book: [
        hello,
        { who: 'caller', text: 'Can I place an order for pickup tomorrow?' },
        { who: 'ai', text: 'Absolutely. What would you like, and what name should I put it under?' },
        { who: 'caller', text: 'Two of your best sellers, under Sam.' },
        { who: 'ai', text: `Got it, Sam. It’ll be ready tomorrow morning. ${saved}` },
      ],
      unusual,
    },
  }
  return S[type][scenario]
}

export function TestDrive({ tool, profile, onClose }: { tool: Tool | null; profile: Profile; onClose: () => void }) {
  const ind = (profile.industry ?? 'restaurant') as IndustryId
  const other = profile.other
  const defaultName = other ? `Main Street ${titleCase(other.profession)}` : DEFAULTS[ind].name
  const defaultHours = other ? GENERIC_HOURS[other.type] : DEFAULTS[ind].hours
  const [name, setName] = useState(profile.businessName || defaultName)
  const [hours, setHours] = useState(defaultHours)
  const [scenario, setScenario] = useState<Scenario>('book')
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(-1)
  const cancelled = useRef(false)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => () => window.speechSynthesis?.cancel(), [])
  if (!tool) return null

  const native = badgesFor(tool, profile.systems).find((b) => b.status === 'native' && ['pos', 'fsm', 'booking'].includes(systemById(b.system)!.kind))
  const lands = native ? systemById(native.system)!.label : null
  const n = name || defaultName
  const h = hours || defaultHours
  const lines = other ? genericScript(other.type, scenario, n, h, lands) : script(ind, scenario, n, h, lands)

  const stop = () => {
    cancelled.current = true
    window.speechSynthesis?.cancel()
    setPlaying(false)
    setCurrent(-1)
  }

  const play = () => {
    track('test_drive_played', { tool: tool.id, scenario })
    if (!canSpeak) {
      setCurrent(lines.length - 1)
      return
    }
    cancelled.current = false
    window.speechSynthesis.cancel()
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
    const aiVoice = voices.find((v) => /female|samantha|zira|aria|jenny/i.test(v.name)) ?? voices[0]
    const callerVoice = voices.find((v) => v !== aiVoice && /male|daniel|david|guy|alex/i.test(v.name)) ?? voices[1] ?? voices[0]
    setPlaying(true)
    const speak = (i: number) => {
      if (cancelled.current || i >= lines.length) {
        setPlaying(false)
        return
      }
      setCurrent(i)
      const u = new SpeechSynthesisUtterance(lines[i].text)
      const v = lines[i].who === 'ai' ? aiVoice : callerVoice
      if (v) u.voice = v
      u.pitch = lines[i].who === 'ai' ? 1.1 : 0.85
      u.rate = 1
      u.onend = () => setTimeout(() => speak(i + 1), 350)
      u.onerror = () => {
        setPlaying(false)
        setCurrent(lines.length - 1)
      }
      window.speechSynthesis.speak(u)
    }
    speak(0)
  }

  const close = () => {
    stop()
    onClose()
  }

  return (
    <Drawer open={!!tool} onClose={close} title="Hear it answer your phone">
      <p className="rounded-xl bg-accent-soft p-3 text-sm">
        <strong>Simulation.</strong> This shows what an AI receptionist like {tool.name} does, using your business details. It is not the vendor’s actual voice or product.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Your business name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-line bg-white p-2 focus:border-brand focus:outline-none" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Your hours</span>
          <input value={hours} onChange={(e) => setHours(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-line bg-white p-2 focus:border-brand focus:outline-none" />
        </label>
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">What the caller wants</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              ['question', 'A quick question'],
              ['book', (other ? other.type === 'shop' : ind === 'restaurant') ? 'Place an order' : 'Book a visit'],
              ['unusual', 'Something you don’t offer'],
            ] as [Scenario, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={scenario === k}
              onClick={() => {
                stop()
                setScenario(k)
              }}
              className={`min-h-11 rounded-xl border-2 px-3 text-sm font-semibold ${scenario === k ? 'border-brand bg-brand-soft' : 'border-line bg-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 rounded-2xl bg-ink p-4 text-white">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm text-fog">
            <Phone size={16} aria-hidden /> Incoming call · {name}
          </p>
          {playing ? (
            <Button size="sm" variant="accent" onClick={stop}>
              <Pause size={16} aria-hidden /> Stop
            </Button>
          ) : (
            <Button size="sm" variant="accent" onClick={play}>
              {canSpeak ? <Play size={16} aria-hidden /> : <Volume2 size={16} aria-hidden />} {canSpeak ? 'Play the call' : 'Show the call'}
            </Button>
          )}
        </div>
        <ol className="space-y-2" aria-live="polite">
          {lines.map((l, i) => (
            <li
              key={i}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm transition ${l.who === 'ai' ? 'bg-brand text-white' : 'ml-auto bg-white text-ink'} ${current === -1 || i <= current ? 'opacity-100' : 'opacity-35'} ${i === current ? 'ring-2 ring-accent' : ''}`}
            >
              <span className="block text-xs font-semibold opacity-80">{l.who === 'ai' ? 'AI receptionist' : 'Caller'}</span>
              {l.text}
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        {lands
          ? `${tool.name} connects directly to ${lands}, so orders or bookings land there automatically.`
          : `${tool.name} doesn’t send this into your software automatically, so someone still copies it over. Tools that connect directly save that step.`}{' '}
        The “Something you don’t offer” call shows why you should test with tricky questions before going live.
      </p>
    </Drawer>
  )
}
