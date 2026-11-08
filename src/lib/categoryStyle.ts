import { CalendarDays, FolderOpen, Phone, Star, Wallet, type LucideIcon } from 'lucide-react'
import type { CategoryId } from '../types'

/** One color per kind of job, so a recipe reads at a glance */
export const CATEGORY_STYLE: Record<CategoryId, { icon: LucideIcon; tile: string; dot: string; label: string }> = {
  phones: { icon: Phone, tile: 'bg-[#e1edfa] text-[#1d5fa8]', dot: 'bg-[#2f7fd6]', label: 'Phones' },
  scheduling: { icon: CalendarDays, tile: 'bg-[#efe9fb] text-[#5b3fb5]', dot: 'bg-[#7a5bd6]', label: 'Scheduling' },
  money: { icon: Wallet, tile: 'bg-[#dff3e7] text-[#1f7a4d]', dot: 'bg-[#2e9a63]', label: 'Money' },
  marketing: { icon: Star, tile: 'bg-[#fff1cc] text-[#7a5200]', dot: 'bg-[#e0a800]', label: 'Marketing' },
  office: { icon: FolderOpen, tile: 'bg-[#ecebe5] text-[#454545]', dot: 'bg-[#8a8a8a]', label: 'Office' },
}
