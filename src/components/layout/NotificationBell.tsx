'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import type { AppNotification } from '@/types'
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/actions/notifications'

export function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)

  async function load() {
    try {
      setItems(await listMyNotifications())
    } catch {
      // silencioso — sino não deve quebrar o header
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60000) // atualiza a cada 60s
    return () => clearInterval(t)
  }, [])

  const unread = items.filter((n) => !n.read).length

  async function onClickItem(n: AppNotification) {
    if (!n.read) {
      await markNotificationRead(n.id)
      load()
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  async function onMarkAll() {
    await markAllNotificationsRead()
    load()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-40">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 sticky top-0 bg-white">
              <span className="text-sm font-semibold text-gray-900">Notificações</span>
              {unread > 0 && (
                <button onClick={onMarkAll} className="text-xs text-[var(--brand)] hover:underline">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Nenhuma notificação.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => onClickItem(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-[var(--brand)]/5' : ''}`}
                >
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {new Date(n.created_at).toLocaleString('pt-BR')}
                  </p>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
