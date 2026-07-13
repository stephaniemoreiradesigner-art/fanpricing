'use client'

import { useState } from 'react'
import { Send, Link2, FileDown, Check } from 'lucide-react'
import { markProposalSent } from '@/app/actions/proposals'
import { formatCurrency } from '@/lib/calculations'
import type { QuoteProposal } from '@/types'

interface Props {
  proposal: QuoteProposal
  companyName: string
  brandColor: string
}

// Regras de sigilo (doc do Leandro): a proposta NUNCA expõe senioridade,
// custos unitários, margem/markup ou alíquota. Só "Impostos inclusos".
export function ProposalDetail({ proposal, companyName }: Props) {
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)

  const scopeLines = (proposal.scope ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const paymentText =
    proposal.billing_model === 'always_on'
      ? 'Faturamento mensal (Always On), com pagamento todo dia 05 do mês subsequente à prestação do serviço.'
      : '50% na assinatura do contrato e 50% na entrega final.'

  function copyLink() {
    if (!proposal.public_token) return
    const url = `${window.location.origin}/p/${proposal.public_token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleSend() {
    setSending(true)
    await markProposalSent(proposal.id)
    setSending(false)
  }

  const clientName = proposal.client?.nome_fantasia || proposal.client?.razao_social || 'Cliente'

  return (
    <div className="space-y-4">
      {/* Barra de ações (interna — não faz parte do documento) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleSend}
          disabled={sending || proposal.status !== 'draft'}
          className="flex items-center gap-2 bg-[var(--brand)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--brand-dark)] transition-colors disabled:opacity-50"
        >
          <Send size={15} />
          {proposal.status === 'draft' ? (sending ? 'Marcando...' : 'Marcar como enviada') : 'Enviada'}
        </button>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {copied ? <Check size={15} className="text-green-600" /> : <Link2 size={15} />}
          {copied ? 'Link copiado!' : 'Copiar link do cliente'}
        </button>
        <a
          href={`/api/pdf/${proposal.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FileDown size={15} />
          Baixar PDF
        </a>
      </div>

      {/* Documento client-facing */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100" style={{ backgroundColor: 'var(--brand)' }}>
          <p className="text-white/80 text-xs uppercase tracking-wide">{companyName}</p>
          <h1 className="text-white text-xl font-bold mt-1">{proposal.title}</h1>
          <p className="text-white/90 text-sm mt-1">{clientName}</p>
        </div>

        <div className="px-8 py-6 space-y-6">
          {proposal.intro && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">O projeto</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{proposal.intro}</p>
            </section>
          )}

          {scopeLines.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">O que está incluído</h3>
              <ul className="space-y-1.5">
                {scopeLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check size={16} className="text-[var(--brand)] mt-0.5 shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Investimento — só valor total, impostos inclusos */}
          <section className="bg-gray-50 rounded-xl p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Investimento</h3>
            <div className="flex items-end justify-between">
              <span className="text-sm text-gray-600">Valor mensal</span>
              <span className="text-2xl font-bold text-[var(--brand)]">{formatCurrency(proposal.total_monthly)}</span>
            </div>
            {proposal.total_setup > 0 && (
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-gray-600">Setup (implantação)</span>
                <span className="font-semibold text-gray-800">{formatCurrency(proposal.total_setup)}</span>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">Impostos inclusos.</p>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Condições de pagamento</h3>
            <p className="text-sm text-gray-700">{paymentText}</p>
            <p className="text-sm text-gray-500 mt-1">Vigência do contrato: {proposal.contract_months} meses.</p>
            {proposal.valid_until && (
              <p className="text-xs text-gray-400 mt-2">
                Proposta válida até {new Date(proposal.valid_until).toLocaleDateString('pt-BR')}.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
