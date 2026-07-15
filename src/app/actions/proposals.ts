'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Gera uma proposta client-facing a partir de um orçamento (labor+ferramentas).
// Congela o valor no momento da criação. NÃO grava dados internos (custos,
// senioridade, margem) — apenas o que o cliente pode ver.
export async function createProposalFromQuote(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const quote_id = formData.get('quote_id') as string
  const title = (formData.get('title') as string) || 'Proposta comercial'
  const intro = (formData.get('intro') as string) || null
  const scope = (formData.get('scope') as string) || null
  const billing_model = (formData.get('billing_model') as string) === 'always_on' ? 'always_on' : 'projeto'
  const contract_months = parseInt(formData.get('contract_months') as string) || 12
  const valid_until = (formData.get('valid_until') as string) || null

  const { data: quote } = await supabase
    .from('quotes')
    .select('client_id, total_monthly, total_setup, discount_pct')
    .eq('id', quote_id)
    .single()

  const { data: proposal, error } = await supabase
    .from('quote_proposals')
    .insert({
      quote_id,
      client_id: quote?.client_id ?? null,
      created_by: user!.id,
      status: 'draft',
      title,
      intro,
      scope,
      billing_model,
      contract_months,
      total_monthly: quote?.total_monthly ?? 0,
      total_setup: quote?.total_setup ?? 0,
      discount_pct: quote?.discount_pct ?? 0,
      public_token: crypto.randomUUID(),
      valid_until,
    })
    .select()
    .single()

  if (error || !proposal) throw error

  revalidatePath('/proposals')
  redirect(`/proposals/${proposal.id}`)
}

export async function markProposalSent(id: string) {
  const supabase = await createClient()
  await supabase
    .from('quote_proposals')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/proposals')
  revalidatePath(`/proposals/${id}`)
}

export async function deleteProposal(id: string) {
  const supabase = await createClient()
  await supabase.from('quote_proposals').delete().eq('id', id)
  revalidatePath('/proposals')
}
