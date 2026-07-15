'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcBreakdown } from '@/lib/calculations'
import { createNotifications, getAdmins } from '@/lib/notifications'
import { sendEmail } from '@/lib/email/mailer'
import { discountRequestEmailTemplate, discountDecisionEmailTemplate } from '@/lib/email/templates'
import type { PricingConfig, QuoteComposition, DiscountApproval } from '@/types'

// CC obrigatório em todos os e-mails do fluxo de desconto (doc da reunião).
const COMERCIAL_CC = 'comercial@grupoendtoend.com.br'

async function getEmailBrand() {
  const admin = createAdminClient()
  const { data } = await admin.from('customization').select('brand_color, company_name').maybeSingle()
  return {
    brandColor: data?.brand_color ?? '#307ca8',
    companyName: data?.company_name ?? 'FanPricing',
  }
}

export interface RequestDiscountInput {
  client_id: string
  composition: QuoteComposition
  notes?: string | null
  discount_pct: number // desconto solicitado
  justification: string
}

// Chamada quando o usuário pede aprovação para um desconto que derruba a margem
// abaixo de 32%. Salva o orçamento SEM o desconto (só vale após aprovação),
// registra a solicitação e notifica os admins (in-app + e-mail com CC comercial@).
export async function requestDiscountApproval(
  input: RequestDiscountInput
): Promise<{ error?: string; approvalId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }
  if (!input.justification?.trim()) return { error: 'A justificativa é obrigatória.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const requesterName = (profile?.full_name as string) ?? user.email ?? ''

  const { data: configData } = await supabase.from('pricing_config').select('*').maybeSingle()
  const config = configData as PricingConfig | null

  const semDesconto = calcBreakdown(input.composition, config, 0)
  const comDesconto = calcBreakdown(input.composition, config, input.discount_pct)

  // 1) Salva o orçamento SEM aplicar o desconto.
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      client_id: input.client_id,
      created_by: user.id,
      status: 'saved',
      total_monthly: semDesconto.precoVenda,
      total_setup: 0,
      discount_pct: 0,
      profit_margin: semDesconto.margemReal,
      notes: input.notes ?? null,
      composition: input.composition,
      sale_price: semDesconto.precoVendaBruto,
    })
    .select('id')
    .single()
  if (quoteError || !quote) return { error: quoteError?.message ?? 'Erro ao salvar o orçamento.' }

  // 2) Registra a solicitação de aprovação (pendente).
  const { data: approval, error: apprError } = await supabase
    .from('discount_approvals')
    .insert({
      quote_id: quote.id,
      requested_by: user.id,
      requested_by_name: requesterName,
      discount_pct: input.discount_pct,
      margin_pct: comDesconto.margemReal,
      justification: input.justification.trim(),
      status: 'pending',
    })
    .select('id')
    .single()
  if (apprError || !approval) return { error: apprError?.message ?? 'Erro ao criar a solicitação.' }

  // 3) Notifica os admins: push in-app + e-mail (CC comercial@).
  const admins = await getAdmins()
  const link = `/quotes/discount-approvals/${approval.id}`

  await createNotifications(admins.map((a) => a.id), {
    type: 'discount_request',
    title: 'Aprovação de desconto solicitada',
    body: `${requesterName} pediu ${input.discount_pct}% (margem resultante ${(comDesconto.margemReal * 100).toFixed(1)}%).`,
    link,
  })

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const { brandColor, companyName } = await getEmailBrand()
    const adminEmails = admins.map((a) => a.email).filter((e): e is string => !!e)
    const html = discountRequestEmailTemplate({
      requesterName,
      discountPct: input.discount_pct,
      marginPct: comDesconto.margemReal,
      justification: input.justification.trim(),
      approvalUrl: `${appUrl}${link}`,
      brandColor,
      companyName,
    })
    await sendEmail({
      to: adminEmails.length > 0 ? adminEmails : COMERCIAL_CC,
      cc: COMERCIAL_CC,
      subject: `Aprovação de desconto solicitada — ${companyName}`,
      html,
    })
  } catch {
    // E-mail é best-effort: a solicitação já está registrada e o admin já foi
    // notificado in-app. Não bloqueia o fluxo se o SMTP falhar.
  }

  return { approvalId: approval.id as string }
}

// ---- Decisão (admin) --------------------------------------------------------

async function requireAdmin():
  Promise<{ ok: true; userId: string; name: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirada. Faça login novamente.' }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return { ok: false, error: 'Apenas administradores podem decidir sobre o desconto.' }
  }
  return { ok: true, userId: user.id, name: (profile?.full_name as string) ?? user.email ?? '' }
}

async function notifyRequesterDecision(
  approval: DiscountApproval,
  approved: boolean,
  reviewerName: string,
  reason: string | null
): Promise<void> {
  const admin = createAdminClient()
  const link = `/quotes/discount-approvals/${approval.id}`

  if (approval.requested_by) {
    await createNotifications([approval.requested_by], {
      type: approved ? 'discount_approved' : 'discount_rejected',
      title: approved ? 'Desconto aprovado' : 'Desconto recusado',
      body: `Seu desconto de ${approval.discount_pct}% foi ${approved ? 'aprovado' : 'recusado'} por ${reviewerName}.`,
      link,
    })
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const { brandColor, companyName } = await getEmailBrand()
    let email: string | null = null
    if (approval.requested_by) {
      const { data: p } = await admin.from('profiles').select('email').eq('id', approval.requested_by).single()
      email = (p?.email as string) ?? null
    }
    if (email) {
      await sendEmail({
        to: email,
        cc: COMERCIAL_CC,
        subject: `${approved ? 'Desconto aprovado' : 'Desconto recusado'} — ${companyName}`,
        html: discountDecisionEmailTemplate({
          requesterName: approval.requested_by_name ?? '',
          approved,
          discountPct: approval.discount_pct,
          reviewerName,
          decisionReason: reason,
          quoteUrl: `${appUrl}${link}`,
          brandColor,
          companyName,
        }),
      })
    }
  } catch {
    // e-mail best-effort
  }
}

export async function approveDiscount(approvalId: string): Promise<{ error?: string }> {
  const guard = await requireAdmin()
  if (!guard.ok) return { error: guard.error }

  const admin = createAdminClient()
  const { data: approvalRow } = await admin.from('discount_approvals').select('*').eq('id', approvalId).single()
  const approval = approvalRow as DiscountApproval | null
  if (!approval) return { error: 'Solicitação não encontrada.' }
  if (approval.status !== 'pending') return { error: 'Esta solicitação já foi decidida.' }

  // Aplica o desconto ao orçamento (recalcula preço e margem).
  const { data: quote } = await admin.from('quotes').select('*').eq('id', approval.quote_id).single()
  if (!quote) return { error: 'Orçamento não encontrado.' }

  const { data: configData } = await admin.from('pricing_config').select('*').maybeSingle()
  const config = configData as PricingConfig | null
  const composition = ((quote as { composition?: QuoteComposition }).composition ?? { labor: [], tools: [] })
  const bd = calcBreakdown(composition, config, approval.discount_pct)

  await admin.from('quotes').update({
    discount_pct: approval.discount_pct,
    total_monthly: bd.precoVenda,
    profit_margin: bd.margemReal,
    sale_price: bd.precoVendaBruto,
  }).eq('id', approval.quote_id)

  await admin.from('discount_approvals').update({
    status: 'approved',
    reviewed_by: guard.userId,
    reviewer_name: guard.name,
    decided_at: new Date().toISOString(),
  }).eq('id', approvalId)

  await notifyRequesterDecision(approval, true, guard.name, null)
  revalidatePath('/quotes/discount-approvals')
  revalidatePath(`/quotes/discount-approvals/${approvalId}`)
  return {}
}

export async function rejectDiscount(approvalId: string, reason: string): Promise<{ error?: string }> {
  const guard = await requireAdmin()
  if (!guard.ok) return { error: guard.error }
  if (!reason?.trim()) return { error: 'Escreva o motivo da recusa.' }

  const admin = createAdminClient()
  const { data: approvalRow } = await admin.from('discount_approvals').select('*').eq('id', approvalId).single()
  const approval = approvalRow as DiscountApproval | null
  if (!approval) return { error: 'Solicitação não encontrada.' }
  if (approval.status !== 'pending') return { error: 'Esta solicitação já foi decidida.' }

  await admin.from('discount_approvals').update({
    status: 'rejected',
    reviewed_by: guard.userId,
    reviewer_name: guard.name,
    decision_reason: reason.trim(),
    decided_at: new Date().toISOString(),
  }).eq('id', approvalId)

  await notifyRequesterDecision(approval, false, guard.name, reason.trim())
  revalidatePath('/quotes/discount-approvals')
  revalidatePath(`/quotes/discount-approvals/${approvalId}`)
  return {}
}
