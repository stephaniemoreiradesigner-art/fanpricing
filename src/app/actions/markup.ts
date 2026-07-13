'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const pct = (fd: FormData, key: string) =>
  (parseFloat(fd.get(key) as string) || 0) / 100

export async function saveMarkup(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const payload = {
    ovh_pct: pct(formData, 'ovh_pct'),
    cdi_pct: pct(formData, 'cdi_pct'),
    spread_pct: pct(formData, 'spread_pct'),
    prazo_dias: parseInt(formData.get('prazo_dias') as string) || 0,
    reserva_pct: pct(formData, 'reserva_pct'),
    comissao_pct: pct(formData, 'comissao_pct'),
    impostos_pct: pct(formData, 'impostos_pct'),
    margem_alvo_pct: pct(formData, 'margem_alvo_pct'),
    updated_at: new Date().toISOString(),
    updated_by: user?.id,
  }

  const { data: existing } = await supabase
    .from('pricing_config')
    .select('id')
    .maybeSingle()

  if (existing) {
    await supabase.from('pricing_config').update(payload).eq('id', existing.id)
  } else {
    await supabase.from('pricing_config').insert(payload)
  }

  revalidatePath('/admin/markup')
  revalidatePath('/quotes/new')
}
