'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'
import type { Lead, LeadStatus } from '@/types'
import { PIPELINE_COLUMNS } from '@/lib/pipeline'
import { createLead, updateLead, moveLeadStatus, deleteLead } from '@/app/actions/leads'
import { ConvertLeadModal } from './ConvertLeadModal'

const COR_HEADER: Record<LeadStatus, string> = {
  prospect: 'bg-blue-500/10 text-blue-700',
  contato: 'bg-purple-500/10 text-purple-700',
  proposta: 'bg-yellow-500/10 text-yellow-700',
  fechado: 'bg-green-500/10 text-green-700',
  perdido: 'bg-red-500/10 text-red-600',
}
const COR_BORDA: Record<LeadStatus, string> = {
  prospect: 'border-blue-200',
  contato: 'border-purple-200',
  proposta: 'border-yellow-200',
  fechado: 'border-green-200',
  perdido: 'border-red-200',
}
const ORIGENS = ['Indicação', 'Site', 'Instagram', 'LinkedIn', 'Google Ads', 'Meta Ads', 'Evento', 'Cold Call', 'Outro']
const LABEL_TEMPERATURA: Record<number, string> = {
  0: 'Sem classificação', 1: 'Frio', 2: 'Morno', 3: 'Aquecendo', 4: 'Quente', 5: 'Super quente',
}
const COR_TEMPERATURA: Record<number, string> = {
  1: 'text-sky-500', 2: 'text-teal-500', 3: 'text-amber-500', 4: 'text-orange-500', 5: 'text-red-500',
}

const INPUT = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 placeholder:text-gray-400'

function brl(v: number | null) {
  if (!v) return ''
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Máscara de telefone simples (Fan Pricing não tem util de máscara).
function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/[-\s]*$/, '')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/[-\s]*$/, '')
}

type FormData = {
  name: string; company: string; email: string; phone: string; source: string
  status: LeadStatus; estimated_value: string; owner: string; notes: string
  temperature: number; negotiation_history: string
}
const FORM_VAZIO: FormData = {
  name: '', company: '', email: '', phone: '', source: '',
  status: 'prospect', estimated_value: '', owner: '', notes: '',
  temperature: 0, negotiation_history: '',
}

function Termometro({ valor, onChange, tamanho = 'sm' }: {
  valor: number; onChange?: (v: number) => void; tamanho?: 'sm' | 'md'
}) {
  const cor = COR_TEMPERATURA[valor] ?? 'text-gray-300'
  const size = tamanho === 'md' ? 'h-6 w-6' : 'h-3.5 w-3.5'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const aceso = n <= valor
        const icone = (
          <Flame
            className={`${size} ${aceso ? cor : 'text-gray-300'}`}
            fill={aceso ? 'currentColor' : 'none'}
            strokeWidth={aceso ? 0 : 1.5}
          />
        )
        if (!onChange) return <span key={n} title={LABEL_TEMPERATURA[n]}>{icone}</span>
        return (
          <button key={n} type="button" title={LABEL_TEMPERATURA[n]}
            onClick={() => onChange(valor === n ? n - 1 : n)}
            className="transition-transform hover:scale-125">
            {icone}
          </button>
        )
      })}
    </div>
  )
}

export function PipelineBoard({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Lead | null>(null)
  const [form, setForm] = useState<FormData>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [sobreColuna, setSobreColuna] = useState<LeadStatus | null>(null)
  const [leadParaConverter, setLeadParaConverter] = useState<Lead | null>(null)

  function abrirNovo() { setForm(FORM_VAZIO); setEditando(null); setErro(''); setModalAberto(true) }
  function abrirEditar(l: Lead) {
    setForm({
      name: l.name, company: l.company ?? '', email: l.email ?? '', phone: l.phone ?? '',
      source: l.source ?? '', status: l.status, estimated_value: l.estimated_value?.toString() ?? '',
      owner: l.owner ?? '', notes: l.notes ?? '',
      temperature: l.temperature ?? 0, negotiation_history: l.negotiation_history ?? '',
    })
    setEditando(l); setErro(''); setModalAberto(true)
  }
  function campo<K extends keyof FormData>(k: K, v: FormData[K]) { setForm((f) => ({ ...f, [k]: v })) }
  function fecharModal() { setModalAberto(false) }

  async function salvar() {
    if (!form.name.trim()) return
    setSalvando(true); setErro('')
    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      source: form.source || null,
      status: form.status,
      estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      owner: form.owner.trim() || null,
      notes: form.notes.trim() || null,
      temperature: form.temperature,
      negotiation_history: form.negotiation_history.trim() || null,
    }
    try {
      if (editando) await updateLead(editando.id, payload)
      else await createLead(payload)
      fecharModal()
      router.refresh()
    } catch {
      setErro('Não foi possível salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  async function mover(lead: Lead, novoStatus: LeadStatus) {
    if (lead.status === novoStatus) return
    if (novoStatus === 'fechado') { setLeadParaConverter(lead); return }
    await moveLeadStatus(lead.id, novoStatus)
    router.refresh()
  }

  async function excluir() {
    if (!editando) return
    await deleteLead(editando.id)
    fecharModal()
    router.refresh()
  }

  function onDrop(e: React.DragEvent, novoStatus: LeadStatus) {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    const lead = leads.find((l) => l.id === leadId)
    setSobreColuna(null); setDraggingId(null)
    if (!lead || lead.status === novoStatus) return
    if (novoStatus === 'fechado') { setLeadParaConverter(lead); return }
    moveLeadStatus(lead.id, novoStatus).then(() => router.refresh())
  }

  const totalFechado = leads.filter((l) => l.status === 'fechado').reduce((s, l) => s + (l.estimated_value ?? 0), 0)
  const totalPipeline = leads.filter((l) => !['fechado', 'perdido'].includes(l.status)).reduce((s, l) => s + (l.estimated_value ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-4 text-sm text-gray-500">
          {totalPipeline > 0 && <span>Pipeline: <strong className="text-gray-900">{brl(totalPipeline)}</strong></span>}
          {totalFechado > 0 && <span>Fechado: <strong className="text-green-600">{brl(totalFechado)}</strong></span>}
        </div>
        <button onClick={abrirNovo}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors"
          style={{ backgroundColor: 'var(--brand)' }}>
          + Novo lead
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {PIPELINE_COLUMNS.map((col) => {
          const itens = leads.filter((l) => l.status === col.status)
          const destacada = sobreColuna === col.status
          return (
            <div key={col.status}
              onDragOver={(e) => { e.preventDefault(); setSobreColuna(col.status) }}
              onDragLeave={() => setSobreColuna(null)}
              onDrop={(e) => onDrop(e, col.status)}
              className={`rounded-xl border-2 bg-gray-50 p-3 min-h-52 transition-colors ${destacada ? 'border-[var(--brand)] bg-[var(--brand)]/5' : COR_BORDA[col.status]}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COR_HEADER[col.status]}`}>{col.label}</span>
                <span className="text-xs text-gray-400">{itens.length}</span>
              </div>
              <div className="space-y-2">
                {itens.map((lead) => (
                  <div key={lead.id} draggable
                    onDragStart={(e) => { setDraggingId(lead.id); e.dataTransfer.setData('leadId', lead.id) }}
                    onDragEnd={() => { setDraggingId(null); setSobreColuna(null) }}
                    onClick={() => abrirEditar(lead)}
                    className={`rounded-lg border border-gray-200 bg-white p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all select-none ${draggingId === lead.id ? 'opacity-40 scale-95' : ''}`}>
                    <p className="text-sm font-medium text-gray-900 leading-tight">{lead.name}</p>
                    {lead.company && <p className="text-xs text-gray-500 mt-0.5">{lead.company}</p>}
                    {lead.estimated_value ? <p className="text-xs font-semibold text-green-600 mt-1">{brl(lead.estimated_value)}</p> : null}
                    {lead.owner && <p className="text-xs text-gray-500 mt-1">👤 {lead.owner}</p>}
                    {lead.temperature ? <div className="mt-1.5" title={LABEL_TEMPERATURA[lead.temperature]}><Termometro valor={lead.temperature} /></div> : null}
                  </div>
                ))}
                {destacada && draggingId && (
                  <div className="rounded-lg border-2 border-dashed border-[var(--brand)]/40 p-3 text-center">
                    <p className="text-xs text-[var(--brand)]/60">Soltar aqui</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={fecharModal} />
          <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{editando ? 'Editar lead' : 'Novo lead'}</h3>
                <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Nome <span className="text-red-500">*</span></label>
                    <input type="text" value={form.name} onChange={(e) => campo('name', e.target.value)} placeholder="Nome do contato" className={INPUT} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Empresa</label>
                    <input type="text" value={form.company} onChange={(e) => campo('company', e.target.value)} placeholder="Nome da empresa" className={INPUT} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">E-mail</label>
                    <input type="email" value={form.email} onChange={(e) => campo('email', e.target.value)} placeholder="email@exemplo.com" className={INPUT} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Telefone</label>
                    <input type="text" value={form.phone} onChange={(e) => campo('phone', mascaraTelefone(e.target.value))} placeholder="(11) 99999-9999" maxLength={15} className={INPUT} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Origem</label>
                    <select value={form.source} onChange={(e) => campo('source', e.target.value)} className={INPUT}>
                      <option value="">Selecionar</option>
                      {ORIGENS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                    <select value={form.status} onChange={(e) => campo('status', e.target.value as LeadStatus)} className={INPUT}>
                      {PIPELINE_COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Valor estimado (R$)</label>
                    <input type="number" min="0" step="0.01" value={form.estimated_value} onChange={(e) => campo('estimated_value', e.target.value)} placeholder="0,00" className={INPUT} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Responsável</label>
                    <input type="text" value={form.owner} onChange={(e) => campo('owner', e.target.value)} placeholder="Nome" className={INPUT} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Observações</label>
                  <textarea value={form.notes} onChange={(e) => campo('notes', e.target.value)} rows={2} className={INPUT + ' resize-none'} placeholder="Notas sobre o lead..." />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Temperatura</label>
                  <div className="flex items-center gap-3">
                    <Termometro valor={form.temperature} onChange={(n) => campo('temperature', n)} tamanho="md" />
                    <span className="text-xs text-gray-500">{LABEL_TEMPERATURA[form.temperature]}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Histórico de negociação</label>
                  <textarea value={form.negotiation_history} onChange={(e) => campo('negotiation_history', e.target.value)} rows={3} className={INPUT + ' resize-none'} placeholder="Registre as conversas e o andamento da negociação..." />
                </div>
                {editando && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Mover para</label>
                    <div className="flex gap-1 flex-wrap">
                      {PIPELINE_COLUMNS.filter((c) => c.status !== editando.status).map((c) => (
                        <button key={c.status} type="button"
                          onClick={() => { mover(editando, c.status); setModalAberto(false) }}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${COR_HEADER[c.status]}`}>
                          → {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{erro}</p>}
              <div className="flex items-center justify-between pt-1">
                {editando && <button onClick={excluir} className="text-sm text-red-600 hover:text-red-700 transition-colors">Excluir</button>}
                <div className={`flex gap-2 ${!editando ? 'ml-auto' : ''}`}>
                  <button onClick={fecharModal} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                  <button onClick={salvar} disabled={salvando || !form.name.trim()}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: 'var(--brand)' }}>
                    {salvando ? 'Salvando...' : editando ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {leadParaConverter && (
        <ConvertLeadModal lead={leadParaConverter} onFechar={() => setLeadParaConverter(null)} />
      )}
    </div>
  )
}
