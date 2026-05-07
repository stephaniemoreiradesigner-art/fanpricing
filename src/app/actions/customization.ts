'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function saveCustomization(formData: FormData): Promise<{ error?: string }> {
  const admin = createAdminClient()

  const payload = {
    company_name: formData.get('company_name') as string,
    logo_url: (formData.get('logo_url') as string) || null,
    brand_color: formData.get('brand_color') as string,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await admin
    .from('customization')
    .select('id')
    .maybeSingle()

  if (existing) {
    const { error } = await admin.from('customization').update(payload).eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await admin.from('customization').insert(payload)
    if (error) return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return {}
}

export async function uploadLogo(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get('logo') as File | null
  if (!file || !file.size) return { error: 'Nenhum arquivo selecionado.' }

  const admin = createAdminClient()
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `company-logo.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error } = await admin.storage
    .from('logos')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) return { error: error.message }

  const { data } = admin.storage.from('logos').getPublicUrl(path)
  return { url: `${data.publicUrl}?t=${Date.now()}` }
}
