import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { QuoteBuilder } from './QuoteBuilder'
import type { Client, Product, MarkupConfig } from '@/types'

export default async function NewQuotePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profile?.role === 'admin'

  let clientsQuery = supabase.from('clients').select('*').order('razao_social')
  if (!isAdmin) clientsQuery = clientsQuery.eq('created_by', user!.id)

  const [{ data: clients }, { data: products }, { data: markup }] = await Promise.all([
    clientsQuery,
    supabase
      .from('products')
      .select('*, product_labor(*, labor(*)), product_tools(*)')
      .eq('is_active', true)
      .order('name'),
    supabase.from('markup_config').select('*').maybeSingle(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/quotes" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Novo orçamento</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Selecione o cliente e os produtos. O preço é calculado automaticamente.
          </p>
        </div>
      </div>

      <QuoteBuilder
        clients={(clients ?? []) as Client[]}
        products={(products ?? []) as Product[]}
        markup={markup as MarkupConfig | null}
      />
    </div>
  )
}
