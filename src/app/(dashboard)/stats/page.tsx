import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency } from '@/lib/calculations'
import { StatsCharts } from './StatsCharts'

export default async function StatsPage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: customization } = await admin.from('customization').select('brand_color').maybeSingle()
  const brand = customization?.brand_color ?? '#307ca8'

  const months: { label: string; start: string; end: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    months.push({
      label: start.toLocaleDateString('pt-BR', { month: 'short' }),
      start: start.toISOString(),
      end: end.toISOString(),
    })
  }

  const monthlyData = await Promise.all(
    months.map(async ({ label, start, end }) => {
      const [{ count: orcamentos }, { data: propostas }] = await Promise.all([
        supabase.from('quotes').select('*', { count: 'exact', head: true })
          .gte('created_at', start).lt('created_at', end),
        supabase.from('quote_proposals').select('id, total_monthly')
          .gte('created_at', start).lt('created_at', end),
      ])
      const valor = (propostas ?? []).reduce((sum, p) => sum + ((p as { total_monthly?: number }).total_monthly ?? 0), 0)
      return { month: label, orcamentos: orcamentos ?? 0, propostas: propostas?.length ?? 0, valor }
    })
  )

  const [{ count: draft }, { count: sent }, { count: viewed }, { count: accepted }] = await Promise.all([
    supabase.from('quote_proposals').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('quote_proposals').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    supabase.from('quote_proposals').select('*', { count: 'exact', head: true }).eq('status', 'viewed'),
    supabase.from('quote_proposals').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
  ])

  const proposalsByStatus = [
    { name: 'Rascunho', value: draft ?? 0, color: '#9ca3af' },
    { name: 'Enviada', value: sent ?? 0, color: brand },
    { name: 'Visualizada', value: viewed ?? 0, color: '#d97706' },
    { name: 'Aceita', value: accepted ?? 0, color: '#059669' },
  ]

  const [{ count: pending }, { count: signed }, { count: completed }] = await Promise.all([
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'signed'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
  ])

  const contractsByStatus = [
    { name: 'Pendente', value: pending ?? 0, color: '#d97706' },
    { name: 'Assinado', value: signed ?? 0, color: brand },
    { name: 'Concluído', value: completed ?? 0, color: '#059669' },
  ]

  const { data: activeContracts } = await supabase
    .from('contracts')
    .select('proposal:quote_proposals(total_monthly)')
    .in('status', ['signed', 'completed'])

  const mrr = (activeContracts ?? []).reduce((sum, c) => {
    const total = (c.proposal as { total_monthly?: number } | null)?.total_monthly ?? 0
    return sum + total
  }, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Estatísticas</h2>
        <p className="text-sm text-gray-500 mt-1">Visão geral do desempenho comercial.</p>
      </div>

      <div className="bg-[var(--brand)] rounded-xl p-6 text-white">
        <p className="text-sm font-medium text-blue-100">MRR — Receita Recorrente Mensal</p>
        <p className="text-4xl font-bold mt-1">{formatCurrency(mrr)}</p>
        <p className="text-sm text-blue-200 mt-1">Soma dos contratos ativos (assinados + concluídos)</p>
      </div>

      <StatsCharts
        monthly={monthlyData}
        proposalsByStatus={proposalsByStatus}
        contractsByStatus={contractsByStatus}
        brand={brand}
      />
    </div>
  )
}
