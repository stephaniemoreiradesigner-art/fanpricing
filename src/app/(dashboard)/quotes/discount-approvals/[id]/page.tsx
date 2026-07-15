import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DiscountApproval, DiscountApprovalStatus, Client, Quote } from '@/types'
import { DecisionActions } from './DecisionActions'

function pctFrac(v: number | null) {
  return v == null ? '—' : `${(v * 100).toFixed(1)}%`
}
function dt(v: string | null) {
  return v ? new Date(v).toLocaleString('pt-BR') : ''
}
function brl(v: number | null | undefined) {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS: Record<DiscountApprovalStatus, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Aprovado', cls: 'bg-green-50 text-green-700' },
  rejected: { label: 'Recusado', cls: 'bg-red-50 text-red-600' },
}

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profile?.role === 'admin'

  const admin = createAdminClient()
  const { data: aRow } = await admin.from('discount_approvals').select('*').eq('id', id).single()
  const approval = aRow as DiscountApproval | null
  if (!approval) notFound()

  let client: Client | null = null
  let quote: Quote | null = null
  if (approval.quote_id) {
    const { data: qRow } = await admin.from('quotes').select('*').eq('id', approval.quote_id).single()
    quote = qRow as Quote | null
    if (quote?.client_id) {
      const { data: cRow } = await admin.from('clients').select('*').eq('id', quote.client_id).single()
      client = cRow as Client | null
    }
  }

  const s = STATUS[approval.status]
  const canDecide = isAdmin && approval.status === 'pending'

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/quotes/discount-approvals" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Solicitação de desconto</h2>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
        </div>
      </div>

      {/* Resumo */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Cliente</span><span className="text-gray-900 font-medium">{client?.razao_social ?? '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Solicitante</span><span className="text-gray-900">{approval.requested_by_name || '—'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Desconto solicitado</span><span className="text-gray-900 font-semibold">{approval.discount_pct}%</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Margem resultante</span><span className="text-red-600 font-semibold">{pctFrac(approval.margin_pct)}</span></div>
        {quote && (
          <div className="flex justify-between"><span className="text-gray-500">Preço mensal do orçamento</span><span className="text-gray-900">{brl(quote.total_monthly)}</span></div>
        )}
      </div>

      {/* Histórico */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Histórico</h3>
        <ol className="space-y-4">
          <li className="flex gap-3">
            <div className="w-2 h-2 rounded-full bg-[var(--brand)] mt-1.5 shrink-0" />
            <div>
              <p className="text-sm text-gray-900">
                <strong>{approval.requested_by_name || 'Usuário'}</strong> solicitou o desconto
              </p>
              <p className="text-xs text-gray-400">{dt(approval.created_at)}</p>
              <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded-md px-3 py-2 whitespace-pre-wrap">{approval.justification}</p>
            </div>
          </li>
          {approval.status !== 'pending' && (
            <li className="flex gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${approval.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <p className="text-sm text-gray-900">
                  <strong>{approval.reviewer_name || 'Administrador'}</strong>{' '}
                  {approval.status === 'approved' ? 'aprovou' : 'recusou'} o desconto
                </p>
                <p className="text-xs text-gray-400">{dt(approval.decided_at)}</p>
                {approval.decision_reason && (
                  <p className="text-sm text-gray-600 mt-1 bg-gray-50 rounded-md px-3 py-2 whitespace-pre-wrap">{approval.decision_reason}</p>
                )}
              </div>
            </li>
          )}
        </ol>
      </div>

      {canDecide && <DecisionActions approvalId={approval.id} />}
    </div>
  )
}
