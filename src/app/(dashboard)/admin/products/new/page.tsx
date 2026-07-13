import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProductForm } from '../ProductForm'
import type { Labor, MarkupConfig } from '@/types'

export default async function NewProductPage() {
  const supabase = await createClient()

  const [{ data: labor }, { data: markup }] = await Promise.all([
    supabase.from('labor').select('*').order('level').order('title'),
    supabase.from('markup_config').select('*').maybeSingle(),
  ])

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
          <h2 className="text-2xl font-bold text-gray-900">Novo produto</h2>
          <p className="text-sm text-gray-500 mt-0.5">Defina nome, composição de mão de obra e ferramentas.</p>
        </div>
      </div>

      <ProductForm
        laborOptions={(labor ?? []) as Labor[]}
        markup={markup as MarkupConfig | null}
      />
    </div>
  )
}
