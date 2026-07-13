'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { createQuote } from '@/app/actions/quotes'
import { calcProductPrice, formatCurrency } from '@/lib/calculations'
import type { Client, Product, MarkupConfig } from '@/types'

interface Props {
  clients: Client[]
  products: Product[]
  markup: MarkupConfig | null
}

export function QuoteBuilder({ clients, products, markup }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [discount, setDiscount] = useState(0)

  const markupResult = markup?.markup_result ?? 1

  const selectedProducts = products.filter((p) => selectedIds.includes(p.id))

  const subtotal = selectedProducts.reduce(
    (sum, p) => sum + calcProductPrice(p, markupResult),
    0
  )
  const discountAmount = subtotal * (discount / 100)
  const total = subtotal - discountAmount

  function toggleProduct(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData(e.currentTarget)
    formData.set('product_ids', JSON.stringify(selectedIds))
    await createQuote(formData)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna principal */}
      <div className="lg:col-span-2 space-y-6">
        {/* Cliente */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cliente</h3>
          <select
            name="client_id"
            required
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

        {/* Seleção de produtos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Produtos ({selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''})
          </h3>

          {products.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              Nenhum produto ativo. Configure em <strong>Admin → Produtos</strong>.
            </p>
          ) : (
            <div className="space-y-2">
              {products.map((product) => {
                const price = calcProductPrice(product, markupResult)
                const selected = selectedIds.includes(product.id)
                return (
                  <label
                    key={product.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                      selected
                        ? 'border-[var(--brand)] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleProduct(product.id)}
                      className="w-4 h-4 accent-[var(--brand)]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{product.description}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-gray-700 shrink-0">
                      {formatCurrency(price)}<span className="text-xs font-normal text-gray-400">/mês</span>
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Observações */}
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

          {selectedProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Selecione ao menos um produto.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedProducts.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="flex items-start gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleProduct(p.id)}
                      className="mt-0.5 text-gray-300 hover:text-red-400 shrink-0 transition-colors"
                    >
                      <X size={14} />
                    </button>
                    <span className="text-gray-700 truncate">{p.name}</span>
                  </div>
                  <span className="text-gray-900 font-medium shrink-0">
                    {formatCurrency(calcProductPrice(p, markupResult))}
                  </span>
                </div>
              ))}
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
                step={0.5}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-7 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>

          {/* Totais */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Desconto ({discount}%)</span>
                <span>− {formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="h-px bg-gray-100" />
            <div className="flex justify-between font-bold text-base text-gray-900">
              <span>Total/mês</span>
              <span className="text-[var(--brand)]">{formatCurrency(total)}</span>
            </div>
          </div>

          {!markup && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Markup não configurado — preços podem estar incorretos.
            </p>
          )}

          <button
            type="submit"
            disabled={saving || selectedIds.length === 0}
            className="w-full bg-[var(--brand)] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[var(--brand-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar orçamento'}
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
    </form>
  )
}
