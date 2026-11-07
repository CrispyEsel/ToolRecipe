import { systemById } from '../lib/repo'
import type { Recipe } from '../engine/recipes'
import type { Profile, SystemId } from '../types'

/**
 * Stack map: the owner's software on the right, the recipe's tools on the
 * left, and the real connections between them. Solid green = connects
 * directly, dashed amber = through Zapier, no line = works on its own.
 * Redraws whenever Stack Snap changes the owner's software.
 */
const W = 680
const ROW = 78
const BOX_H = 58
const TOOL_X = 120
const TOOL_W = 230
const ZAP_X = 400
const SYS_X = 500
const SYS_W = 170

function wrap(text: string, max: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      lines.push(cur.trim())
      cur = w
    } else cur += ' ' + w
  }
  if (cur.trim()) lines.push(cur.trim())
  return lines.slice(0, 2)
}

export function StackMap({ recipe, profile }: { recipe: Recipe; profile: Profile }) {
  const tools = recipe.items
  const systems: SystemId[] = profile.systems.filter((s) => s !== 'paper')
  const hasPhones = tools.some((s) => s.tool.category === 'phones')
  const rows = Math.max(tools.length, systems.length, 1)
  const H = rows * ROW + 30
  const yTool = (i: number) => 15 + i * ROW + (rows - tools.length) * (ROW / 2)
  const ySys = (i: number) => 15 + i * ROW + (rows - Math.max(systems.length, 1)) * (ROW / 2)
  const sysIndex = (id: SystemId) => systems.indexOf(id)

  type Link = { from: number; to: number; kind: 'native' | 'zapier' }
  const links: Link[] = []
  tools.forEach((s, i) => {
    s.badges.forEach((b) => {
      const j = sysIndex(b.system)
      if (j >= 0 && (b.status === 'native' || b.status === 'zapier')) links.push({ from: i, to: j, kind: b.status })
    })
  })
  const usesZapier = links.some((l) => l.kind === 'zapier')
  const zapY = H / 2 - 16

  const path = (x1: number, y1: number, x2: number, y2: number) => {
    const mx = (x1 + x2) / 2
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`
  }

  const summary = [
    ...links.map((l) => `${tools[l.from].tool.name} ${l.kind === 'native' ? 'connects directly to' : 'connects through Zapier to'} ${systemById(systems[l.to])?.label}`),
    ...tools.filter((_, i) => !links.some((l) => l.from === i)).map((s) => `${s.tool.name} works on its own`),
  ]

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">Your stack map</p>
        <p className="text-sm text-ink-soft">Change your software in Stack Snap and watch the lines redraw.</p>
      </div>
      <p className="mt-1 text-xs text-ink-soft sm:hidden">Swipe the map to see your software →</p>
      <div className="mt-2 overflow-x-auto">
        <svg
          key={systems.join() + tools.map((s) => s.tool.id).join()}
          viewBox={hasPhones ? `0 0 ${W} ${H}` : `${TOOL_X - 10} 0 ${W - TOOL_X + 10} ${H}`}
          className={hasPhones ? 'min-w-[560px]' : 'min-w-[460px]'}
          role="img"
          aria-label={`Stack map. ${summary.join('. ')}.`}
        >
          {/* Customers → phone tools */}
          {hasPhones && (
            <g>
              <rect x={4} y={H / 2 - 24} width={88} height={48} rx={12} fill="var(--color-accent-soft)" stroke="var(--color-gold-dark)" />
              <text x={48} y={H / 2 - 3} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--color-ink)">
                Customers
              </text>
              <text x={48} y={H / 2 + 13} textAnchor="middle" fontSize="11" fill="var(--color-ink-soft)">
                call you
              </text>
              {tools.map((s, i) =>
                s.tool.category === 'phones' ? (
                  <path key={i} d={path(92, H / 2, TOOL_X, yTool(i) + BOX_H / 2)} stroke="var(--color-muted)" strokeWidth="2" fill="none" className="map-draw" />
                ) : null,
              )}
            </g>
          )}

          {/* Connection lines */}
          {links.map((l, k) =>
            l.kind === 'native' ? (
              <path
                key={k}
                d={path(TOOL_X + TOOL_W, yTool(l.from) + BOX_H / 2, SYS_X, ySys(l.to) + BOX_H / 2)}
                stroke="var(--color-ok)"
                strokeWidth="3.5"
                fill="none"
                className="map-draw"
              />
            ) : (
              <g key={k} className="map-fade">
                <path d={path(TOOL_X + TOOL_W, yTool(l.from) + BOX_H / 2, ZAP_X, zapY + 16)} stroke="var(--color-gold-dark)" strokeWidth="3" strokeDasharray="7 6" fill="none" />
                <path d={path(ZAP_X + 64, zapY + 16, SYS_X, ySys(l.to) + BOX_H / 2)} stroke="var(--color-gold-dark)" strokeWidth="3" strokeDasharray="7 6" fill="none" />
              </g>
            ),
          )}
          {usesZapier && (
            <g className="map-fade">
              <rect x={ZAP_X} y={zapY} width={64} height={32} rx={16} fill="var(--color-warn-soft)" stroke="var(--color-gold-dark)" />
              <text x={ZAP_X + 32} y={zapY + 21} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-warn)">
                Zapier
              </text>
            </g>
          )}

          {/* Tools */}
          {tools.map((s, i) => {
            const connected = links.some((l) => l.from === i)
            return (
              <g key={s.tool.id}>
                <rect x={TOOL_X} y={yTool(i)} width={TOOL_W} height={BOX_H} rx={12} fill="#fff" stroke="var(--color-brand)" strokeWidth="2" />
                <text x={TOOL_X + 12} y={yTool(i) + 22} fontSize="14" fontWeight="700" fill="var(--color-ink)">
                  {s.tool.name.length > 28 ? s.tool.name.slice(0, 27) + '…' : s.tool.name}
                </text>
                {wrap(connected ? s.tool.role : `${s.tool.role} · works on its own`, 36).map((line, n) => (
                  <text key={n} x={TOOL_X + 12} y={yTool(i) + 38 + n * 13} fontSize="11" fill="var(--color-ink-soft)">
                    {line}
                  </text>
                ))}
              </g>
            )
          })}

          {/* Owner's software */}
          {systems.length ? (
            systems.map((sid, j) => {
              const linked = links.some((l) => l.to === j)
              return (
                <g key={sid}>
                  <rect
                    x={SYS_X}
                    y={ySys(j)}
                    width={SYS_W}
                    height={BOX_H}
                    rx={12}
                    fill={linked ? 'var(--color-ok-soft)' : 'var(--color-muted-soft)'}
                    stroke={linked ? 'var(--color-ok)' : 'var(--color-line)'}
                    strokeWidth="2"
                  />
                  <text x={SYS_X + 12} y={ySys(j) + 24} fontSize={(systemById(sid)?.label.length ?? 0) > 16 ? 11.5 : 14} fontWeight="700" fill="var(--color-ink)">
                    {systemById(sid)?.label}
                  </text>
                  <text x={SYS_X + 12} y={ySys(j) + 42} fontSize="11" fill="var(--color-ink-soft)">
                    {linked ? 'Updated automatically' : 'Not connected in this recipe'}
                  </text>
                </g>
              )
            })
          ) : (
            <g>
              <rect x={SYS_X} y={ySys(0)} width={SYS_W} height={BOX_H} rx={12} fill="var(--color-muted-soft)" stroke="var(--color-line)" strokeDasharray="5 5" />
              <text x={SYS_X + 12} y={ySys(0) + 24} fontSize="13" fontWeight="700" fill="var(--color-ink)">
                No software yet
              </text>
              <text x={SYS_X + 12} y={ySys(0) + 42} fontSize="11" fill="var(--color-ink-soft)">
                These tools work on their own
              </text>
            </g>
          )}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-2">
          <svg width="28" height="6" aria-hidden>
            <line x1="0" y1="3" x2="28" y2="3" stroke="var(--color-ok)" strokeWidth="3.5" />
          </svg>
          Connects directly
        </span>
        <span className="inline-flex items-center gap-2">
          <svg width="28" height="6" aria-hidden>
            <line x1="0" y1="3" x2="28" y2="3" stroke="var(--color-gold-dark)" strokeWidth="3" strokeDasharray="6 4" />
          </svg>
          Through Zapier (extra cost)
        </span>
        <span>No line: works on its own, nothing is sent automatically</span>
      </div>
      <ul className="sr-only">
        {summary.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  )
}
