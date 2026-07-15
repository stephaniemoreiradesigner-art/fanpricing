'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Filter,
  FileText,
  Send,
  FileSignature,
  BarChart2,
  Settings,
  LogOut,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { useSidebar } from './SidebarProvider'
import type { UserRole } from '@/types'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/clients',    label: 'Clientes',      icon: Users },
  { href: '/pipeline',   label: 'Pipeline',      icon: Filter },
  { href: '/quotes',     label: 'Orçamentos',    icon: FileText },
  { href: '/proposals',  label: 'Propostas',     icon: Send },
  { href: '/contracts',  label: 'Contratos',     icon: FileSignature },
  { href: '/stats',      label: 'Estatísticas',  icon: BarChart2 },
  { href: '/settings',   label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  role: UserRole
  userName: string
  avatarUrl: string | null
  logoUrl: string | null
}

export function Sidebar({ role, userName, avatarUrl, logoUrl }: SidebarProps) {
  const pathname = usePathname()
  const { isOpen, close } = useSidebar()

  const initials = userName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  const firstName = userName.includes('@') ? userName.split('@')[0] : userName.split(' ')[0]

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        onClick={close}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active ? 'text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
        style={active ? { backgroundColor: 'var(--brand)' } : undefined}
      >
        <Icon size={18} />
        {label}
      </Link>
    )
  }

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={close} />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-200 flex flex-col z-30
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Logo da empresa */}
        <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-200 shrink-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo"
              width={120}
              height={32}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="font-bold text-gray-900">FanPricing</span>
            </>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>

        {/* Rodapé do usuário */}
        <div className="px-4 py-3 shrink-0" style={{ backgroundColor: 'var(--brand-dark)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-white/20 flex items-center justify-center">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={userName} width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                <span className="text-white font-bold text-sm">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{firstName}</p>
              <p className="text-xs text-white/70">{role === 'admin' ? 'Admin' : 'Usuário'}</p>
              <p className="text-xs text-white/30">v1</p>
            </div>
            <form action={logout}>
              <button type="submit" className="text-white/70 hover:text-white transition-colors p-1" title="Sair">
                <LogOut size={18} />
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  )
}
