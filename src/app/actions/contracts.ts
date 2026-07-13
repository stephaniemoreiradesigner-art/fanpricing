'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContractStatus } from '@/types'

export async function createContractFromProposal(proposalId: string) {
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('client_id')
    .eq('id', proposalId)
    .single()

  if (!proposal) return

  await supabase.from('contracts').insert({
    proposal_id: proposalId,
    client_id: proposal.client_id,
    status: 'pending',
  })

  revalidatePath('/contracts')
  revalidatePath(`/proposals/${proposalId}`)
}

export async function updateContractStatus(id: string, status: ContractStatus) {
  const supabase = await createClient()

  const update: Record<string, unknown> = { status }
  if (status === 'signed') update.signed_at = new Date().toISOString()

  await supabase.from('contracts').update(update).eq('id', id)
  revalidatePath('/contracts')
}

export async function updateContractNotes(id: string, notes: string) {
  const supabase = await createClient()
  await supabase.from('contracts').update({ notes: notes || null }).eq('id', id)
  revalidatePath('/contracts')
  revalidatePath(`/contracts/${id}`)
}
