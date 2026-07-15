'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { LeadStatus } from '@/types'

export interface LeadInput {
  name: string
  company?: string | null
  email?: string | null
  phone?: string | null
  source?: string | null
  status?: LeadStatus
  estimated_value?: number | null
  owner?: string | null
  notes?: string | null
  temperature?: number
  negotiation_history?: string | null
}

// Define closed_at conforme o status (fechado/perdido = fechado agora).
function closedAtFor(status: LeadStatus | undefined, current: string | null = null): string | null {
  if (status === 'fechado' || status === 'perdido') return current ?? new Date().toISOString()
  return null
}

export async function createLead(input: LeadInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const status = input.status ?? 'prospect'
  const { error } = await supabase.from('leads').insert({
    name: input.name,
    company: input.company ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    source: input.source ?? null,
    status,
    estimated_value: input.estimated_value ?? null,
    owner: input.owner ?? null,
    notes: input.notes ?? null,
    temperature: input.temperature ?? 0,
    negotiation_history: input.negotiation_history ?? null,
    closed_at: closedAtFor(status),
    created_by: user?.id ?? null,
  })

  if (error) throw error
  revalidatePath('/pipeline')
}

export async function updateLead(id: string, input: Partial<LeadInput>) {
  const supabase = await createClient()

  const patch: Record<string, unknown> = { ...input }
  if (input.status !== undefined) patch.closed_at = closedAtFor(input.status)

  const { error } = await supabase.from('leads').update(patch).eq('id', id)
  if (error) throw error
  revalidatePath('/pipeline')
}

export async function moveLeadStatus(id: string, status: LeadStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({ status, closed_at: closedAtFor(status) })
    .eq('id', id)

  if (error) throw error
  revalidatePath('/pipeline')
}

export async function deleteLead(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/pipeline')
}

export interface ConvertLeadInput {
  razao_social: string
  nome_fantasia?: string | null
  responsible?: string | null
  phone?: string | null
  email?: string | null
}

// Converte um lead em cliente: cria o cliente, vincula ao lead e marca como fechado.
// Retorna o id do cliente criado para o front redirecionar a /quotes/new.
export async function convertLeadToClient(
  leadId: string,
  data: ConvertLeadInput
): Promise<{ clientId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia ?? null,
      responsible: data.responsible ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single()

  if (clientError) throw clientError

  const { error: leadError } = await supabase
    .from('leads')
    .update({
      status: 'fechado',
      client_id: client.id,
      closed_at: new Date().toISOString(),
    })
    .eq('id', leadId)

  if (leadError) throw leadError

  revalidatePath('/pipeline')
  revalidatePath('/clients')
  return { clientId: client.id as string }
}
