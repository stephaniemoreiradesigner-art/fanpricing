'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, ChevronDown } from 'lucide-react'
import { createQuote } from '@/app/actions/quotes'
import { requestDiscountApproval } from '@/app/actions/discount-approvals'
import { calcBreakdown, formatCurrency, formatPercent, MIN_MARGIN_FOR_DISCOUNT } from '@/lib/calculations'
import type {
  Client,
  Labor,
  Tool,
  PricingConfig,
  QuoteComposition,
  QuoteLaborLine,
  QuoteToolLine,
} from '@/types'

interface Props {
  clients: Client[]
  labor: Labor[]
  tools: Tool[]
  config: PricingConfig | null
  defaultClientId?: string
}

const LEVELS: Record<Labor['level'], string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
}

export function QuoteBuilder({ clients, labor, tools, config, defaultClientId = '' }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  // Fluxo de aprovação de desconto (margem < 32%)
  const [approvalStep, setApprovalStep] = useState<null | 'confirm' | 'justify'>(null)
  const [justification, setJustification] = useState('')
  const [pendingClient, setPendingClient] = useState('')
  const [pendingNotes, setPendingNotes] = useState<string | null>(null)
  const [approvalError, setApprovalError] = useState('')

  const [laborLines, setLaborLines] = useState<QuoteLaborLine[]>([])
  const [toolLines, setToolLines] = useState<QuoteToolLine[]>([])

  const composition: QuoteComposition = useMemo(
    () => ({ labor: laborLines, tools: toolLines }),
    [laborLines, toolLines]
  )

  const breakdown = useMemo(
    () => calcBreakdown(composition, config, discount),
    [composition, config, discount]
  )

  const hasItems = laborLines.length > 0 || toolLines.length > 0

  function addLabor(id: string) {
    const l = labor.find((x) => x.id === id)
    if (!l || laborLines.some((x) => x.labor_id === id)) return
    setLaborLines((prev) => [
      ...prev,
      {
        labor_id: l.id,
        title: l.title,
        level: l.level,
        hourly_rate: l.hourly_rate,
        monthly_hours: l.monthly_hours ?? 220,
        allocation_pct: 100,
      },
    ])
  }
  function updateLaborLine(id: string, patch: Partial<QuoteLaborLine>) {
    setLaborLines((prev) => prev.map((x) => (x.labor_id === id ? { ...x, ...patch } : x)))
  }
  function removeLabor(id: string) {
    setLaborLines((prev) => prev.filter((x) => x.labor_id !== id))
  }

  function addTool(id: string) {
    const t = tools.find((x) => x.id === id)
    if (!t || toolLines.some((x) => x.tool_id === id)) return
    setToolLines((prev) => [...prev, { tool_id: t.id, name: t.name, monthly_cost: t.monthly_cost }])
  }
  function removeTool(id: string) {
    setToolLines((prev) => prev.filter((x) => x.tool_id !== id))
  }

  const needsApproval =
    discount > 0 && hasItems && breakdown.margemReal < MIN_MARGIN_FOR_DISCOUNT

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Desconto derruba a margem abaixo de 32% → exige aprovação de admin.
    if (needsApproval) {
      setPendingClient((formData.get('client_id') as string) ?? '')
      setPendingNotes((formData.get('notes') as string) || null)
      setJustification('')
      setApprovalError('')
      setApprovalStep('confirm')
      return
    }

    setSaving(true)
    formData.set('composition', JSON.stringify(composition))
    await createQuote(formData)
    setSaving(false)
  }

  async function enviarSolicitacao() {
    if (!justification.trim()) {
      setApprovalError('Escreva o motivo do desconto.')
      return
    }
    setSaving(true)
    setApprovalError('')
    const result = await requestDiscountApproval({
      client_id: pendingClient,
      composition,
      notes: pendingNotes,
      discount_pct: discount,
      justification: justification.trim(),
    })
    setSaving(false)
    if (result.error) {
      setApprovalError(result.error)
      return
    }
    setApprovalStep(null)
    router.push('/quotes')
  }

  const availableLabor = labor.filter((l) => !laborLines.some((x) => x.labor_id === l.id))
  const availableTools = tools.filter((t) => !toolLines.some((x) => x.tool_id === t.id))

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cliente</h3>
          <select
            name="client_id"
            required
            defaultValue={defaultClientId}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
          >
            <option value="">Selecione o cliente...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razao_social}{c.nome_fantasia ? ` — ${c.nome_fantasia}` : ''}
              </option>
            ))}
          </select>
          {clients.length === 0 && (
            <p className="text-xs text-amber-600">
              Nenhum cliente cadastrado. <a href="/clients/new" className="underline">Cadastrar agora</a>.
            </p>
          )}
        </div>

        {/* Mão de obra */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mão de obra</h3>
            <AddSelect
              placeholder="Adicionar função..."
              options={availableLabor.map((l) => ({ id: l.id, label: `${l.title} · ${LEVELS[l.level]}` }))}
              onSelect={addLabor}
              disabled={availableLabor.length === 0}
            />
          </div>
          {laborLines.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Nenhuma função adicionada.</p>
          ) : (
            <div className="space-y-2">
              {laborLines.map((line) => (
                <div key={line.labor_id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{line.title}</p>
                    <p className="text-xs text-gray-400">{LEVELS[line.level]} · {formatCurrency(line.hourly_rate)}/h</p>
                  </div>
                  <label className="text-xs text-gray-400 flex items-center gap-1">
                    Alocação
                    <div className="relative w-20">
                      <input
                        type="number"
                        value={line.allocation_pct}
                        min={0}
                        max={100}
                        step="any"
                        onChange={(e) => updateLaborLine(line.labor_id, { allocation_pct: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 pr-5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                    </div>
                  </label>
                  <label className="text-xs text-gray-400 flex items-center gap-1">
                    Carga
                    <input
                      type="number"
                      value={line.monthly_hours}
                      min={1}
                      step="any"
                      onChange={(e) => updateLaborLine(line.labor_id, { monthly_hours: parseFloat(e.target.value) || 0 })}
                      className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                    />
                  </label>
                  <button type="button" onClick={() => removeLabor(line.labor_id)} className="text-gray-300 hover:text-red-400 transition-colors" title="Remover">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {labor.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Nenhuma função cadastrada. Configure em <strong>Configurações → Mão de Obra</strong>.
            </p>
          )}
        </div>

        {/* Ferramentas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Ferramentas e serviços</h3>
            <AddSelect
              placeholder="Adicionar ferramenta..."
              options={availableTools.map((t) => ({ id: t.id, label: `${t.name} · ${formatCurrency(t.monthly_cost)}` }))}
              onSelect={addTool}
              disabled={availableTools.length === 0}
            />
          </div>
          {toolLines.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Nenhuma ferramenta adicionada.</p>
          ) : (
            <div className="space-y-2">
              {toolLines.map((line) => (
                <div key={line.tool_id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                  <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">{line.name}</span>
                  <span className="text-sm text-gray-500">{formatCurrency(line.monthly_cost)}/mês</span>
                  <button type="button" onClick={() => removeTool(line.tool_id)} className="text-gray-300 hover:text-red-400 transition-colors" title="Remover">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Observações</h3>
          <textarea
            name="notes"
            placeholder="Condições especiais, escopo adicional, prazos..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Painel lateral — Resumo */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 lg:sticky lg:top-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Resumo</h3>

          {!hasItems ? (
            <p className="text-sm text-gray-400 text-center py-4">Adicione mão de obra ou ferramentas.</p>
          ) : (
            <>
              {/* Tela simples */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Base operacional</span>
                  <span>{formatCurrency(breakdown.baseOperacional)}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex justify-between font-bold text-base text-gray-900">
                  <span>Preço de venda</span>
                  <span className="text-[var(--brand)]">{formatCurrency(breakdown.precoVendaBruto)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="w-full flex items-center justify-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
                <ChevronDown size={14} className={`transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              </button>

              {showDetails && (
                <div className="space-y-1.5 text-sm bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <DetailRow label="Custo de mão de obra" value={breakdown.custoMOD} />
                  <DetailRow label="Ferramentas / serviços" value={breakdown.custoAdicional} />
                  <DetailRow label="Custo direto" value={breakdown.custoDireto} bold />
                  <DetailRow label="Custo de overhead" value={breakdown.custoOVH} />
                  <DetailRow label="Custo financeiro" value={breakdown.custoFinanceiro} />
                  <DetailRow label="Reserva de risco" value={breakdown.custoReserva} />
                  <DetailRow label="Custo comercial" value={breakdown.custoComissao} />
                  <div className="h-px bg-gray-200" />
                  <DetailRow label="Base operacional" value={breakdown.baseOperacional} bold />
                  <DetailRow label="Preço de venda" value={breakdown.precoVendaBruto} bold />
                  <p className="text-[10px] text-gray-400 pt-1">Detalhe interno — não exibido ao cliente.</p>
                </div>
              )}

              <div className="h-px bg-gray-100" />

              {/* Desconto */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Desconto (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="discount_pct"
                    value={discount}
                    min={0}
                    max={100}
                    step="any"
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-7 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between font-bold text-base text-gray-900">
                  <span>Preço final</span>
                  <span className="text-[var(--brand)]">{formatCurrency(breakdown.precoVenda)}</span>
                </div>
                {discount > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
                    <div className="flex justify-between text-amber-800">
                      <span>Margem real</span>
                      <span className="font-semibold">{formatPercent(breakdown.margemReal)}</span>
                    </div>
                    <div className="flex justify-between text-amber-800">
                      <span>Lucro real</span>
                      <span className="font-semibold">{formatCurrency(breakdown.lucroReal)}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!config && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Configuração de precificação não definida — preços saem zerados. Configure em Configurações → Precificação.
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !hasItems}
            className="w-full bg-[var(--brand)] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[var(--brand-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : needsApproval ? 'Solicitar aprovação de desconto' : 'Salvar orçamento'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/quotes')}
            className="w-full border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>

      {approvalStep === 'confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setApprovalStep(null)} />
          <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Desconto acima do permitido</h3>
            <p className="text-sm text-gray-600">
              Para aplicar esse desconto é necessário permissão de um administrador. Quer solicitar a permissão agora?
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setApprovalStep(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Não
              </button>
              <button type="button" onClick={() => setApprovalStep('justify')} className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: 'var(--brand)' }}>
                Sim
              </button>
            </div>
          </div>
        </div>
      )}

      {approvalStep === 'justify' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setApprovalStep(null)} />
          <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Justificativa do desconto</h3>
            <p className="text-sm text-gray-500">
              Desconto de {discount}% — margem resultante {formatPercent(breakdown.margemReal)}. Explique o motivo para o administrador avaliar.
            </p>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 resize-none"
              placeholder="Motivo pelo qual esse desconto é necessário..."
            />
            {approvalError && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{approvalError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setApprovalStep(null)} disabled={saving} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={enviarSolicitacao} disabled={saving || !justification.trim()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: 'var(--brand)' }}>
                {saving ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

function DetailRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  )
}

function AddSelect({
  placeholder,
  options,
  onSelect,
  disabled,
}: {
  placeholder: string
  options: { id: string; label: string }[]
  onSelect: (id: string) => void
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <select
        value=""
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value) onSelect(e.target.value)
          e.target.value = ''
        }}
        className="appearance-none border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <Plus size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}
