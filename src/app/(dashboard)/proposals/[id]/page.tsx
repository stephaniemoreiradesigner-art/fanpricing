import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProposalDetail } from './ProposalDetail'
import type { QuoteProposal } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: proposal }, { data: customization }] = await Promise.all([
    supabase
      .from('quote_proposals')
      .select('*, client:clients(razao_social, nome_fantasia, responsible, cnpj, email, phone)')
      .eq('id', id)
      .single(),
    supabase.from('customization').select('company_name, brand_color, logo_url').maybeSingle(),
  ])

  if (!proposal) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/proposals" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proposta</h2>
          <p className="text-sm text-gray-500 mt-0.5">Pré-visualização como o cliente verá.</p>
        </div>
      </div>

      <ProposalDetail
        proposal={proposal as QuoteProposal}
        companyName={customization?.company_name ?? 'End to End'}
        brandColor={customization?.brand_color ?? '#307ca8'}
      />
    </div>
  )
}
