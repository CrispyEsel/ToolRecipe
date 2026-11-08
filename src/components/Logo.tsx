/**
 * Logos for tools and apps. If an image named after the tool is in
 * src/assets/logos (for example goodcall.png), it's used automatically.
 * Otherwise we draw a colored monogram. Monograms are NOT the companies' real
 * logos; only add real marks you have permission to use.
 */
const FILES = import.meta.glob('../assets/logos/*.{png,svg,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(FILES).map(([path, url]) => [path.split('/').pop()!.replace(/\.[a-z]+$/i, '').toLowerCase(), url]),
)

/** "Canva Pro (Magic Studio)" → "canva-pro-magic-studio". This is the file name to use. */
export function logoSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
const PALETTE = [
  ['#1d5fa8', '#e1edfa'],
  ['#5b3fb5', '#efe9fb'],
  ['#1f7a4d', '#dff3e7'],
  ['#9a5b00', '#fff1cc'],
  ['#b0102a', '#fdecee'],
  ['#0e6470', '#ddf1f3'],
  ['#8a3fa0', '#f6e6fa'],
  ['#3d4a5c', '#e7eaee'],
] as const

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const SKIP = new Set(['ai', 'by', 'the', 'and', 'for', '&'])

/** "Hostie AI" → "H", "NiceJob" → "NJ", "Canva Pro (Magic Studio)" → "CP", "Smith.ai AI Receptionist" → "SR" */
export function initials(name: string) {
  const clean = name.replace(/\(.*?\)/g, '').replace(/\.ai\b/gi, '').trim()
  const words = clean.split(/[\s/+-]+/).filter((w) => w && !SKIP.has(w.toLowerCase()))
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  const w = words[0] ?? name
  const caps = w.match(/[A-Z]/g)
  if (caps && caps.length >= 2) return (caps[0] + caps[1]).toUpperCase()
  return w.slice(0, 1).toUpperCase()
}

export function Logo({ name, size = 44, solid = false, className = '' }: { name: string; size?: number; solid?: boolean; className?: string }) {
  const slug = logoSlug(name)
  // A tool built into an app ("Jobber AI Receptionist") uses that app's logo until it has its own.
  const img = IMAGES[slug] ?? IMAGES[Object.keys(IMAGES).filter((k) => slug.startsWith(`${k}-`)).sort((x, y) => y.length - x.length)[0]]
  if (img) {
    return (
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center overflow-hidden border border-black/[0.08] bg-white ${className}`}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), padding: Math.round(size * 0.12) }}
      >
        <img src={img} alt="" className="h-full w-full object-contain" />
      </span>
    )
  }
  const [fg, bg] = PALETTE[hash(name) % PALETTE.length]
  const text = initials(name)
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center font-display font-bold leading-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        background: solid ? fg : bg,
        color: solid ? '#fff' : fg,
        fontSize: Math.round(size * (text.length > 1 ? 0.36 : 0.44)),
        letterSpacing: '-0.02em',
      }}
    >
      {text}
    </span>
  )
}
