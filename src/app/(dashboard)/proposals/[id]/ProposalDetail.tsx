'use client'

import { useState } from 'react'
import { Copy, Check, Send, Download } from 'lucide-react'
import { markProposalSent } from '@/app/actions/proposals'
import { formatCurrency } from '@/lib/calculations'
import type { Proposal } from '@/types'

interface Props {
  proposal: Proposal
  publicUrl: string
  pdfUrl: string
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  viewed: 'Visualizada',
}
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  viewed: 'bg-green-50 text-green-700',
}

export function ProposalDetail({ proposal, publicUrl, pdfUrl }: Props) {
  const [copied, setCopied] = useState(false)
  const [marking, setMarking] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleMarkSent() {
    setMarking(true)
    await markProposalSent(proposal.id)
    setMarking(false)
  }

  const q = proposal.quote

  return (
    <div className="space-y-6">
      {/* Status e ações */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Status da proposta</p>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${STATUS_COLOR[proposal.status]}`}>
              {STATUS_LABEL[proposal.status]}
            </span>
            {proposal.sent_at && (
              <p className="text-xs text-gray-400 mt-2">
                Enviada em {new Date(proposal.sent_at).toLocaleDateString('pt-BR')}
              </p>
            )}
            {proposal.viewed_at && (
              <p className="text-xs text-gray-400 mt-0.5">
                Visualizada em {new Date(proposal.viewed_at).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download size={15} />
              Baixar PDF
            </a>
            {proposal.status === 'draft' && (
              <button
                onClick={handleMarkSent}
                disabled={marking}
                className="flex items-center gap-2 bg-[var(--brand)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--brand-dark)] transition-colors disabled:opacity-50"
              >
                <Send size={15} />
                {marking ? 'Marcando...' : 'Marcar como enviada'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Link público */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Link público</h3>
        <p className="text-xs text-gray-400">
          Compartilhe este link com o cliente. Ele pode ser aberto sem login.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 truncate font-mono">
            {publicUrl}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
          >
            {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Resumo financeiro</h3>

        {q?.quote_items && q.quote_items.length > 0 && (
          <div className="space-y-2">
            {q.quote_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.product?.name ?? '—'}</span>
                <span className="text-gray-900 font-medium">{formatCurrency(item.calculated_price)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="h-px bg-gray-100" />

        <div className="space-y-1.5 text-sm">
          {(q?.discount_pct ?? 0) > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Desconto ({q!.discount_pct}%)</span>
              <span className="text-red-500">− {formatCurrency(q!.total_monthly / (1 - q!.discount_pct / 100) * (q!.discount_pct / 100))}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base text-gray-900">
            <span>Total mensal</span>
            <span className="text-[var(--brand)]">{formatCurrency(q?.total_monthly ?? 0)}</span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1.5 text-gray-600">
          <div className="flex justify-between">
            <span>Duração do contrato</span>
            <span className="font-medium">{proposal.contract_months} meses</span>
          </div>
          <div className="flex justify-between">
            <span>Setup — pagamento</span>
            <span className="font-medium capitalize">{proposal.setup_payment_method}</span>
          </div>
          <div className="flex justify-between">
            <span>Setup — parcelas</span>
            <span className="font-medium">{proposal.setup_installments}x</span>
          </div>
        </div>
      </div>
    </div>
  )
}
