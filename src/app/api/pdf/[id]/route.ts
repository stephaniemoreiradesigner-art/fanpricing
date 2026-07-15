import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProposalPDF, type ProposalPDFData } from '@/components/pdf/ProposalPDF'
import type { QuoteProposal } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: proposal }, { data: customization }] = await Promise.all([
    supabase
      .from('quote_proposals')
      .select('*, client:clients(razao_social, nome_fantasia, responsible, cnpj, email, phone)')
      .eq('id', id)
      .single(),
    supabase.from('customization').select('company_name, brand_color').maybeSingle(),
  ])

  if (!proposal) {
    return new NextResponse('Proposta nao encontrada', { status: 404 })
  }

  const p = proposal as QuoteProposal

  const data: ProposalPDFData = {
    companyName: customization?.company_name ?? 'End to End',
    brandColor: customization?.brand_color ?? '#307ca8',
    client: p.client ?? { razao_social: 'Cliente' },
    title: p.title,
    intro: p.intro,
    scopeLines: (p.scope ?? '').split('\n').map((l) => l.trim()).filter(Boolean),
    totalMonthly: p.total_monthly,
    totalSetup: p.total_setup,
    billingModel: p.billing_model,
    contractMonths: p.contract_months,
    validUntil: p.valid_until,
    createdAt: p.created_at,
  }

  const element = createElement(ProposalPDF, { data }) as unknown as ReactElement<DocumentProps>
  const buffer = await renderToBuffer(element)

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="proposta-${id}.pdf"`,
    },
  })
}
