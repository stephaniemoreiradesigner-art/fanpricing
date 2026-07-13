import { createClient } from '@/lib/supabase/server'

interface CatalogItem {
  id: string
  code: string | null
  title: string | null
  name: string | null
  kind: string | null
  item_type: string | null
  is_active: boolean | null
  active: boolean | null
}

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('catalog_items')
    .select('id, code, title, name, kind, item_type, is_active, active')
    .order('code')

  const items = (data ?? []) as CatalogItem[]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Catálogo</h2>
        <p className="text-sm text-gray-500 mt-1">
          Itens do catálogo de produtos (somente leitura). A precificação de produtos empacotados
          será integrada quando o catálogo estiver ativo — hoje os orçamentos usam mão de obra e ferramentas.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">Nenhum item de catálogo cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Código</th>
                <th className="text-left px-6 py-3 font-medium">Item</th>
                <th className="text-left px-6 py-3 font-medium">Tipo</th>
                <th className="text-left px-6 py-3 font-medium">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-6 py-3 text-sm text-gray-500">{it.code ?? '—'}</td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{it.title || it.name || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{it.item_type || it.kind || '—'}</td>
                  <td className="px-6 py-3 text-sm">
                    {(it.is_active ?? it.active)
                      ? <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">Sim</span>
                      : <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">Não</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
