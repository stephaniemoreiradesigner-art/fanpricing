'use client'

import { useState } from 'react'
import { saveMarkup } from '@/app/actions/markup'
import type { MarkupConfig } from '@/types'

interface Props {
  config: MarkupConfig | null
}

export function MarkupForm({ config }: Props) {
  const [overhead, setOverhead] = useState(config ? +(config.overhead_pct * 100).toFixed(4) : 0)
  const [taxes, setTaxes] = useState(config ? +(config.taxes_pct * 100).toFixed(4) : 0)
  const [margin, setMargin] = useState(config ? +(config.net_margin_pct * 100).toFixed(4) : 0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const total = overhead + taxes + margin
  const valid = total > 0 && total < 100
  const markup = valid ? 1 / (1 - total / 100) : 0

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
        <h3 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-500">
          Percentuais
        </h3>

        <PercentInput
          label="Overhead"
          description="Estrutura, aluguel, internet, equipamentos"
          name="overhead_pct"
          value={overhead}
          onChange={setOverhead}
        />
        <PercentInput
          label="Impostos e encargos"
          description="ISS, PIS, COFINS, CSLL, IRPJ, etc."
          name="taxes_pct"
          value={taxes}
          onChange={setTaxes}
        />
        <PercentInput
          label="Margem de lucro líquido"
          description="Lucro real após todos os descontos"
          name="net_margin_pct"
          value={margin}
          onChange={setMargin}
        />
      </div>

      {/* Resultado ao vivo */}
      <div className={`rounded-xl p-5 border ${valid ? 'bg-blue-50 border-blue-200' : total === 0 ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total de descontos</p>
            <p className={`text-3xl font-bold mt-1 ${valid ? 'text-[var(--brand)]' : total === 0 ? 'text-gray-400' : 'text-red-600'}`}>
              {total.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {100 - total > 0 ? `Sobra ${(100 - total).toFixed(2)}% para cobrir custos` : 'Sem margem para custos'}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Markup calculado</p>
            <p className={`text-3xl font-bold mt-1 ${valid ? 'text-[var(--brand)]' : 'text-gray-400'}`}>
              {valid ? markup.toFixed(4) : '—'}
            </p>
            {valid && (
              <p className="text-xs text-gray-500 mt-1">
                Preço = custo × {markup.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {total >= 100 && (
          <p className="text-sm text-red-600 mt-3 font-medium">
            A soma dos percentuais deve ser menor que 100%.
          </p>
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
        {saved && (
          <span className="text-sm text-green-600 font-medium">✓ Salvo com sucesso</span>
        )}
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
          max={99.99}
          step={0.01}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-7 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
      </div>
    </div>
  )
}
