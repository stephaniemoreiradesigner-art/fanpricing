import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ProposalPDF } from '@/components/pdf/ProposalPDF'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: proposal }, { data: customization }] = await Promise.all([
    supabase
      .from('proposals')
      .select(`
        *,
        client:clients(razao_social, nome_fantasia, responsible, cnpj, email, phone),
        quote:quotes(
          total_monthly, discount_pct, notes,
          quote_items(id, calculated_price, product:products(name, description))
        )
      `)
      .eq('id', id)
      .single(),
    supabase.from('customization').select('company_name, brand_color').maybeSingle(),
  ])

  if (!proposal) {
    return new NextResponse('Proposta não encontrada', { status: 404 })
  }

  const q = proposal.quote as {
    total_monthly: number
    discount_pct: number
    notes?: string | null
    quote_items?: { id: string; calculated_price: number; product?: { name: string; description?: string | null } }[]
  } | null

  const pdfData = {
    companyName: customization?.company_name ?? 'FanPricing',
    brandColor: customization?.brand_color ?? '#307ca8',
    client: proposal.client as {
      razao_social: string
      nome_fantasia?: string | null
      responsible?: string | null
      cnpj?: string | null
      email?: string | null
      phone?: string | null
    },
    items: (q?.quote_items ?? []).map((item) => ({
      name: item.product?.name ?? '—',
      description: item.product?.description ?? null,
      price: item.calculated_price,
    })),
    totalMonthly: q?.total_monthly ?? 0,
    discountPct: q?.discount_pct ?? 0,
    contractMonths: proposal.contract_months,
    setupInstallments: proposal.setup_installments,
    setupPaymentMethod: proposal.setup_payment_method,
    notes: q?.notes ?? null,
    createdAt: proposal.created_at,
  }

  const element = createElement(ProposalPDF, { data: pdfData }) as ReactElement<DocumentProps>
  const buffer = await renderToBuffer(element)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="proposta-${id.slice(0, 8)}.pdf"`,
    },
  })
}
