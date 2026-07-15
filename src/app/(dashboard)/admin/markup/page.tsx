import { createClient } from '@/lib/supabase/server'
import { MarkupForm } from './MarkupForm'
import type { PricingConfig } from '@/types'

export default async function MarkupPage() {
  const supabase = await createClient()
  const { data: config } = await supabase
    .from('pricing_config')
    .select('*')
    .maybeSingle()

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Configuração de Precificação</h2>
        <p className="text-sm text-gray-500 mt-1">
          Variáveis do racional de cálculo (Overhead, financeiro, reserva, comissão,
          impostos e margem alvo). Dados sensíveis — visível apenas para administradores.
        </p>
      </div>

      <MarkupForm config={config as PricingConfig | null} />
    </div>
  )
}
