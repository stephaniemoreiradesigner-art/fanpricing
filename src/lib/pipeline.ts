import type { Lead, LeadStatus, PipelineMetrics } from '@/types'

// Probabilidade de fechamento por status (0 a 1). Usada no forecast ponderado.
// Substitui a tabela pipeline_stages do Fan Mídias — mais simples para single-tenant.
export const STATUS_PROBABILITY: Record<LeadStatus, number> = {
  prospect: 0.1,
  contato: 0.3,
  proposta: 0.6,
  fechado: 1,
  perdido: 0,
}

// Colunas do Kanban (ordem e rótulos em pt-BR).
export const PIPELINE_COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: 'prospect', label: 'Prospect' },
  { status: 'contato', label: 'Contato' },
  { status: 'proposta', label: 'Proposta' },
  { status: 'fechado', label: 'Fechado' },
  { status: 'perdido', label: 'Perdido' },
]

const CLOSED: LeadStatus[] = ['fechado', 'perdido']

export function isOpen(status: LeadStatus): boolean {
  return !CLOSED.includes(status)
}

export function computeMetrics(leads: Lead[]): PipelineMetrics {
  const open = leads.filter((l) => isOpen(l.status))
  const won = leads.filter((l) => l.status === 'fechado')
  const lost = leads.filter((l) => l.status === 'perdido')

  const open_value = open.reduce((s, l) => s + (l.estimated_value ?? 0), 0)
  const closed_value = won.reduce((s, l) => s + (l.estimated_value ?? 0), 0)
  const forecast = open.reduce(
    (s, l) => s + (l.estimated_value ?? 0) * STATUS_PROBABILITY[l.status],
    0
  )
  const decided = won.length + lost.length

  return {
    open_value,
    closed_value,
    win_rate: decided > 0 ? won.length / decided : 0,
    won: won.length,
    lost: lost.length,
    forecast,
  }
}
