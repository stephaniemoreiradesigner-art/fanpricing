'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trash2, Plus, Pencil, X, Camera, Loader2, KeyRound } from 'lucide-react'
import { updateUser, deleteUser, inviteUser, resetUserPassword } from '@/app/actions/users'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

interface UserRow {
  id: string
  email: string
  name: string
  role: UserRole
  phone: string
  cnpj: string
  address: string
  avatar_url: string | null
  created_at: string
}

interface Props {
  users: UserRow[]
  currentUserId: string
}

interface EditForm {
  full_name: string
  role: UserRole
  phone: string
  cnpj: string
  cep: string
  address: string
  avatar_url: string | null
}

// ── Máscaras ─────────────────────────────────────────────────────────────────

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskCpfCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  if (d.length <= 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  if (d.length === 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function maskCep(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

// ── CEP ──────────────────────────────────────────────────────────────────────

async function fetchViaCep(cep: string): Promise<{ logradouro: string; bairro: string; localidade: string; uf: string } | null> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = await res.json()
    return data.erro ? null : data
  } catch {
    return null
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export function UsersClient({ users, currentUserId }: Props) {
  const router = useRouter()
  const [showInvite, setShowInvite] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: '', role: 'user', phone: '', cnpj: '', cep: '', address: '', avatar_url: null,
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cepLoading, setCepLoading] = useState(false)

  // Redefinição de senha
  const [resetUser, setResetUser] = useState<UserRow | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetDone, setResetDone] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)

  function openEdit(user: UserRow) {
    setSaveError(null)
    setEditForm({
      full_name: user.name,
      role: user.role,
      phone: user.phone,
      cnpj: user.cnpj,
      cep: '',
      address: user.address,
      avatar_url: user.avatar_url,
    })
    setAvatarFile(null)
    setPreviewUrl(null)
    setCepLoading(false)
    setEditingUser(user)
  }

  function closeEdit() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setEditingUser(null)
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
  }

  async function handleCepChange(raw: string) {
    const masked = maskCep(raw)
    setEditForm((f) => ({ ...f, cep: masked }))
    const digits = masked.replace(/\D/g, '')
    if (digits.length !== 8) return
    setCepLoading(true)
    const data = await fetchViaCep(digits)
    if (data) {
      const parts = [data.logradouro, data.bairro, `${data.localidade} - ${data.uf}`].filter(Boolean)
      setEditForm((f) => ({ ...f, address: parts.join(', ') }))
    }
    setCepLoading(false)
  }

  async function handleSave() {
    if (!editingUser) return
    setSaving(true)

    let avatarUrl = editForm.avatar_url
    if (avatarFile) {
      const supabase = createClient()
      const ext = avatarFile.name.split('.').pop() ?? 'jpg'
      const path = `${editingUser.id}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = data.publicUrl
      }
    }

    const result = await updateUser(editingUser.id, {
      full_name: editForm.full_name,
      role: editForm.role,
      phone: editForm.phone || null,
      cnpj: editForm.cnpj || null,
      address: editForm.address || null,
      avatar_url: avatarUrl,
    })

    setSaving(false)
    if (result.error) {
      setSaveError(result.error)
      return
    }
    setEditingUser(null)
    router.refresh()
  }

  async function handleDelete(user: UserRow) {
    if (!confirm(`Excluir o usuário "${user.name || user.email}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(user.id)
    await deleteUser(user.id)
    setDeletingId(null)
    router.refresh()
  }

  function openReset(user: UserRow) {
    setResetUser(user)
    setNewPassword('')
    setResetError(null)
    setResetDone(false)
  }

  async function handleReset() {
    if (!resetUser) return
    setResetting(true)
    setResetError(null)
    const result = await resetUserPassword(resetUser.id, newPassword)
    setResetting(false)
    if (result.error) {
      setResetError(result.error)
      return
    }
    setResetDone(true)
  }

  async function handleInvite(formData: FormData) {
    setInviting(true)
    await inviteUser(formData)
    setInviting(false)
    setShowInvite(false)
    router.refresh()
  }

  const avatarSrc = previewUrl ?? editForm.avatar_url
  const avatarLetter = (editForm.full_name || editingUser?.email || 'U').charAt(0).toUpperCase()

  return (
    <>
      {/* ── Modal de edição ────────────────────────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <p className="text-base font-semibold text-gray-900">Cadastro de Usuário</p>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Avatar upload */}
              <div className="flex flex-col items-center gap-2">
                <div
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer bg-[var(--brand)]/10 flex items-center justify-center group"
                >
                  {avatarSrc ? (
                    <Image src={avatarSrc} alt="avatar" fill className="object-cover" sizes="80px" />
                  ) : (
                    <span className="text-[var(--brand)] font-bold text-2xl">{avatarLetter}</span>
                  )}
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={20} className="text-white" />
                  </div>
                </div>
                <p className="text-xs text-gray-400">Clique para alterar a foto</p>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              </div>

              {/* Dados pessoais */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Dados pessoais</p>
                <div className="space-y-3">

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      readOnly
                      className="w-full bg-gray-50 text-gray-500 border border-gray-200 rounded-lg px-3 py-2.5 text-sm cursor-not-allowed select-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">O e-mail é o identificador de login e não pode ser alterado aqui.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Nome completo *</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                      placeholder="Nome completo"
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">CNPJ / CPF</label>
                      <input
                        type="text"
                        value={editForm.cnpj}
                        onChange={(e) => setEditForm((f) => ({ ...f, cnpj: maskCpfCnpj(e.target.value) }))}
                        placeholder="000.000.000-00"
                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Telefone / WhatsApp</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* CEP + endereço */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-3 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">CEP</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={editForm.cep}
                          onChange={(e) => handleCepChange(e.target.value)}
                          placeholder="00000-000"
                          className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent pr-8"
                        />
                        {cepLoading && (
                          <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-800 mb-1">Endereço</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                        placeholder="Preenchido automaticamente pelo CEP"
                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Perfil de acesso */}
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Perfil de acesso</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {saveError && (
              <p className="text-xs text-red-500 px-6 pb-2">Erro ao salvar: {saveError}</p>
            )}

            {/* Footer do modal */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={handleSave}
                disabled={saving || !editForm.full_name.trim()}
                className="bg-[var(--brand)] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[var(--brand-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar cadastro'}
              </button>
              <button
                onClick={closeEdit}
                className="border border-gray-300 text-gray-600 text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de redefinição de senha ──────────────────────────────────── */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <p className="text-base font-semibold text-gray-900">Redefinir senha</p>
              <button onClick={() => setResetUser(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {resetDone ? (
                <div className="text-sm text-gray-700 space-y-1">
                  <p className="font-medium text-green-600">Senha redefinida com sucesso.</p>
                  <p className="text-gray-500">
                    {resetUser.name || resetUser.email} já pode entrar com a nova senha.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    Definir uma nova senha para <span className="font-medium text-gray-800">{resetUser.name || resetUser.email}</span>.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">Nova senha</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      autoComplete="new-password"
                      className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-1">A senha fica visível para você poder copiar e repassar.</p>
                  </div>
                  {resetError && <p className="text-xs text-red-500">{resetError}</p>}
                </>
              )}
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
              {resetDone ? (
                <button
                  onClick={() => setResetUser(null)}
                  className="bg-[var(--brand)] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[var(--brand-dark)] transition-colors"
                >
                  Fechar
                </button>
              ) : (
                <>
                  <button
                    onClick={handleReset}
                    disabled={resetting || newPassword.length < 6}
                    className="bg-[var(--brand)] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[var(--brand-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {resetting && <Loader2 size={14} className="animate-spin" />}
                    {resetting ? 'Redefinindo...' : 'Redefinir senha'}
                  </button>
                  <button
                    onClick={() => setResetUser(null)}
                    className="border border-gray-300 text-gray-600 text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de usuários ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        {showInvite && (
          <form
            action={handleInvite}
            className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4"
          >
            <h3 className="text-sm font-semibold text-gray-800">Adicionar novo usuário</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="Nome completo"
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="email@exemplo.com"
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Perfil</label>
                <select
                  name="role"
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              O usuário será criado sem senha. Envie o link de redefinição de senha pelo painel do Supabase.
            </p>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={inviting}
                className="bg-[var(--brand)] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[var(--brand-dark)] transition-colors disabled:opacity-50"
              >
                {inviting ? 'Criando...' : 'Criar usuário'}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="border border-gray-300 text-gray-600 text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="font-semibold text-gray-900">Usuários</h3>
              <p className="text-xs text-gray-400 mt-0.5">{users.length} cadastrado{users.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 bg-[var(--brand)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--brand-dark)] transition-colors"
            >
              <Plus size={16} />
              Adicionar
            </button>
          </div>

          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Nome</th>
                <th className="text-left px-6 py-3 font-medium">E-mail</th>
                <th className="text-left px-6 py-3 font-medium">Perfil</th>
                <th className="text-left px-6 py-3 font-medium">Desde</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isMe = user.id === currentUserId
                const letter = (user.name || user.email).charAt(0).toUpperCase()
                return (
                  <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[var(--brand)]/10 flex items-center justify-center">
                          {user.avatar_url ? (
                            <Image src={user.avatar_url} alt={user.name} width={32} height={32} className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-xs font-semibold text-[var(--brand)]">{letter}</span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {user.name || '—'}
                          {isMe && <span className="ml-1.5 text-xs text-gray-400">(você)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        user.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="text-gray-400 hover:text-[var(--brand)] transition-colors"
                          title="Editar usuário"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => openReset(user)}
                          className="text-gray-400 hover:text-[var(--brand)] transition-colors"
                          title="Redefinir senha"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={isMe || deletingId === user.id}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isMe ? 'Não é possível excluir sua própria conta' : 'Excluir usuário'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </>
  )
}
