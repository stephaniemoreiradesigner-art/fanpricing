'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { calcBreakdown } from '@/lib/calculations'
import type { PricingConfig, QuoteComposition } from '@/types'

export async function createQuote(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const client_id = formData.get('client_id') as string
  const notes = (formData.get('notes') as string) || null
  const discount_pct = parseFloat(formData.get('discount_pct') as string) || 0

  const composition: QuoteComposition = JSON.parse(
    (formData.get('composition') as string) || '{"labor":[],"tools":[]}'
  )

  // Recalcula no servidor a partir da configuracao atual (nao confia no cliente).
  const { data: configData } = await supabase.from('pricing_config').select('*').maybeSingle()
  const config = configData as PricingConfig | null

  const breakdown = calcBreakdown(composition, config, discount_pct)

  const { error } = await supabase.from('quotes').insert({
    client_id,
    created_by: user!.id,
    status: 'saved',
    total_monthly: breakdown.precoVenda,
    total_setup: 0,
    discount_pct,
    profit_margin: breakdown.margemReal,
    notes,
    composition,
    sale_price: breakdown.precoVendaBruto,
  })

  if (error) throw error

  revalidatePath('/quotes')
  redirect('/quotes')
}

export async function deleteQuote(id: string) {
  const supabase = await createClient()
  await supabase.from('quotes').delete().eq('id', id)
  revalidatePath('/quotes')
}
