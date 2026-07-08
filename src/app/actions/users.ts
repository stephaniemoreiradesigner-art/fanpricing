'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/types'

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = await createClient()
  await supabase.from('profiles').update({ role }).eq('id', userId)
  revalidatePath('/admin/users')
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
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update(data).eq('id', userId)
  if (error) return { error: error.message }
  revalidatePath('/admin/users')
  return {}
}

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ error?: string }> {
  // Apenas administradores podem redefinir a senha de um usuário.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão expirada. Faça login novamente.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { error: 'Apenas administradores podem redefinir senhas.' }
  }

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

export async function deleteUser(userId: string) {
  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(userId)
  revalidatePath('/admin/users')
}

export async function inviteUser(formData: FormData) {
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

  if (error || !data.user) throw error

  await supabase.from('profiles').upsert({
    id: data.user.id,
    email,
    full_name,
    role,
  })

  revalidatePath('/admin/users')
}
