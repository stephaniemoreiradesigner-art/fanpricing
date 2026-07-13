'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveMarkup(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const overhead = parseFloat(formData.get('overhead_pct') as string) / 100
  const taxes = parseFloat(formData.get('taxes_pct') as string) / 100
  const margin = parseFloat(formData.get('net_margin_pct') as string) / 100
  const markup_result = 1 / (1 - overhead - taxes - margin)

  const { data: existing } = await supabase
    .from('markup_config')
    .select('id')
    .maybeSingle()

  if (existing) {
    await supabase.from('markup_config').update({
      overhead_pct: overhead,
      taxes_pct: taxes,
      net_margin_pct: margin,
      markup_result,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    }).eq('id', existing.id)
  } else {
    await supabase.from('markup_config').insert({
      overhead_pct: overhead,
      taxes_pct: taxes,
      net_margin_pct: margin,
      markup_result,
      updated_by: user?.id,
    })
  }

  revalidatePath('/admin/markup')
  revalidatePath('/admin/products')
}
