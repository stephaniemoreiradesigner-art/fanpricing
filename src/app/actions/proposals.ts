'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProposal(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const quote_id = formData.get('quote_id') as string
  const setup_installments = parseInt(formData.get('setup_installments') as string) || 1
  const setup_payment_method = formData.get('setup_payment_method') as 'boleto' | 'cartao'
  const contract_months = parseInt(formData.get('contract_months') as string) || 12

  // Busca o quote para pegar o client_id
  const { data: quote } = await supabase
    .from('quotes')
    .select('client_id')
    .eq('id', quote_id)
    .single()

  const { data: proposal, error } = await supabase
    .from('proposals')
    .insert({
      quote_id,
      client_id: quote?.client_id ?? null,
      created_by: user!.id,
      status: 'draft',
      setup_installments,
      setup_payment_method,
      contract_months,
      public_token: crypto.randomUUID(),
    })
    .select()
    .single()

  if (error || !proposal) throw error

  revalidatePath('/proposals')
  redirect(`/proposals/${proposal.id}`)
}

export async function markProposalSent(id: string) {
  const supabase = await createClient()
  await supabase.from('proposals').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
  }).eq('id', id)
  revalidatePath('/proposals')
  revalidatePath(`/proposals/${id}`)
}

export async function deleteProposal(id: string) {
  const supabase = await createClient()
  await supabase.from('proposals').delete().eq('id', id)
  revalidatePath('/proposals')
}
