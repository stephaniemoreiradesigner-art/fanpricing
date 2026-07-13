import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/calculations'
import { QuoteActions } from './QuoteActions'
import type { Quote } from '@/types'

export default async function QuotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profile?.role === 'admin'

  let query = supabase
    .from('quotes')
    .select('*, client:clients(razao_social, nome_fantasia), quote_items(id, calculated_price, product:products(name))')
    .order('created_at', { ascending: false })

  if (!isAdmin) query = query.eq('created_by', user!.id)

  const { data: quotes } = await query

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orçamentos</h2>
          <p className="text-sm text-gray-500 mt-1">Orçamentos gerados com cálculo automático de preços.</p>
        </div>
        <Link
          href="/quotes/new"
          className="flex items-center gap-2 bg-[var(--brand)] text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[var(--brand-dark)] transition-colors"
        >
          <Plus size={16} />
          Novo orçamento
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!quotes || quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={36} className="text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">Nenhum orçamento ainda</p>
            <p className="text-xs text-gray-400 mt-1">Crie seu primeiro orçamento para um cliente.</p>
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
                <th className="text-left px-6 py-3 font-medium">Produtos</th>
                <th className="text-left px-6 py-3 font-medium">Total/mês</th>
                <th className="text-left px-6 py-3 font-medium">Data</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {(quotes as Quote[]).map((quote) => (
                <tr key={quote.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      {quote.client?.razao_social ?? '—'}
                    </p>
                    {quote.client?.nome_fantasia && (
                      <p className="text-xs text-gray-400 mt-0.5">{quote.client.nome_fantasia}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">
                      {quote.quote_items?.length ?? 0} produto{(quote.quote_items?.length ?? 0) !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      {quote.quote_items?.map((qi) => qi.product?.name).filter(Boolean).join(', ')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(quote.total_monthly)}</p>
                    {quote.discount_pct > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">{quote.discount_pct}% de desconto</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(quote.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <QuoteActions quoteId={quote.id} clientId={quote.client_id} />
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
