import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/calculations'

interface Props {
  params: Promise<{ token: string }>
}

export default async function PublicProposalPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  // Registra visualização se for a primeira vez
  const { data: proposal } = await supabase
    .from('proposals')
    .select(`
      *,
      client:clients(razao_social, nome_fantasia, responsible, email, phone),
      quote:quotes(
        total_monthly, discount_pct, notes,
        quote_items(id, calculated_price, product:products(name, description))
      )
    `)
    .eq('public_token', token)
    .single()

  if (!proposal) notFound()

  // Marca como visualizada (apenas uma vez)
  if (proposal.status === 'sent') {
    await supabase
      .from('proposals')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', proposal.id)
  }

  // Busca personalização
  const { data: customization } = await supabase
    .from('customization')
    .select('company_name, logo_url, brand_color')
    .maybeSingle()

  const brandColor = customization?.brand_color ?? '#307ca8'
  const companyName = customization?.company_name ?? 'FanPricing'
  const logoUrl = customization?.logo_url

  const q = proposal.quote
  const client = proposal.client

  const PAYMENT_LABEL: Record<string, string> = {
    boleto: 'Boleto bancário',
    cartao: 'Cartão de crédito',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header da proposta */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={companyName} className="h-9 object-contain" />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: brandColor }}
              >
                <span className="text-white font-bold text-sm">
                  {companyName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="font-bold text-gray-900">{companyName}</span>
          </div>
          <span className="text-xs text-gray-400">
            Proposta comercial
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Destinatário */}
        <div>
          <p className="text-sm text-gray-500">Proposta para</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{client?.razao_social}</h1>
          {client?.nome_fantasia && (
            <p className="text-sm text-gray-500 mt-0.5">{client.nome_fantasia}</p>
          )}
          {client?.responsible && (
            <p className="text-sm text-gray-600 mt-2">A/C: {client.responsible}</p>
          )}
        </div>

        {/* Produtos */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Serviços inclusos</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(q?.quote_items as { id: string; calculated_price: number; product?: { name: string; description?: string | null } }[] | undefined)?.map((item) => (
              <div key={item.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.product?.name}</p>
                  {item.product?.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.product.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.calculated_price)}</p>
                  <p className="text-xs text-gray-400">/mês</p>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ backgroundColor: `${brandColor}10` }}
          >
            <span className="font-semibold text-gray-900">Total mensal</span>
            <span className="text-xl font-bold" style={{ color: brandColor }}>
              {formatCurrency(q?.total_monthly ?? 0)}
            </span>
          </div>
        </div>

        {/* Condições */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Condições comerciais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Duração</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{proposal.contract_months} meses</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Setup — parcelas</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{proposal.setup_installments}x</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Setup — pagamento</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {PAYMENT_LABEL[proposal.setup_payment_method] ?? proposal.setup_payment_method}
              </p>
            </div>
          </div>
        </div>

        {/* Observações */}
        {q?.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Observações</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line">{q.notes}</p>
          </div>
        )}

        {/* Rodapé */}
        <div className="text-center text-xs text-gray-400 pt-4 pb-8">
          <p>Esta proposta é válida por 15 dias a partir da data de envio.</p>
          <p className="mt-1">Gerado por {companyName}</p>
        </div>
      </main>
    </div>
  )
}
