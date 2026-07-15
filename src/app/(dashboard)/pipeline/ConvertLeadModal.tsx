'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead } from '@/types'
import { convertLeadToClient, moveLeadStatus } from '@/app/actions/leads'

const INPUT = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 placeholder:text-gray-400'

export function ConvertLeadModal({ lead, onFechar }: { lead: Lead; onFechar: () => void }) {
  const router = useRouter()
  const [nomeFantasia, setNomeFantasia] = useState(lead.company || lead.name)
  const [razaoSocial, setRazaoSocial] = useState(lead.company || '')
  const [responsavel, setResponsavel] = useState(lead.name)
  const [telefone, setTelefone] = useState(lead.phone || '')
  const [email, setEmail] = useState(lead.email || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function confirmar() {
    const razao = razaoSocial.trim() || nomeFantasia.trim()
    if (!razao) { setErro('Informe a razão social ou o nome fantasia.'); return }
    setSalvando(true); setErro('')
    try {
      const { clientId } = await convertLeadToClient(lead.id, {
        razao_social: razao,
        nome_fantasia: nomeFantasia.trim() || null,
        responsible: responsavel.trim() || null,
        phone: telefone.trim() || null,
        email: email.trim() || null,
      })
      // Cliente criado e disponível no seletor: segue para montar o orçamento.
      router.push(`/quotes/new?client=${clientId}`)
      router.refresh()
    } catch {
      setErro('Erro ao criar o cliente. Tente novamente.')
      setSalvando(false)
    }
  }

  async function fecharSemCriar() {
    setSalvando(true)
    await moveLeadStatus(lead.id, 'fechado')
    router.refresh()
    onFechar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={salvando ? undefined : onFechar} />
      <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎉</span>
              <h3 className="font-semibold text-gray-900 text-lg">Lead fechado!</h3>
            </div>
            <p className="text-sm text-gray-500">
              Cadastre <strong>{lead.name}</strong> como cliente para seguir com o orçamento.
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Nome Fantasia</label>
                <input type="text" value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} placeholder="Como a empresa é chamada" className={INPUT} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Razão Social</label>
                <input type="text" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Razão social" className={INPUT} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Responsável</label>
              <input type="text" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome do contato principal" className={INPUT} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Telefone</label>
                <input type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" className={INPUT} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">E-mail</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com.br" className={INPUT} />
              </div>
            </div>
          </div>

          {erro && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{erro}</p>}

          <div className="flex flex-col gap-2 pt-1">
            <button onClick={confirmar} disabled={salvando}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: 'var(--brand)' }}>
              {salvando ? 'Criando cliente...' : 'Criar cliente e montar orçamento'}
            </button>
            <button onClick={fecharSemCriar} disabled={salvando}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Só marcar como fechado por agora
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
