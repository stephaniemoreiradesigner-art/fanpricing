import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/calculations'
import type { QuoteProposal } from '@/types'

interface Props {
  params: Promise<{ token: string }>
}

export default async function PublicProposalPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from('quote_proposals')
    .select('*, client:clients(razao_social, nome_fantasia)')
    .eq('public_token', token)
    .single()

  if (!proposal) notFound()
  const p = proposal as QuoteProposal

  // Marca como visualizada (apenas na primeira vez)
  if (p.status === 'sent') {
    await supabase
      .from('quote_proposals')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', p.id)
  }

  const { data: customization } = await supabase
    .from('customization')
    .select('company_name, logo_url, brand_color')
    .maybeSingle()

  const brandColor = customization?.brand_color ?? '#307ca8'
  const companyName = customization?.company_name ?? 'End to End'
  const clientName = p.client?.nome_fantasia || p.client?.razao_social || 'Cliente'

  const scopeLines = (p.scope ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
  const paymentText =
    p.billing_model === 'always_on'
      ? 'Faturamento mensal (Always On), com pagamento todo dia 05 do mês subsequente à prestação do serviço.'
      : '50% na assinatura do contrato e 50% na entrega final.'

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4" style={{ ['--brand' as string]: brandColor }}>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-8" style={{ backgroundColor: brandColor }}>
          <p className="text-white/80 text-xs uppercase tracking-wide">{companyName}</p>
          <h1 className="text-white text-2xl font-bold mt-1">{p.title}</h1>
          <p className="text-white/90 text-sm mt-1">{clientName}</p>
        </div>

        <div className="px-8 py-8 space-y-8">
          {p.intro && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">O projeto</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{p.intro}</p>
            </section>
          )}

          {scopeLines.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">O que está incluído</h3>
              <ul className="space-y-1.5">
                {scopeLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-0.5" style={{ color: brandColor }}>✓</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Investimento</h3>
            <div className="flex items-end justify-between">
              <span className="text-sm text-gray-600">Valor mensal</span>
              <span className="text-2xl font-bold" style={{ color: brandColor }}>{formatCurrency(p.total_monthly)}</span>
            </div>
            {p.total_setup > 0 && (
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-gray-600">Setup (implantação)</span>
                <span className="font-semibold text-gray-800">{formatCurrency(p.total_setup)}</span>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">Impostos inclusos.</p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Condições de pagamento</h3>
            <p className="text-sm text-gray-700">{paymentText}</p>
            <p className="text-sm text-gray-500 mt-1">Vigência do contrato: {p.contract_months} meses.</p>
            {p.valid_until && (
              <p className="text-xs text-gray-400 mt-2">
                Proposta válida até {new Date(p.valid_until).toLocaleDateString('pt-BR')}.
              </p>
            )}
          </section>
        </div>

        <div className="px-8 py-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">{companyName}</p>
        </div>
      </div>
    </div>
  )
}
