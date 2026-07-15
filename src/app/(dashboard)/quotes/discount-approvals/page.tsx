import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DiscountApproval, DiscountApprovalStatus } from '@/types'

function pct(v: number | null) {
  return v == null ? '—' : `${(v * 100).toFixed(1)}%`
}

const STATUS: Record<DiscountApprovalStatus, { label: string; cls: string }> = {
  pending: { label: 'Pendente', cls: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Aprovado', cls: 'bg-green-50 text-green-700' },
  rejected: { label: 'Recusado', cls: 'bg-red-50 text-red-600' },
}

export default async function DiscountApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profile?.role === 'admin'

  // Lê via cliente admin (RLS de profiles/tabelas não deve esconder as solicitações).
  const admin = createAdminClient()
  let query = admin.from('discount_approvals').select('*').order('created_at', { ascending: false })
  if (!isAdmin) query = query.eq('requested_by', user!.id)
  const { data } = await query
  const approvals = (data ?? []) as DiscountApproval[]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Aprovações de desconto</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAdmin
            ? 'Solicitações de desconto que precisam de aprovação.'
            : 'Suas solicitações de desconto.'}
        </p>
      </div>

      {approvals.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          Nenhuma solicitação por aqui.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-3 font-medium">Solicitante</th>
                <th className="px-4 py-3 font-medium">Desconto</th>
                <th className="px-4 py-3 font-medium">Margem</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => {
                const s = STATUS[a.status]
                return (
                  <tr key={a.id} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-gray-900">{a.requested_by_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{a.discount_pct}%</td>
                    <td className="px-4 py-3 text-gray-700">{pct(a.margin_pct)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(a.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/quotes/discount-approvals/${a.id}`} className="text-[var(--brand)] hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
