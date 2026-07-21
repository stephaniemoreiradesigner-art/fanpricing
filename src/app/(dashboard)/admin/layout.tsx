import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// FPNG-13 — defesa em profundidade: mesmo se o middleware falhar ou for
// desconectado de novo (já aconteceu uma vez), nenhuma página dentro de
// /admin/* deve renderizar para quem não for admin.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return <>{children}</>
}
