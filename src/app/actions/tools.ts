'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseCurrencyInput } from '@/lib/calculations'

export async function createTool(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('tools').insert({
    name: formData.get('name') as string,
    monthly_cost: parseCurrencyInput(formData.get('monthly_cost') as string),
  })
  revalidatePath('/admin/tools')
  revalidatePath('/quotes/new')
}

export async function updateTool(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase
    .from('tools')
    .update({
      name: formData.get('name') as string,
      monthly_cost: parseCurrencyInput(formData.get('monthly_cost') as string),
    })
    .eq('id', id)
  revalidatePath('/admin/tools')
  revalidatePath('/quotes/new')
}

export async function deleteTool(id: string) {
  const supabase = await createClient()
  await supabase.from('tools').delete().eq('id', id)
  revalidatePath('/admin/tools')
  revalidatePath('/quotes/new')
}
