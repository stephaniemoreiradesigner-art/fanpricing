import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { calcProductPrice, formatCurrency } from '@/lib/calculations'
import { ProductActions } from './ProductActions'
import type { Product, MarkupConfig } from '@/types'

export default async function ProductsPage() {
  const supabase = await createClient()

  const [{ data: products }, { data: markupData }] = await Promise.all([
    supabase
      .from('products')
      .select(`
        *,
        product_labor (
          id, hours_allocated,
          labor ( id, hourly_rate, title, level )
        ),
        product_tools ( id, name, monthly_cost )
      `)
      .order('name'),
    supabase.from('markup_config').select('*').maybeSingle(),
  ])

  const markup = markupData as MarkupConfig | null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Produtos</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie os produtos disponíveis para orçamentos.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-[var(--brand)] text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[var(--brand-dark)] transition-colors"
        >
          <Plus size={16} />
          Novo produto
        </Link>
      </div>

      {!markup && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          Configure o <strong>markup</strong> em Admin → Markup para que os preços sejam calculados corretamente.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {!products || products.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            Nenhum produto cadastrado. Clique em &quot;Novo produto&quot; para começar.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Produto</th>
                <th className="text-left px-6 py-3 font-medium">Mão de obra</th>
                <th className="text-left px-6 py-3 font-medium">Ferramentas</th>
                <th className="text-left px-6 py-3 font-medium">Preço/mês</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {(products as Product[]).map((product) => {
                const price = markup ? calcProductPrice(product, markup.markup_result) : null
                const laborCount = product.product_labor?.length ?? 0
                const toolCount = product.product_tools?.length ?? 0

                return (
                  <tr key={product.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{product.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {laborCount > 0 ? `${laborCount} profissional${laborCount > 1 ? 'is' : ''}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {toolCount > 0 ? `${toolCount} ferramenta${toolCount > 1 ? 's' : ''}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {price != null ? formatCurrency(price) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        product.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {product.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ProductActions product={product} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
