import Link from 'next/link'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/calculations'
import { ProposalActions } from './ProposalActions'
import type { QuoteProposal } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  viewed: 'Visualizada',
  accepted: 'Aceita',
}
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  sent: 'bg-blue-50 text-blue-700',
  viewed: 'bg-amber-50 text-amber-700',
  accepted: 'bg-green-50 text-green-700',
}

const BILLING_LABEL: Record<string, string> = {
  projeto: 'Projeto (50/50)',
  always_on: 'Always On',
}

export default async function ProposalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profile?.role === 'admin'

  let query = supabase
    .from('quote_proposals')
    .select('*, client:clients(razao_social)')
    .order('created_at', { ascending: false })

  if (!isAdmin) query = query.eq('created_by', user!.id)

  const { data: proposals } = await query

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Propostas</h2>
          <p className="text-sm text-gray-500 mt-1">Propostas geradas a partir de orçamentos.</p>
        </div>
        <Link
          href="/quotes"
          className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Send size={15} />
          A partir de um orçamento
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!proposals || proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Send size={36} className="text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">Nenhuma proposta ainda</p>
            <p className="text-xs text-gray-400 mt-1">Crie um orçamento e gere uma proposta a partir dele.</p>
            <Link
              href="/quotes/new"
              className="mt-4 bg-[var(--brand)] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[var(--brand-dark)] transition-colors"
            >
              + Novo orçamento
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Cliente</th>
                <th className="text-left px-6 py-3 font-medium">Título</th>
                <th className="text-left px-6 py-3 font-medium">Total/mês</th>
                <th className="text-left px-6 py-3 font-medium">Modelo</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Data</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {(proposals as QuoteProposal[]).map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.client?.razao_social ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{p.title}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(p.total_monthly)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{BILLING_LABEL[p.billing_model]}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOR[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <ProposalActions proposalId={p.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
