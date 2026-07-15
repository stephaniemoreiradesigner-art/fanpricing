import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NotificationType } from '@/types'

// Helpers server-only. Usam o cliente service-role para escrever notificações
// em linhas de OUTROS usuários (a RLS de notifications é own-row).

export async function createNotifications(
  userIds: string[],
  n: { type: NotificationType; title: string; body?: string | null; link?: string | null }
): Promise<void> {
  if (userIds.length === 0) return
  const admin = createAdminClient()
  const rows = userIds.map((user_id) => ({
    user_id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
  }))
  await admin.from('notifications').insert(rows)
}

export interface AdminRecipient {
  id: string
  email: string | null
  name: string | null
}

// Lista os administradores (para notificar por push + e-mail).
export async function getAdmins(): Promise<AdminRecipient[]> {
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('id, email, full_name').eq('role', 'admin')
  return (data ?? []).map((p) => ({
    id: p.id as string,
    email: (p.email as string) ?? null,
    name: (p.full_name as string) ?? null,
  }))
}
