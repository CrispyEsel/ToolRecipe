import type { Flag } from '../types'

/** One fine-print note, colored by kind, linking to its source */
export function FlagPill({ f }: { f: Flag }) {
  const style = {
    good: 'bg-ok-soft text-ok',
    fees: 'bg-warn-soft text-warn',
    contract: 'bg-bad-soft text-bad',
    data: 'bg-info-soft text-info',
    watch: 'bg-muted-soft text-ink-soft',
  }[f.kind]
  const label = { good: 'Good', fees: 'Fees', contract: 'Contract', data: 'Your data', watch: 'Heads up' }[f.kind]
  return (
    <a href={f.source.url} target="_blank" rel="noreferrer" title={`Source: ${f.source.label}`} className={`inline-flex items-start gap-1.5 rounded-lg px-2.5 py-1 text-sm ${style} hover:underline`}>
      <strong className="shrink-0">{label}:</strong> <span>{f.text}</span>
    </a>
  )
}

/** One fine-print note as a plain line: colored label, then the text, linked to its source */
export function FlagLine({ f }: { f: Flag }) {
  const color = { good: 'text-ok', fees: 'text-warn', contract: 'text-bad', data: 'text-info', watch: 'text-ink-soft' }[f.kind]
  const label = { good: 'Good', fees: 'Fees', contract: 'Contract', data: 'Your data', watch: 'Heads up' }[f.kind]
  return (
    <li className="text-sm">
      <strong className={color}>{label}:</strong> <span className="text-ink-soft">{f.text}</span>{' '}
      <a href={f.source.url} target="_blank" rel="noreferrer" title={f.source.label} className="whitespace-nowrap text-xs text-muted underline underline-offset-2 hover:text-ink">
        source
      </a>
    </li>
  )
}
