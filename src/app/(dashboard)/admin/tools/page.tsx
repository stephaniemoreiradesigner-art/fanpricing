import { createClient } from '@/lib/supabase/server'
import { ToolsClient } from './ToolsClient'
import type { Tool } from '@/types'

export default async function ToolsPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('tools')
    .select('*')
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ferramentas</h2>
        <p className="text-sm text-gray-500 mt-1">
          Cadastro independente de ferramentas e seus custos mensais. Na calculadora,
          entram como soma simples — não compõem os postos (overhead).
        </p>
      </div>

      <ToolsClient items={(items ?? []) as Tool[]} />
    </div>
  )
}
