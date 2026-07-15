import Link from 'next/link'
import { FileSignature } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/calculations'
import { ContractStatusSelect } from './ContractStatusSelect'
import type { ContractStatus } from '@/types'

interface ContractRow {
  id: string
  status: ContractStatus
  signed_at: string | null
  created_at: string
  client?: { razao_social: string } | null
  proposal?: { title: string; total_monthly: number; contract_months: number; created_by: string | null } | null
}

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profile?.role === 'admin'

  const query = supabase
    .from('contracts')
    .select(`
      *,
      client:clients(razao_social),
      proposal:quote_proposals(title, total_monthly, contract_months, created_by)
    `)
    .order('created_at', { ascending: false })

  const { data } = await query
  let contracts = (data ?? []) as unknown as ContractRow[]
  if (!isAdmin) contracts = contracts.filter((c) => c.proposal?.created_by === user!.id)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Contratos</h2>
        <p className="text-sm text-gray-500 mt-1">Contratos gerados a partir das propostas aceitas.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileSignature size={36} className="text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">Nenhum contrato ainda</p>
            <p className="text-xs text-gray-400 mt-1">Gere um contrato a partir de uma proposta.</p>
            <Link
              href="/proposals"
              className="mt-4 border border-gray-300 text-gray-700 text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Ver propostas
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Cliente</th>
                <th className="text-left px-6 py-3 font-medium">Valor/mês</th>
                <th className="text-left px-6 py-3 font-medium">Duração</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Assinado em</th>
                <th className="text-left px-6 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr key={contract.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{contract.client?.razao_social ?? '—'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {contract.proposal?.total_monthly ? formatCurrency(contract.proposal.total_monthly) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {contract.proposal?.contract_months ? `${contract.proposal.contract_months} meses` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <ContractStatusSelect id={contract.id} currentStatus={contract.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(contract.created_at).toLocaleDateString('pt-BR')}
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
