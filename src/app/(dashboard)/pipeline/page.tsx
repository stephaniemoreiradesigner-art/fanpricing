import { createClient } from '@/lib/supabase/server'
import { computeMetrics } from '@/lib/pipeline'
import type { Lead } from '@/types'
import { PipelineBoard } from './PipelineBoard'

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  const leads = (data ?? []) as Lead[]
  const m = computeMetrics(leads)

  const cards = [
    { label: 'Pipeline aberto', value: brl(m.open_value), hint: 'Valor estimado dos leads em aberto' },
    { label: 'Forecast ponderado', value: brl(m.forecast), hint: 'Valor × probabilidade por etapa' },
    { label: 'Fechado', value: brl(m.closed_value), hint: `${m.won} lead(s) ganho(s)` },
    { label: 'Win rate', value: `${Math.round(m.win_rate * 100)}%`, hint: `${m.won} ganhos · ${m.lost} perdidos` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pipeline</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Funil de leads da prospecção ao fechamento. Arraste os cartões entre as colunas.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">{c.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.hint}</p>
          </div>
        ))}
      </div>

      <PipelineBoard leads={leads} />
    </div>
  )
}
