'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { calcProductPrice } from '@/lib/calculations'
import type { Product, MarkupConfig } from '@/types'

export async function createQuote(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const client_id = formData.get('client_id') as string
  const notes = (formData.get('notes') as string) || null
  const discount_pct = parseFloat(formData.get('discount_pct') as string) || 0
  const productIds: string[] = JSON.parse(formData.get('product_ids') as string || '[]')

  // Busca produtos com composição e markup para calcular preços
  const [{ data: products }, { data: markupData }] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_labor(*, labor(*)), product_tools(*)')
      .in('id', productIds),
    supabase.from('markup_config').select('*').maybeSingle(),
  ])

  const markup = markupData as MarkupConfig | null
  const markupResult = markup?.markup_result ?? 1

  const items = (products ?? []) as Product[]
  const total_monthly = items.reduce((sum, p) => sum + calcProductPrice(p, markupResult), 0)
  const discounted = total_monthly * (1 - discount_pct / 100)

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      client_id,
      created_by: user!.id,
      status: 'saved',
      total_monthly: discounted,
      total_setup: 0,
      discount_pct,
      profit_margin: markupResult,
      notes,
    })
    .select()
    .single()

  if (error || !quote) throw error

  if (items.length > 0) {
    await supabase.from('quote_items').insert(
      items.map((p) => ({
        quote_id: quote.id,
        product_id: p.id,
        calculated_price: calcProductPrice(p, markupResult),
      }))
    )
  }

  revalidatePath('/quotes')
  redirect('/quotes')
}

export async function deleteQuote(id: string) {
  const supabase = await createClient()
  await supabase.from('quote_items').delete().eq('quote_id', id)
  await supabase.from('quotes').delete().eq('id', id)
  revalidatePath('/quotes')
}
