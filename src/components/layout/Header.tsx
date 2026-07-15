'use client'

import { Menu } from 'lucide-react'
import { useSidebar } from './SidebarProvider'
import { NotificationBell } from './NotificationBell'

export function Header() {
  const { toggle } = useSidebar()

  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1)

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Hamburger — só mobile */}
      <button
        onClick={toggle}
        className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Data + notificações */}
      <div className="ml-auto flex items-center gap-2">
        <span className="text-sm text-gray-500">{todayFormatted}</span>
        <NotificationBell />
      </div>
    </header>
  )
}
