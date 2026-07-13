import { createClient } from '@/lib/supabase/server'
import { MarkupForm } from './MarkupForm'
import type { MarkupConfig } from '@/types'

export default async function MarkupPage() {
  const supabase = await createClient()
  const { data: config } = await supabase
    .from('markup_config')
    .select('*')
    .maybeSingle()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuração de Markup</h2>
        <p className="text-sm text-gray-500 mt-1">
          Define os percentuais que compõem o preço final dos produtos. O markup é calculado automaticamente.
        </p>
      </div>

      <MarkupForm config={config as MarkupConfig | null} />
    </div>
  )
}
