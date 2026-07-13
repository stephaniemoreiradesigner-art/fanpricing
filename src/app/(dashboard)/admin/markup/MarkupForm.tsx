'use client'

import { useState } from 'react'
import { saveMarkup } from '@/app/actions/markup'
import type { PricingConfig } from '@/types'

interface Props {
  config: PricingConfig | null
}

const toPct = (v: number | undefined) => (v ? +(v * 100).toFixed(4) : 0)

export function MarkupForm({ config }: Props) {
  const [ovh, setOvh] = useState(toPct(config?.ovh_pct))
  const [impostos, setImpostos] = useState(toPct(config?.impostos_pct))
  const [margem, setMargem] = useState(toPct(config?.margem_alvo_pct))
  const [reserva, setReserva] = useState(toPct(config?.reserva_pct))
  const [comissao, setComissao] = useState(toPct(config?.comissao_pct))
  const [cdi, setCdi] = useState(toPct(config?.cdi_pct))
  const [spread, setSpread] = useState(toPct(config?.spread_pct))
  const [prazo, setPrazo] = useState(config?.prazo_dias ?? 30)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Markup divisor do preço de venda (MD §18): 1 / (1 - Impostos - Margem Alvo)
  const divisorPct = impostos + margem
  const valid = divisorPct > 0 && divisorPct < 100
  const markup = valid ? 1 / (1 - divisorPct / 100) : 0

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    await saveMarkup(formData)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 font-semibold">
          Componentes de custo
        </h3>
        <PercentInput label="Overhead (OVH)" description="Custos indiretos, % sobre o Custo Direto" name="ovh_pct" value={ovh} onChange={setOvh} />
        <PercentInput label="Reserva de risco" description="Cobertura para contingências" name="reserva_pct" value={reserva} onChange={setReserva} />
        <PercentInput label="Comissão / custo comercial" description="Remuneração comercial (broker)" name="comissao_pct" value={comissao} onChange={setComissao} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 font-semibold">
          Custo financeiro
        </h3>
        <PercentInput label="CDI (a.a.)" description="Taxa de referência anual" name="cdi_pct" value={cdi} onChange={setCdi} />
        <PercentInput label="Spread bancário (a.a.)" description="Adicional anual sobre o CDI" name="spread_pct" value={spread} onChange={setSpread} />
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-800">Prazo de recebimento</label>
            <p className="text-xs text-gray-400 mt-0.5">Dias entre emissão da NF e recebimento</p>
          </div>
          <div className="relative w-32">
            <input
              type="number"
              name="prazo_dias"
              value={prazo}
              min={0}
              step={1}
              onChange={(e) => setPrazo(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-12 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">dias</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-sm uppercase tracking-wide text-gray-500 font-semibold">
          Receita e margem
        </h3>
        <PercentInput label="Impostos" description="Tributos sobre o faturamento bruto" name="impostos_pct" value={impostos} onChange={setImpostos} />
        <PercentInput label="Margem alvo" description="Lucro líquido desejado sobre o preço de venda" name="margem_alvo_pct" value={margem} onChange={setMargem} />
      </div>

      {/* Markup calculado (divisor do preço de venda) */}
      <div className={`rounded-xl p-5 border ${valid ? 'bg-blue-50 border-blue-200' : divisorPct === 0 ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Impostos + Margem</p>
            <p className={`text-3xl font-bold mt-1 ${valid ? 'text-[var(--brand)]' : divisorPct === 0 ? 'text-gray-400' : 'text-red-600'}`}>
              {divisorPct.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Aplicados como divisor sobre a Base Operacional</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Markup divisor</p>
            <p className={`text-3xl font-bold mt-1 ${valid ? 'text-[var(--brand)]' : 'text-gray-400'}`}>
              {valid ? markup.toFixed(2) + 'x' : '—'}
            </p>
            {valid && <p className="text-xs text-gray-500 mt-1">Preço = Base / {(1 - divisorPct / 100).toFixed(4)}</p>}
          </div>
        </div>
        {divisorPct >= 100 && (
          <p className="text-sm text-red-600 mt-3 font-medium">Impostos + Margem deve ser menor que 100%.</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!valid || saving}
          className="bg-[var(--brand)] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-[var(--brand-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Salvando...' : 'Salvar configuração'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Salvo com sucesso</span>}
      </div>

      {config?.updated_at && (
        <p className="text-xs text-gray-400">
          Última atualização: {new Date(config.updated_at).toLocaleString('pt-BR')}
        </p>
      )}
    </form>
  )
}

function PercentInput({
  label,
  description,
  name,
  value,
  onChange,
}: {
  label: string
  description: string
  name: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-800">{label}</label>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="relative w-32">
        <input
          type="number"
          name={name}
          value={value}
          min={0}
          max={999}
          step={0.01}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-7 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
      </div>
    </div>
  )
}
