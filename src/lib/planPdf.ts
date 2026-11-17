/**
 * Branded PDF of the owner's plan: tools, monthly receipt, 30-day steps, and
 * what happens next. Three pages at most. Built in the browser with jsPDF,
 * which is loaded only when someone taps "Download PDF".
 *
 * jsPDF's built-in fonts only cover plain ASCII, so we embed static Inter
 * files (public/fonts) made from the same fonts the site uses.
 */
import type { jsPDF as JsPDF } from 'jspdf'
import { logoUrl, initials, monogramColors } from '../components/Logo'
import type { Tool } from '../types'

export interface PdfStep {
  id: string
  day: number
  title: string
  how: string
  tool: string
}

export interface PlanPdfInput {
  business: string
  recipeName: string
  start: Date
  tools: Tool[]
  connects: Record<string, string[]>
  problems: string[]
  software: string[]
  receipt: { label: string; note?: string; amount: number | null }[]
  total: number
  quotes: number
  budget: number | null
  overBudget: boolean
  setupHours: number | null
  covered: number | null
  problemCount: number
  steps: PdfStep[]
  done: Set<string>
  checked: string
  origin: string
  links: { sba: string; score: string; sbdc: string }
}

type RGB = [number, number, number]
const C: Record<string, RGB> = {
  ink: [26, 34, 51],
  soft: [75, 82, 99],
  paper: [243, 240, 232],
  line: [226, 221, 209],
  brand: [36, 64, 107],
  brandSoft: [228, 234, 244],
  accent: [255, 216, 77],
  accentSoft: [255, 244, 199],
  fog: [201, 207, 220],
  ok: [23, 115, 63],
  okSoft: [220, 239, 227],
  bad: [194, 54, 43],
  white: [255, 255, 255],
}

const W = 612 // US Letter, points
const H = 792
const M = 44
const CW = W - M * 2
const BOTTOM = H - 46

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const clean = (t: string) => t.replace(/→/g, 'to').replace(/✓\s?/g, '').replace(/\s+/g, ' ').trim()
const usd = (n: number) => `$${n.toFixed(2)}`
const fmtDate = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-US', o)

async function toBase64(url: string) {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Draw any logo (PNG or SVG) onto a white square so jsPDF gets a plain PNG */
async function logoPng(url: string): Promise<string | null> {
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const S = 128
    const cv = document.createElement('canvas')
    cv.width = cv.height = S
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, S, S)
    const w = img.naturalWidth || S
    const h = img.naturalHeight || S
    const k = Math.min((S * 0.8) / w, (S * 0.8) / h)
    ctx.drawImage(img, (S - w * k) / 2, (S - h * k) / 2, w * k, h * k)
    return cv.toDataURL('image/png')
  } catch {
    return null
  }
}

export async function downloadPlanPdf(input: PlanPdfInput) {
  const { jsPDF } = await import('jspdf')
  const [reg, bold, display, brandLogo] = await Promise.all([
    toBase64('/fonts/Inter-Regular.ttf'),
    toBase64('/fonts/Inter-Bold.ttf'),
    toBase64('/fonts/InterTight-Bold.ttf'),
    toBase64('/brand/logo-256.png'),
  ])
  const logos: Record<string, string | null> = {}
  await Promise.all(
    input.tools.map(async (t) => {
      const u = logoUrl(t.name)
      logos[t.id] = u ? await logoPng(u) : null
    }),
  )

  // Full detail first. If that runs past three pages, tighten in steps:
  // 1 drops the "how" lines, 2 also trims tool blurbs and the next-steps text.
  const assets = { reg, bold, display, brandLogo, logos }
  let doc = build(jsPDF, input, assets, 0)
  for (let level = 1; level <= 2 && doc.getNumberOfPages() > 3; level++) doc = build(jsPDF, input, assets, level)
  const slug = input.recipeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  await doc.save(`ToolRecipe-plan-${slug}.pdf`, { returnPromise: true })
}

interface Assets {
  reg: string
  bold: string
  display: string
  brandLogo: string
  logos: Record<string, string | null>
}

function build(jsPDF: typeof JsPDF, d: PlanPdfInput, a: Assets, level: number): JsPDF {
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'letter', putOnlyUsedFonts: true })
  doc.addFileToVFS('Inter-Regular.ttf', a.reg)
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal')
  doc.addFileToVFS('Inter-Bold.ttf', a.bold)
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold')
  doc.addFileToVFS('InterTight-Bold.ttf', a.display)
  doc.addFont('InterTight-Bold.ttf', 'InterTight', 'bold')
  doc.setProperties({ title: `ToolRecipe plan: ${d.recipeName} recipe`, subject: '30-day AI plan and monthly receipt', author: 'ToolRecipe', creator: 'ToolRecipe' })
  doc.setLineHeightFactor(1.3)

  let y = 0
  const tight = level >= 1 // smaller gaps when we're squeezing into three pages
  const gap = tight ? 16 : 22
  const font = (size: number, style: 'normal' | 'bold' | 'display' = 'normal', color: RGB = C.ink) => {
    if (style === 'display') doc.setFont('InterTight', 'bold')
    else doc.setFont('Inter', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }
  const fill = (c: RGB) => doc.setFillColor(...c)
  const stroke = (c: RGB) => doc.setDrawColor(...c)
  const lines = (t: string, w: number): string[] => doc.splitTextToSize(clean(t), w)
  const lh = (size: number) => size * 1.3

  const pageHeader = () => {
    doc.addImage(a.brandLogo, 'PNG', M, 26, 22, 22)
    font(12, 'display')
    doc.text('ToolRecipe', M + 30, 41)
    font(9, 'normal', C.soft)
    doc.text(`Your 30-day AI plan · ${d.business}`, W - M, 41, { align: 'right' })
    stroke(C.line)
    doc.setLineWidth(0.75)
    doc.line(M, 58, W - M, 58)
    y = 84
  }
  const newPage = () => {
    doc.addPage()
    pageHeader()
  }
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage()
  }
  const h2 = (t: string, sub?: string) => {
    ensure(sub ? 46 : 32)
    fill(C.accent)
    doc.rect(M, y - 11, 4, 15, 'F')
    font(14, 'display')
    doc.text(t, M + 12, y)
    y += 8
    if (sub) {
      font(9.5, 'normal', C.soft)
      y += 9
      doc.text(clean(sub), M + 12, y)
      y += 4
    }
    y += 12
  }

  // ---------- Page 1: the band ----------
  fill(C.brand)
  doc.rect(0, 0, W, 112, 'F')
  fill(C.accent)
  doc.rect(0, 112, W, 4, 'F')
  doc.addImage(a.brandLogo, 'PNG', M, 34, 44, 44)
  font(24, 'display', C.white)
  doc.text('ToolRecipe', M + 56, 58)
  font(10, 'normal', C.fog)
  doc.text('AI tools that fit your small business', M + 56, 74)
  font(8.5, 'bold', C.accent)
  doc.text('30-DAY AI PLAN', W - M, 52, { align: 'right', charSpace: 1.4 })
  font(10, 'normal', C.fog)
  doc.text(`Prepared ${fmtDate(new Date(), { month: 'short', day: 'numeric', year: 'numeric' })}`, W - M, 68, { align: 'right' })

  y = tight ? 150 : 156
  font(26, 'display')
  doc.text('Your 30-day AI plan', M, y)
  y += 20
  font(11, 'normal', C.soft)
  doc.text(clean(`${d.recipeName} recipe · ${d.business} · Day 1 is ${fmtDate(d.start, { weekday: 'long', month: 'short', day: 'numeric' })}`), M, y)
  y += 22

  // Stat cards
  const checkin = new Date(d.start.getTime() + 29 * 86400000)
  const stats: [string, string, string, RGB][] = [
    ['MONTHLY TOTAL', `${usd(d.total)}`, d.quotes ? '+ a vendor quote' : d.budget === null ? 'every fee we found' : d.overBudget ? `Over your $${d.budget} budget` : `Within your $${d.budget} budget`, d.budget !== null && !d.quotes ? (d.overBudget ? C.bad : C.ok) : C.soft],
    ['SETUP TIME', d.setupHours === null ? 'Varies' : d.setupHours < 1 ? `${Math.round(d.setupHours * 60)} min` : `About ${Math.round(d.setupHours)} hr${Math.round(d.setupHours) === 1 ? '' : 's'}`, 'spread over 30 days', C.soft],
    ['PROBLEMS SOLVED', d.covered === null ? `${d.problemCount}` : `${d.covered} of ${d.problemCount}`, d.covered !== null && d.covered < d.problemCount ? 'see your other recipes' : 'from your answers', C.soft],
    ['CHECK-IN', fmtDate(checkin, { month: 'short', day: 'numeric' }), fmtDate(checkin, { weekday: 'long' }), C.soft],
  ]
  const cw = (CW - 30) / 4
  const sh = tight ? 56 : 64
  stats.forEach(([label, value, sub, subColor], i) => {
    const x = M + i * (cw + 10)
    fill(i === 0 ? C.accentSoft : C.paper)
    doc.roundedRect(x, y, cw, sh, 8, 8, 'F')
    font(7.5, 'bold', C.soft)
    doc.text(label, x + 12, y + (tight ? 15 : 18), { charSpace: 0.6 })
    font(19, 'display')
    doc.text(value, x + 12, y + (tight ? 35 : 40))
    font(8.5, 'normal', subColor)
    doc.text(clean(sub), x + 12, y + (tight ? 48 : 54))
  })
  y += sh + gap + 8

  // What you told us
  h2('What you told us')
  font(9.5, 'bold', C.brand)
  let cx = M
  for (const p of d.problems) {
    const t = clean(p)
    const w = doc.getTextWidth(t) + 20
    if (cx + w > W - M) {
      cx = M
      y += 24
    }
    fill(C.brandSoft)
    doc.roundedRect(cx, y - 13, w, 20, 10, 10, 'F')
    doc.text(t, cx + 10, y)
    cx += w + 8
  }
  y += 22
  if (d.software.length) {
    font(9.5, 'normal', C.soft)
    const sw = lines(`Software you use: ${d.software.join(', ')}`, CW)
    doc.text(sw, M, y)
    y += sw.length * lh(9.5)
  }
  y += gap - 4

  // Your tools
  h2('Your tools')
  d.tools.forEach((t, i) => {
    const textW = CW - 46 - 80
    font(9.5)
    const does = level >= 2 ? lines(t.does, textW).slice(0, 1) : lines(t.does, textW)
    const c = d.connects[t.id] ?? []
    const conn = lines(c.length ? `Connects to ${c.join(', ')}` : 'Works on its own', textW)
    const rowH = Math.max(36, 16 + does.length * lh(9.5) + conn.length * lh(8.5) + 6)
    ensure(rowH + 10)
    const top = y
    const img = a.logos[t.id]
    if (img) {
      stroke(C.line)
      doc.setLineWidth(0.75)
      fill(C.white)
      doc.roundedRect(M, top - 2, 32, 32, 8, 8, 'FD')
      doc.addImage(img, 'PNG', M + 3, top + 1, 26, 26)
    } else {
      const [fg, bg] = monogramColors(t.name)
      fill(hex(bg))
      doc.roundedRect(M, top - 2, 32, 32, 8, 8, 'F')
      font(11, 'display', hex(fg))
      doc.text(initials(t.name), M + 16, top + 18, { align: 'center' })
    }
    font(11.5, 'bold')
    doc.text(clean(t.name), M + 46, top + 10)
    doc.text(t.price === null ? 'Quote' : t.price === 0 ? 'Included' : `${usd(t.price)}/mo`, W - M, top + 10, { align: 'right' })
    font(9.5, 'normal', C.soft)
    let ty = top + 25
    doc.text(does, M + 46, ty)
    ty += does.length * lh(9.5)
    font(8.5, 'bold', c.length ? C.ok : C.soft)
    doc.text(conn, M + 46, ty)
    y = top + rowH
    if (i < d.tools.length - 1) {
      stroke(C.line)
      doc.setLineWidth(0.5)
      doc.line(M + 46, y, W - M, y)
      y += tight ? 9 : 12
    }
  })
  y += gap

  // Receipt (kept together on one page)
  const rw = CW
  const rowH = tight ? 15 : 18
  const rowsH = d.receipt.reduce((h, l) => {
    font(8.5)
    return h + rowH + (l.note ? lines(l.note, rw - 40).length * lh(8.5) + (tight ? 3 : 0) : 0)
  }, 0)
  const receiptH = (tight ? 34 : 40) + rowsH + (tight ? 44 : 50) + (d.quotes ? 14 : 0)
  ensure(receiptH + 24)
  h2('What you’ll pay each month')
  const rTop = y - 4
  stroke(C.soft)
  doc.setLineWidth(0.75)
  doc.setLineDashPattern([3, 2], 0)
  fill(C.white)
  doc.roundedRect(M, rTop, rw, receiptH, 6, 6, 'D')
  doc.setLineDashPattern([], 0)
  y = rTop + (tight ? 22 : 26)
  for (const l of d.receipt) {
    font(10)
    const label = clean(l.label)
    const amt = l.amount === null ? 'quote' : usd(l.amount)
    doc.text(label, M + 20, y)
    doc.text(amt, W - M - 20, y, { align: 'right' })
    const lx = M + 26 + doc.getTextWidth(label)
    const rx = W - M - 26 - doc.getTextWidth(amt)
    if (rx > lx) {
      stroke(C.fog)
      doc.setLineWidth(0.8)
      doc.setLineDashPattern([0.8, 2.2], 0)
      doc.line(lx, y - 2, rx, y - 2)
      doc.setLineDashPattern([], 0)
    }
    y += rowH
    if (l.note) {
      font(8.5, 'normal', C.soft)
      const n = lines(l.note, rw - 40)
      doc.text(n, M + 20, y - (tight ? 3 : 6))
      y += n.length * lh(8.5) + (tight ? 3 : 0)
    }
  }
  stroke(C.ink)
  doc.setLineWidth(1.5)
  doc.line(M + 20, y, W - M - 20, y)
  y += tight ? 17 : 20
  font(11, 'bold')
  doc.text('TOTAL', M + 20, y)
  font(14, 'display')
  doc.text(`${usd(d.total)}/mo${d.quotes ? ' + quote' : ''}`, W - M - 20, y, { align: 'right' })
  y += 16
  if (d.budget !== null) {
    font(9, 'bold', d.overBudget ? C.bad : C.ok)
    doc.text(d.overBudget ? `Over your $${d.budget} budget` : `Within your $${d.budget} budget`, W - M - 20, y, { align: 'right' })
  }
  font(8.5, 'normal', C.soft)
  doc.text(`Prices checked ${d.checked}. Confirm with each vendor before you buy.`, M + 20, y)
  if (d.quotes) {
    y += 14
    doc.text(`${d.quotes} tool${d.quotes > 1 ? 's don’t' : ' doesn’t'} publish a price; ask the vendor for a quote.`, M + 20, y)
  }
  y = rTop + receiptH + 10

  // ---------- The 30-day plan ----------
  // Starts its own page after page 1; if the receipt already spilled over, it carries on below it.
  if (doc.getNumberOfPages() === 1 || y + 160 > BOTTOM) newPage()
  else y += 24
  font(22, 'display')
  doc.text('Your 30-day plan', M, y)
  y += 18
  font(10, 'normal', C.soft)
  const doneN = d.steps.filter((s) => d.done.has(s.id)).length
  doc.text(`One small step at a time, one tool a week. ${doneN} of ${d.steps.length} steps done.`, M, y)
  y += 12
  fill(C.paper)
  doc.roundedRect(M, y, CW, 6, 3, 3, 'F')
  if (doneN) {
    fill(C.ok)
    doc.roundedRect(M, y, Math.max(6, (CW * doneN) / d.steps.length), 6, 3, 3, 'F')
  }
  y += 28

  const dateOf = (day: number) => new Date(d.start.getTime() + (day - 1) * 86400000)
  const weeks = [1, 2, 3, 4]
    .map((w) => ({ w, from: (w - 1) * 7 + 1, to: w === 4 ? 30 : w * 7, steps: d.steps.filter((s) => Math.min(4, Math.ceil(s.day / 7)) === w) }))
    .filter((x) => x.steps.length)
  const titleW = CW - 60 - 96
  for (const wk of weeks) {
    ensure(26 + 40)
    fill(C.brandSoft)
    doc.roundedRect(M, y - 14, CW, 22, 6, 6, 'F')
    font(10, 'bold', C.brand)
    doc.text(`Week ${wk.w}`, M + 10, y + 1)
    font(9.5, 'normal', C.brand)
    doc.text(`${fmtDate(dateOf(wk.from), { month: 'short', day: 'numeric' })} to ${fmtDate(dateOf(wk.to), { month: 'short', day: 'numeric' })}`, W - M - 10, y + 1, { align: 'right' })
    y += 26
    for (const s of wk.steps) {
      font(10.5, 'bold')
      const title = lines(s.title, titleW)
      font(8.8)
      const how = level >= 1 ? [] : lines(s.how, titleW)
      const h = 6 + title.length * lh(10.5) + 12 + how.length * lh(8.8) + 8
      ensure(h)
      const top = y
      const isDone = d.done.has(s.id)
      // checkbox
      stroke(isDone ? C.ok : C.soft)
      doc.setLineWidth(1)
      fill(isDone ? C.ok : C.white)
      doc.roundedRect(M + 2, top - 9, 12, 12, 2.5, 2.5, isDone ? 'FD' : 'D')
      if (isDone) {
        stroke(C.white)
        doc.setLineWidth(1.6)
        doc.line(M + 4.8, top - 3.2, M + 7.2, top - 0.8)
        doc.line(M + 7.2, top - 0.8, M + 11.4, top - 6)
      }
      font(6.5, 'bold', C.soft)
      doc.text('DAY', M + 36, top - 5, { align: 'center', charSpace: 0.6 })
      font(14, 'display')
      doc.text(String(s.day), M + 36, top + 9, { align: 'center' })
      font(10.5, 'bold', isDone ? C.soft : C.ink)
      doc.text(title, M + 60, top)
      let ty = top + title.length * lh(10.5) - 1
      font(8.8, 'bold', C.brand)
      const when = fmtDate(dateOf(s.day), { weekday: 'short', month: 'short', day: 'numeric' })
      doc.text(when, M + 60, ty)
      if (how.length) {
        ty += lh(8.8)
        font(8.8, 'normal', C.soft)
        doc.text(how, M + 60, ty)
      }
      // tool tag
      const tag = clean(s.tool === 'All' ? 'All tools' : s.tool)
      font(8, 'bold', C.soft)
      const tw = Math.min(90, doc.getTextWidth(tag) + 14)
      fill(C.paper)
      doc.roundedRect(W - M - tw, top - 10, tw, 15, 7.5, 7.5, 'F')
      doc.text(doc.splitTextToSize(tag, tw - 10)[0], W - M - tw / 2, top, { align: 'center' })
      y = top + h
    }
    y += 6
  }

  // ---------- What happens next ----------
  // Cards and links each keep themselves together; the section can start low on a page.
  if (y + 130 > BOTTOM) newPage()
  else y += 14
  h2('What happens next')

  const card = (bg: RGB, title: string, body: string, link?: { text: string; url: string }) => {
    font(10)
    const b = lines(body, CW - 36)
    const ch = 22 + lh(13) + b.length * lh(10) + (link ? 18 : 0) + 6
    ensure(ch + 10)
    fill(bg)
    doc.roundedRect(M, y, CW, ch, 10, 10, 'F')
    let ty = y + 26
    font(13, 'display')
    doc.text(clean(title), M + 18, ty)
    ty += lh(13) + 2
    font(10, 'normal', C.ink)
    doc.text(b, M + 18, ty)
    ty += b.length * lh(10)
    if (link) {
      ty += 6
      font(10, 'bold', C.brand)
      doc.textWithLink(link.text, M + 18, ty, { url: link.url })
      const lw = doc.getTextWidth(link.text)
      stroke(C.brand)
      doc.setLineWidth(0.6)
      doc.line(M + 18, ty + 2, M + 18 + lw, ty + 2)
    }
    y += ch + 12
  }

  card(
    C.accentSoft,
    `Your day-30 check-in: ${fmtDate(checkin, { weekday: 'long', month: 'long', day: 'numeric' })}`,
    level >= 2
      ? 'A 2-minute check-in: is each tool working and worth the money? We’ll suggest fixes or better-fit tools.'
      : 'Come back for a 2-minute check-in: is each tool working, and is it worth the money? If something isn’t working we’ll suggest a fix or a better-fit tool, and your answers help rank tools for the next owner like you.',
    { text: 'Open my plan', url: `${d.origin}/#/plan` },
  )
  card(
    C.brandSoft,
    'We keep this plan useful',
    level >= 2
      ? 'We watch the tools you picked for price changes, new perks, and setup tips.'
      : 'ToolRecipe keeps watching the tools you picked: price changes, new features and perks worth turning on, and setup tips for each step. Check back any time; your plan updates with them.',
    { text: d.origin.replace(/^https?:\/\//, ''), url: d.origin },
  )

  // Free help
  ensure(110)
  y += 6
  font(12, 'display')
  doc.text('Free, local, one-on-one help', M, y)
  y += 18
  const help: [string, string, string][] = [
    ['Find your nearest Small Business Development Center (any state)', 'sba.gov/local-assistance/find', d.links.sba],
    ['Get a free mentor from SCORE', 'score.org', d.links.score],
    ['Maryland Small Business Development Center', 'marylandsbdc.org', d.links.sbdc],
  ]
  for (const [label, shown, url] of help) {
    font(10)
    doc.text(label, M, y)
    font(10, 'bold', C.brand)
    doc.textWithLink(shown, W - M - doc.getTextWidth(shown), y, { url })
    stroke(C.line)
    doc.setLineWidth(0.5)
    doc.line(M, y + 8, W - M, y + 8)
    y += 24
  }

  // Notes lines, only if there's room left on this page
  if (y + 120 < BOTTOM - 40) {
    y += 14
    font(12, 'display')
    doc.text('Notes', M, y)
    y += 6
    stroke(C.line)
    doc.setLineWidth(0.6)
    const stop = Math.min(BOTTOM - 46, y + 22 * 6)
    for (let ly = y + 22; ly <= stop; ly += 22) doc.line(M, ly, W - M, ly)
    y = stop + 10
  }

  // Fine print at the bottom of the last page
  font(8, 'normal', C.soft)
  if (y > BOTTOM - 40) newPage()
  font(8, 'normal', C.soft)
  const fine = lines(
    `Nothing on ToolRecipe is for sale: no ads, no affiliate boosts, no featured spots. Prices and connections were checked ${d.checked}; confirm with each vendor before you buy. Savings are estimates, not guarantees.`,
    CW,
  )
  doc.text(fine, M, BOTTOM - 4 - (fine.length - 1) * lh(8))

  // Footer on every page
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    stroke(C.line)
    doc.setLineWidth(0.6)
    doc.line(M, H - 36, W - M, H - 36)
    font(8, 'normal', C.soft)
    doc.text(clean(`ToolRecipe · ${d.recipeName} recipe for ${d.business}`), M, H - 22)
    doc.text(`Page ${i} of ${n}`, W - M, H - 22, { align: 'right' })
  }
  return doc
}
