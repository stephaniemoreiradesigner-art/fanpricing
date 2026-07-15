import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createProposalFromQuote } from '@/app/actions/proposals'
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
    .select('*, client:clients(razao_social, nome_fantasia)')
    .eq('id', quote_id)
    .single()

  if (!quote) notFound()
  const q = quote as Quote
  const clientName = q.client?.nome_fantasia || q.client?.razao_social || 'Cliente'

  const defaultIntro =
    `A ${'End to End'} agradece a oportunidade de apresentar esta proposta para a ${clientName}. ` +
    `Nosso time reúne as competências necessárias para entregar o resultado esperado com previsibilidade e qualidade.`

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/quotes" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nova proposta</h2>
          <p className="text-sm text-gray-500 mt-0.5">Orçamento de {clientName}</p>
        </div>
      </div>

      {/* Resumo client-facing (apenas valor total — sem custos internos) */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Valor do orçamento</p>
        <div className="flex justify-between text-sm font-bold">
          <span>Total mensal</span>
          <span className="text-[var(--brand)]">{formatCurrency(q.total_monthly)}</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          O detalhamento de custos e margens é interno e não aparece na proposta do cliente.
        </p>
      </div>

      <form action={createProposalFromQuote} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <input type="hidden" name="quote_id" value={quote_id} />

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Título da proposta</label>
          <input
            type="text"
            name="title"
            defaultValue={`Proposta comercial — ${clientName}`}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Introdução (o projeto)</label>
          <textarea
            name="intro"
            rows={4}
            defaultValue={defaultIntro}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">Texto editável. Geração automática por IA será adicionada depois.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Escopo / o que está incluído</label>
          <textarea
            name="scope"
            rows={5}
            placeholder={'Liste os entregáveis visíveis ao cliente, um por linha.\nEx: Gestão estratégica de mídia\nRelatórios de performance mensais'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Modelo de cobrança</label>
            <select
              name="billing_model"
              defaultValue="projeto"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
            >
              <option value="projeto">Projeto — 50% assinatura + 50% entrega</option>
              <option value="always_on">Always On — dia 05 do mês subsequente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Duração do contrato (meses)</label>
            <input
              type="number"
              name="contract_months"
              defaultValue={12}
              min={1}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Válida até</label>
          <input
            type="date"
            name="valid_until"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="bg-[var(--brand)] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-[var(--brand-dark)] transition-colors"
          >
            Gerar proposta
          </button>
          <Link href="/quotes" className="text-sm text-gray-500 hover:text-gray-700">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
