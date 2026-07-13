import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createProposal } from '@/app/actions/proposals'
import { formatCurrency } from '@/lib/calculations'
import type { Quote } from '@/types'

interface Props {
  searchParams: Promise<{ quote_id?: string }>
}

export default async function NewProposalPage({ searchParams }: Props) {
  const { quote_id } = await searchParams
  if (!quote_id) notFound()

  const supabase = await createClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select('*, client:clients(razao_social), quote_items(id, calculated_price, product:products(name))')
    .eq('id', quote_id)
    .single()

  if (!quote) notFound()

  const q = quote as Quote

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/quotes" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nova proposta</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Orçamento de {q.client?.razao_social ?? '—'}
          </p>
        </div>
      </div>

      {/* Resumo do orçamento */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Orçamento base</p>
        {q.quote_items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-600">{item.product?.name}</span>
            <span className="text-gray-900 font-medium">{formatCurrency(item.calculated_price)}</span>
          </div>
        ))}
        <div className="h-px bg-gray-200 my-2" />
        <div className="flex justify-between text-sm font-bold">
          <span>Total mensal</span>
          <span className="text-[var(--brand)]">{formatCurrency(q.total_monthly)}</span>
        </div>
      </div>

      {/* Formulário da proposta */}
      <form action={createProposal} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <input type="hidden" name="quote_id" value={quote_id} />
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Condições de pagamento</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Duração do contrato</label>
            <div className="relative">
              <select
                name="contract_months"
                defaultValue="12"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
              >
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
                <option value="24">24 meses</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Setup — forma de pagamento</label>
            <select
              name="setup_payment_method"
              defaultValue="boleto"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
            >
              <option value="boleto">Boleto</option>
              <option value="cartao">Cartão de crédito</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Setup — parcelas</label>
            <select
              name="setup_installments"
              defaultValue="1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
            >
              {[1, 2, 3, 6, 12].map((n) => (
                <option key={n} value={n}>{n}x</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="bg-[var(--brand)] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-[var(--brand-dark)] transition-colors"
          >
            Gerar proposta
          </button>
          <Link
            href="/quotes"
            className="border border-gray-300 text-gray-700 text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
