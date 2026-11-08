import { ExternalLink } from 'lucide-react'
import { wordingIndustry } from '../lib/business'
import { isStale } from '../lib/freshness'
import { fmtDate } from '../lib/format'
import { problemById, problemLabel, systemById } from '../lib/repo'
import { badgesFor, scoreTool, usageCost } from '../engine/recipes'
import { FlagLine } from './FlagPill'
import type { Profile, Tool } from '../types'
import { CompatLine, Drawer } from './ui'
import { Logo } from './Logo'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-line py-3 last:border-0">
      <dt className="text-[15px] font-semibold text-ink-soft">{label}</dt>
      <dd className="col-span-2">{children}</dd>
    </div>
  )
}

export function ToolDetail({ tool, profile, onClose }: { tool: Tool | null; profile: Profile; onClose: () => void }) {
  if (!tool) return null
  const s = scoreTool(tool, profile)
  const badges = badgesFor(tool, profile.systems)
  const fee = profile.systems.map((sid) => tool.systemFees?.[sid]).find(Boolean)
  return (
    <Drawer open={!!tool} onClose={onClose} title={tool.name}>
      {tool.pending && (
        <p className="mb-4 rounded-xl bg-warn-soft p-3 text-sm text-warn">Pending verification. Submitted by the vendor and not yet checked by ToolRecipe, so it is not used in recipes.</p>
      )}
      <div className="flex items-start gap-4">
        <Logo name={tool.name} size={56} />
        <div className="min-w-0">
          <p className="text-lg">{tool.does}</p>
          <a className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand px-4 font-semibold text-white hover:bg-brand-dark" href={tool.url} target="_blank" rel="noreferrer">
            Visit {tool.vendor}’s site <ExternalLink size={16} aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
      <div className="mt-5 rounded-2xl bg-white p-4">
        <div className="text-sm">
          <p className="font-semibold">Match score for you: {s.score}/100</p>
          <ul className="mt-1 space-y-0.5 text-ink-soft">
            {s.parts.map((p) => (
              <li key={p.label}>
                {p.label}: <strong className="text-ink">{p.points}</strong>/{p.max} · {p.note}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <dl className="mt-5 rounded-2xl bg-white px-4">
        <Row label="Monthly cost">
          <p className="font-semibold">{tool.priceLabel}</p>
          <p className="text-sm text-ink-soft">{tool.extraFees}</p>
          {fee && <p className="mt-1 text-sm font-medium text-warn">+ ${fee.amount}/mo for you: {fee.note}</p>}
          {usageCost(tool, profile.size) && (
            <p className="mt-1 text-sm font-medium text-warn">
              + about ${usageCost(tool, profile.size)!.amount}/mo estimated usage ({usageCost(tool, profile.size)!.note})
            </p>
          )}
        </Row>
        {tool.flags && tool.flags.length > 0 && (
          <Row label="Fine print">
            <ul className="space-y-1">
              {tool.flags.map((f) => (
                <FlagLine key={f.text} f={f} />
              ))}
            </ul>
          </Row>
        )}
        <Row label="Works with your software">
          {badges.length ? (
            <div className="flex flex-col gap-1">
              {badges.map((b) => (
                <CompatLine key={b.system} system={b.system} status={b.status} />
              ))}
            </div>
          ) : (
            <span className="text-sm text-ink-soft">{tool.standalone ? 'Works on its own; no connection needed.' : 'None of your systems are relevant to this tool.'}</span>
          )}
          {tool.requires && <p className="mt-2 text-sm text-ink-soft">Only available if you use {systemById(tool.requires)?.label}.</p>}
        </Row>
        <Row label="Solves">
          <ul className="text-sm">
            {tool.problems.map((id) => {
              const p = problemById(id)
              return p ? <li key={id}>• {problemLabel(p, wordingIndustry(profile))}</li> : null
            })}
          </ul>
        </Row>
        <Row label="Setup">
          <p>{tool.setupMinutes < 120 ? `About ${tool.setupMinutes} minutes` : tool.setupMinutes < 2880 ? `About ${Math.round(tool.setupMinutes / 60)} hours` : `About ${Math.round(tool.setupMinutes / 1440)} days`}</p>
          <p className="text-sm text-ink-soft">{tool.setupNote}</p>
        </Row>
        <Row label="Free trial">{tool.freeTrial ?? <span className="text-ink-soft">None listed</span>}</Row>
        <Row label="Cancel anytime?">
          {tool.cancelAnytime === true ? 'Yes' : tool.cancelAnytime === false ? 'No, contract required' : <span className="text-ink-soft">Not stated</span>}
          {tool.cancelNote && <p className="text-sm text-ink-soft">{tool.cancelNote}</p>}
        </Row>
        <Row label="Your customer data">{tool.dataNote ?? <span className="text-ink-soft">Not reviewed yet. Check the vendor’s privacy policy before signing up.</span>}</Row>
        <Row label="Outcome check-ins">
          <span className="text-ink-soft">Not enough check-ins yet. Owners who start a plan report back at day 30.</span>
        </Row>
      </dl>
      <div className="mt-5">
        <p className="text-sm font-semibold">
          Sources (checked {fmtDate(tool.checked)}){isStale(tool) ? ' · price needs re-check' : ''}
        </p>
        <ul className="mt-1 text-[15px]">
          {tool.sources.map((src) => (
            <li key={src.url}>
              <a className="inline-flex min-h-11 items-center gap-1 text-brand underline" href={src.url} target="_blank" rel="noreferrer">
                {src.label} <ExternalLink size={14} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Drawer>
  )
}
