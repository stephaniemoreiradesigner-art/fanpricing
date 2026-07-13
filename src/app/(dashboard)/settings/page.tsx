import Link from 'next/link'
import { Settings, UserCog, Package, Hammer, Percent, Palette, FolderUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const ADMIN_SECTIONS = [
  {
    href: '/admin/users',
    label: 'Usuários',
    description: 'Gerencie usuários e permissões',
    icon: UserCog,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    href: '/admin/products',
    label: 'Produtos',
    description: 'Cadastre e edite produtos',
    icon: Package,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/admin/labor',
    label: 'Mão de Obra',
    description: 'Funções, níveis e salários',
    icon: Hammer,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    href: '/admin/markup',
    label: 'Markup',
    description: 'Overhead, impostos e margem',
    icon: Percent,
    color: 'bg-green-50 text-green-600',
  },
  {
    href: '/admin/customization',
    label: 'Personalização',
    description: 'Logo, cores e identidade visual',
    icon: Palette,
    color: 'bg-pink-50 text-pink-600',
  },
  {
    href: '/admin/files',
    label: 'Upload Arquivos',
    description: 'Modelos de contrato e proposta',
    icon: FolderUp,
    color: 'bg-orange-50 text-orange-600',
  },
]

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 flex items-center justify-center">
          <Settings size={20} className="text-[var(--brand)]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie as configurações do sistema.</p>
        </div>
      </div>

      {isAdmin ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Administração
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ADMIN_SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm hover:border-gray-300 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${section.color}`}>
                  <section.icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{section.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">Você não tem permissão de administrador.</p>
          <p className="text-xs text-gray-400 mt-1">Entre em contato com um administrador para alterar seu acesso.</p>
        </div>
      )}
    </div>
  )
}
