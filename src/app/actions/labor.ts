'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { calcLaborHourlyRate } from '@/lib/calculations'

// Base de horas padrão por regime. CLT = 220h; PJ costuma usar base cheia.
const DEFAULT_HOURS: Record<string, number> = { clt: 220, pj: 160 }

function extractLabor(formData: FormData) {
  const monthly_salary = parseFloat(formData.get('monthly_salary') as string) || 0
  const regime = ((formData.get('regime') as string) || 'clt') as 'clt' | 'pj'
  const monthly_hours =
    parseFloat(formData.get('monthly_hours') as string) || DEFAULT_HOURS[regime] || 220
  return {
    title: formData.get('title') as string,
    level: formData.get('level') as string,
    monthly_salary,
    regime,
    monthly_hours,
    hourly_rate: calcLaborHourlyRate(monthly_salary, monthly_hours),
  }
}

export async function createLabor(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('labor').insert(extractLabor(formData))
  revalidatePath('/admin/labor')
  revalidatePath('/quotes/new')
}

export async function updateLabor(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('labor').update(extractLabor(formData)).eq('id', id)
  revalidatePath('/admin/labor')
  revalidatePath('/quotes/new')
}

export async function deleteLabor(id: string) {
  const supabase = await createClient()
  await supabase.from('labor').delete().eq('id', id)
  revalidatePath('/admin/labor')
  revalidatePath('/quotes/new')
}

export async function importLaborCSV(
  rows: Array<{ title: string; level: string; monthly_salary: number }>
) {
  const supabase = await createClient()
  const records = rows.map((row) => ({
    title: row.title,
    level: row.level,
    monthly_salary: row.monthly_salary,
    regime: 'clt',
    monthly_hours: 220,
    hourly_rate: calcLaborHourlyRate(row.monthly_salary, 220),
  }))
  await supabase.from('labor').insert(records)
  revalidatePath('/admin/labor')
  revalidatePath('/quotes/new')
}
