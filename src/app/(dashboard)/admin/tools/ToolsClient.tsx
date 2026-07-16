'use client'

import { useState } from 'react'
import { Pencil, Trash2, Check, X, Plus } from 'lucide-react'
import { createTool, updateTool, deleteTool } from '@/app/actions/tools'
import { formatCurrency } from '@/lib/calculations'
import type { Tool } from '@/types'

interface Props {
  items: Tool[]
}

export function ToolsClient({ items }: Props) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate(formData: FormData) {
    await createTool(formData)
    setAdding(false)
  }

  async function handleUpdate(formData: FormData) {
    await updateTool(formData)
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta ferramenta?')) return
    setDeletingId(id)
    await deleteTool(id)
    setDeletingId(null)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-900">Ferramentas cadastradas</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {items.length} cadastrada{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            setAdding(true)
            setEditingId(null)
          }}
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
              <th className="text-left px-6 py-3 font-medium">Ferramenta</th>
              <th className="text-left px-6 py-3 font-medium">Custo mensal</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <ToolRow formId="tool-add" onSave={handleCreate} onCancel={() => setAdding(false)} />
            )}

            {items.map((item) =>
              editingId === item.id ? (
                <ToolRow
                  key={item.id}
                  formId={`tool-edit-${item.id}`}
                  item={item}
                  onSave={handleUpdate}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{formatCurrency(item.monthly_cost)}/mês</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => {
                          setEditingId(item.id)
                          setAdding(false)
                        }}
                        className="text-gray-400 hover:text-[var(--brand)] transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}

            {items.length === 0 && !adding && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-400">
                  Nenhuma ferramenta cadastrada ainda. Clique em &quot;Adicionar&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ToolRow({
  formId,
  item,
  onSave,
  onCancel,
}: {
  formId: string
  item?: Tool
  onSave: (formData: FormData) => Promise<void>
  onCancel: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [costText, setCostText] = useState(
    item
      ? item.monthly_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : ''
  )

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    await onSave(formData)
    setSaving(false)
  }

  return (
    <tr className="border-b border-blue-100 bg-blue-50/40">
      <td className="px-6 py-2.5">
        <input
          form={formId}
          type="text"
          name="name"
          defaultValue={item?.name ?? ''}
          placeholder="Ex: Figma, Adobe CC, RD Station"
          required
          className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
        />
      </td>
      <td className="px-6 py-2.5">
        <div className="relative w-40">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">R$</span>
          <input
            form={formId}
            type="text"
            inputMode="decimal"
            name="monthly_cost"
            value={costText}
            placeholder="0,00"
            onChange={(e) => setCostText(e.target.value)}
            required
            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg pl-9 pr-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
          />
        </div>
      </td>
      <td className="px-6 py-2.5">
        <form id={formId} action={handleSubmit} className="flex items-center justify-end gap-2">
          {item && <input type="hidden" name="id" value={item.id} />}
          <button type="submit" disabled={saving} className="text-green-600 hover:text-green-700 disabled:opacity-40 transition-colors" title="Salvar">
            <Check size={18} />
          </button>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-red-500 transition-colors" title="Cancelar">
            <X size={18} />
          </button>
        </form>
      </td>
    </tr>
  )
}
