import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '../ProductForm'
import type { Labor, MarkupConfig, Product } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: product }, { data: labor }, { data: markup }] = await Promise.all([
    supabase
      .from('products')
      .select(`
        *,
        product_labor (
          id, hours_allocated, labor_id,
          labor ( id, hourly_rate, title, level )
        ),
        product_tools ( id, name, monthly_cost )
      `)
      .eq('id', id)
      .single(),
    supabase.from('labor').select('*').order('level').order('title'),
    supabase.from('markup_config').select('*').maybeSingle(),
  ])

  if (!product) notFound()

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/products"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Editar produto</h2>
          <p className="text-sm text-gray-500 mt-0.5">{product.name}</p>
        </div>
      </div>

      <ProductForm
        product={product as Product}
        laborOptions={(labor ?? []) as Labor[]}
        markup={markup as MarkupConfig | null}
      />
    </div>
  )
}
