import { createClient } from '@/lib/supabase/server'
import { LaborClient } from './LaborClient'
import type { Labor } from '@/types'

export default async function LaborPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('labor')
    .select('*')
    .order('level')
    .order('title')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mão de Obra</h2>
        <p className="text-sm text-gray-500 mt-1">
          Cadastre os perfis profissionais e seus salários. O valor/hora é calculado automaticamente (salário ÷ 220h).
        </p>
      </div>

      <LaborClient items={(items ?? []) as Labor[]} />
    </div>
  )
}
