'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcLaborHourlyRate } from '@/lib/calculations'

export async function createLabor(formData: FormData) {
  const supabase = await createClient()
  const monthly_salary = parseFloat(formData.get('monthly_salary') as string)

  await supabase.from('labor').insert({
    title: formData.get('title') as string,
    level: formData.get('level') as string,
    monthly_salary,
    hourly_rate: calcLaborHourlyRate(monthly_salary),
  })

  revalidatePath('/admin/labor')
  revalidatePath('/admin/products')
}

export async function updateLabor(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const monthly_salary = parseFloat(formData.get('monthly_salary') as string)

  await supabase.from('labor').update({
    title: formData.get('title') as string,
    level: formData.get('level') as string,
    monthly_salary,
    hourly_rate: calcLaborHourlyRate(monthly_salary),
  }).eq('id', id)

  revalidatePath('/admin/labor')
  revalidatePath('/admin/products')
}

export async function deleteLabor(id: string) {
  const supabase = await createClient()
  await supabase.from('labor').delete().eq('id', id)
  revalidatePath('/admin/labor')
  revalidatePath('/admin/products')
}

export async function importLaborCSV(
  rows: Array<{ title: string; level: string; monthly_salary: number }>
) {
  const supabase = await createClient()
  const records = rows.map((row) => ({
    title: row.title,
    level: row.level,
    monthly_salary: row.monthly_salary,
    hourly_rate: calcLaborHourlyRate(row.monthly_salary),
  }))
  await supabase.from('labor').insert(records)
  revalidatePath('/admin/labor')
  revalidatePath('/admin/products')
}
