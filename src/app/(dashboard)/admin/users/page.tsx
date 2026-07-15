import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UsersClient } from './UsersClient'
import type { UserRole } from '@/types'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // Lê perfis com o cliente admin (service role) para IGNORAR a RLS de profiles,
  // que só deixa cada usuário ver a própria linha. Sem isso, a lista só mostraria
  // o admin logado; os demais (ex.: Igor) apareceriam com os valores padrão
  // ("Usuário"/"—") mesmo estando corretos no banco.
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  const db = hasServiceKey ? createAdminClient() : supabase

  // Busca perfis — tenta colunas estendidas, cai no básico se não existirem
  let profiles: Array<Record<string, unknown>> = []
  const { data: extended, error: extError } = await db
    .from('profiles')
    .select('id, full_name, role, phone, cnpj, address, avatar_url')

  if (extError) {
    const { data: basic } = await db.from('profiles').select('id, full_name, role')
    profiles = basic ?? []
  } else {
    profiles = extended ?? []
  }

  // Busca usuários auth — requer SUPABASE_SERVICE_ROLE_KEY
  let authUsers: Array<{ id: string; email?: string; created_at: string }> = []

  if (hasServiceKey) {
    try {
      const admin = createAdminClient()
      const { data } = await admin.auth.admin.listUsers()
      authUsers = data.users
    } catch {
      // falha silenciosa — tabela de profiles será usada como fallback
    }
  }

  // Se não conseguiu usuários auth, usa apenas os perfis existentes
  const profileMap = new Map(profiles.map((p) => [p.id as string, p]))

  const users = authUsers.length > 0
    ? authUsers.map((u) => {
        const p = profileMap.get(u.id) ?? {}
        return {
          id: u.id,
          email: u.email ?? '',
          name: (p.full_name as string) ?? '',
          role: ((p.role as string) ?? 'user') as UserRole,
          phone: (p.phone as string) ?? '',
          cnpj: (p.cnpj as string) ?? '',
          address: (p.address as string) ?? '',
          avatar_url: (p.avatar_url as string | null) ?? null,
          created_at: u.created_at,
        }
      })
    : profiles.map((p) => ({
        id: p.id as string,
        email: (p.email as string) ?? '',
        name: (p.full_name as string) ?? '',
        role: ((p.role as string) ?? 'user') as UserRole,
        phone: (p.phone as string) ?? '',
        cnpj: (p.cnpj as string) ?? '',
        address: (p.address as string) ?? '',
        avatar_url: (p.avatar_url as string | null) ?? null,
        created_at: (p.created_at as string) ?? '',
      }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Usuários</h2>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie os usuários e seus perfis de acesso.
        </p>
        {!process.env.SUPABASE_SERVICE_ROLE_KEY && (
          <p className="text-xs text-amber-600 mt-1">
            ⚠ SUPABASE_SERVICE_ROLE_KEY não configurada — exibindo apenas usuários com perfil cadastrado.
          </p>
        )}
      </div>

      <UsersClient users={users} currentUserId={currentUser!.id} />
    </div>
  )
}
