'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/types'

// Garante que quem chama a action é admin. As telas /admin já são protegidas
// pelo proxy, mas server actions são endpoints POST invocáveis diretamente —
// sem esta checagem, um usuário comum poderia chamar a action e se promover.
async function assertAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirada. Faça login novamente.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { ok: false, error: 'Apenas administradores podem gerenciar usuários.' }
  }
  return { ok: true }
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<{ error?: string }> {
  const guard = await assertAdmin()
  if (!guard.ok) return { error: guard.error }

  // Usa o cliente admin (service role) para não esbarrar na RLS de profiles,
  // que normalmente só permite o usuário editar a própria linha.
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ role }).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return {}
}

export async function updateUser(
  userId: string,
  data: {
    full_name: string
    role: UserRole
    phone?: string | null
    cnpj?: string | null
    address?: string | null
    avatar_url?: string | null
  }
): Promise<{ error?: string }> {
  const guard = await assertAdmin()
  if (!guard.ok) return { error: guard.error }

  const admin = createAdminClient()

  // Usuários criados no Auth podem ainda não ter linha em profiles. Um UPDATE
  // não casaria nenhuma linha e a alteração (o papel) se perderia — a tela
  // voltaria a mostrar o padrão "Usuário". Por isso usamos UPSERT: cria a linha
  // se não existir, atualiza se já existir. Buscamos o e-mail no Auth porque
  // profiles.email costuma ser NOT NULL.
  const { data: authData } = await admin.auth.admin.getUserById(userId)
  const email = authData?.user?.email

  const full = { id: userId, ...(email ? { email } : {}), ...data }
  const { error } = await admin.from('profiles').upsert(full, { onConflict: 'id' })
  console.log('[updateUser] userId=', userId, 'email=', email, 'payload=', full)
  if (error) console.error('[updateUser] upsert FALHOU:', JSON.stringify(error))

  if (error) {
    // As colunas estendidas (phone/cnpj/address/avatar_url) podem não existir
    // na tabela profiles. Nesse caso o upsert inteiro falha — incluindo o papel.
    // Reaplica ao menos id + e-mail + nome + papel para a permissão persistir.
    const basic = {
      id: userId,
      ...(email ? { email } : {}),
      full_name: data.full_name,
      role: data.role,
    }
    const { error: basicError } = await admin
      .from('profiles')
      .upsert(basic, { onConflict: 'id' })
    if (basicError) {
      console.error('[updateUser] fallback FALHOU:', JSON.stringify(basicError))
      return { error: basicError.message }
    }
  }

  console.log('[updateUser] OK — gravado para', userId)
  revalidatePath('/admin/users')
  return {}
}

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ error?: string }> {
  const guard = await assertAdmin()
  if (!guard.ok) return { error: guard.error }

  if (!newPassword || newPassword.length < 6) {
    return { error: 'A senha deve ter ao menos 6 caracteres.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })
  if (error) return { error: error.message }
  return {}
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const guard = await assertAdmin()
  if (!guard.ok) return { error: guard.error }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}

export async function inviteUser(formData: FormData): Promise<{ error?: string }> {
  const guard = await assertAdmin()
  if (!guard.ok) return { error: guard.error }

  const email = formData.get('email') as string
  const full_name = formData.get('full_name') as string
  const role = (formData.get('role') as UserRole) ?? 'user'

  const admin = createAdminClient()
  const supabase = await createClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (error || !data.user) return { error: error?.message ?? 'Erro ao criar usuário.' }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    email,
    full_name,
    role,
  })
  if (profileError) return { error: profileError.message }

  revalidatePath('/admin/users')
  return {}
}
