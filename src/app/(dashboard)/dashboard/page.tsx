import Link from 'next/link'
import { FileText, Send, FileSignature, TrendingUp, Users, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/calculations'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profile?.role === 'admin'

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Contagens totais
  const [
    { count: totalQuotes },
    { count: totalProposals },
    { count: totalContracts },
    { count: totalClients },
  ] = await Promise.all([
    supabase.from('quotes').select('*', { count: 'exact', head: true }),
    supabase.from('proposals').select('*', { count: 'exact', head: true }),
    supabase.from('contracts').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
  ])

  // MRR: soma dos contratos ativos (signed ou completed) com propostas vinculadas
  const { data: activeContracts } = await supabase
    .from('contracts')
    .select('proposal:proposals(quote:quotes(total_monthly))')
    .in('status', ['signed', 'completed'])

  const mrr = (activeContracts ?? []).reduce((sum, c) => {
    const total = (c.proposal as { quote?: { total_monthly?: number } } | null)?.quote?.total_monthly ?? 0
    return sum + total
  }, 0)

  // Propostas visualizadas (clientes abriram o link)
  const { count: viewedProposals } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'viewed')

  // Atividade do mês atual
  const [
    { count: quotesThisMonth },
    { count: proposalsThisMonth },
  ] = await Promise.all([
    supabase.from('quotes').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabase.from('proposals').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
  ])

  // Últimas propostas
  let proposalsQuery = supabase
    .from('proposals')
    .select('id, status, created_at, client:clients(razao_social), quote:quotes(total_monthly)')
    .order('created_at', { ascending: false })
    .limit(5)
  if (!isAdmin) proposalsQuery = proposalsQuery.eq('created_by', user!.id)
  const { data: recentProposals } = await proposalsQuery

  const STATUS_COLOR: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-500',
    sent: 'bg-blue-50 text-blue-700',
    viewed: 'bg-green-50 text-green-700',
  }
  const STATUS_LABEL: Record<string, string> = {
    draft: 'Rascunho',
    sent: 'Enviada',
    viewed: 'Visualizada',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500 mt-1">
          {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="MRR ativo"
          value={formatCurrency(mrr)}
          sub={`${totalContracts} contrato${totalContracts !== 1 ? 's' : ''}`}
          icon={DollarSign}
          color="bg-green-50 text-green-600"
        />
        <KpiCard
          label="Clientes"
          value={String(totalClients ?? 0)}
          sub="cadastrados"
          icon={Users}
          color="bg-purple-50 text-purple-600"
        />
        <KpiCard
          label="Orçamentos"
          value={String(totalQuotes ?? 0)}
          sub={`+${quotesThisMonth ?? 0} este mês`}
          icon={FileText}
          color="bg-blue-50 text-blue-600"
          href="/quotes"
        />
        <KpiCard
          label="Propostas"
          value={String(totalProposals ?? 0)}
          sub={`${viewedProposals ?? 0} visualizadas`}
          icon={Send}
          color="bg-cyan-50 text-cyan-600"
          href="/proposals"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ações rápidas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={17} className="text-[var(--brand)]" />
            <h3 className="font-semibold text-gray-900">Ações rápidas</h3>
          </div>
          <div className="space-y-2">
            <QuickLink href="/quotes/new" label="+ Novo orçamento" primary />
            <QuickLink href="/clients/new" label="+ Novo cliente" />
            <QuickLink href="/proposals" label="Ver propostas" />
            {isAdmin && <QuickLink href="/admin/markup" label="Configurar markup" />}
          </div>
        </div>

        {/* Últimas propostas */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileSignature size={17} className="text-[var(--brand)]" />
              <h3 className="font-semibold text-gray-900">Últimas propostas</h3>
            </div>
            <Link href="/proposals" className="text-xs text-[var(--brand)] hover:underline">
              Ver todas
            </Link>
          </div>

          {!recentProposals || recentProposals.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Nenhuma proposta ainda.{' '}
              <Link href="/quotes/new" className="text-[var(--brand)] underline">
                Criar orçamento
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {recentProposals.map((p) => {
                const proposal = p as unknown as {
                  id: string
                  status: string
                  created_at: string
                  client?: { razao_social: string }
                  quote?: { total_monthly: number }
                }
                return (
                  <Link
                    key={proposal.id}
                    href={`/proposals/${proposal.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {proposal.client?.razao_social ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">
                        {formatCurrency(proposal.quote?.total_monthly ?? 0)}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[proposal.status]}`}>
                        {STATUS_LABEL[proposal.status]}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  href,
}: {
  label: string
  value: string
  sub: string
  icon: React.ElementType
  color: string
  href?: string
}) {
  const content = (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>
}

function QuickLink({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`block text-sm font-medium px-4 py-2.5 rounded-lg transition-colors ${
        primary
          ? 'bg-[var(--brand)] text-white hover:bg-[var(--brand-dark)]'
          : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </Link>
  )
}
