import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProposalDetail } from './ProposalDetail'
import type { Proposal } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProposalPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from('proposals')
    .select(`
      *,
      client:clients(razao_social),
      quote:quotes(
        total_monthly, discount_pct,
        quote_items(id, calculated_price, product:products(name))
      )
    `)
    .eq('id', id)
    .single()

  if (!proposal) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const publicUrl = `${appUrl}/p/${proposal.public_token}`
  const pdfUrl = `/api/pdf/${id}`

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/proposals" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proposta</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {(proposal as Proposal).client?.razao_social ?? '—'}
          </p>
        </div>
      </div>

      <ProposalDetail
        proposal={proposal as Proposal}
        publicUrl={publicUrl}
        pdfUrl={pdfUrl}
      />
    </div>
  )
}
