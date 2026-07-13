'use client'

import { useRef, useState } from 'react'
import { Pencil, Trash2, Check, X, Plus, Upload, FileDown } from 'lucide-react'
import { createLabor, updateLabor, deleteLabor, importLaborCSV } from '@/app/actions/labor'
import { formatCurrency } from '@/lib/calculations'
import type { Labor } from '@/types'

const LEVELS: Record<Labor['level'], string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
}

const LEVEL_COLORS: Record<Labor['level'], string> = {
  junior: 'bg-gray-100 text-gray-600',
  pleno: 'bg-blue-50 text-blue-700',
  senior: 'bg-purple-50 text-purple-700',
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase())
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(sep).map((v) => v.trim().replace(/^["']|["']$/g, ''))
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
    })
}

function normalizeLevel(raw: string): Labor['level'] {
  const l = raw.toLowerCase().trim()
  if (['júnior', 'junior', 'jr'].includes(l)) return 'junior'
  if (['sênior', 'senior', 'sr'].includes(l)) return 'senior'
  return 'pleno'
}

function downloadTemplate() {
  const rows = [
    'cargo,nivel,salario_mensal',
    'Desenvolvedor Front-end,pleno,8000',
    'Designer UX,senior,12000',
    'Redator,junior,4000',
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo-mao-de-obra.csv'
  a.click()
  URL.revokeObjectURL(url)
}

interface Props {
  items: Labor[]
}

export function LaborClient({ items }: Props) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleCreate(formData: FormData) {
    await createLabor(formData)
    setAdding(false)
  }

  async function handleUpdate(formData: FormData) {
    await updateLabor(formData)
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este profissional? Produtos que usam esta mão de obra serão afetados.')) return
    setDeletingId(id)
    await deleteLabor(id)
    setDeletingId(null)
  }

  async function handleCSVChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const parsed = parseCSV(text)

    const valid = parsed
      .map((r) => ({
        title: r.cargo || r.titulo || r.title || '',
        level: normalizeLevel(r.nivel || r.level || 'pleno'),
        monthly_salary: parseFloat(
          (r.salario_mensal || r.salario || r.monthly_salary || '0').replace(',', '.')
        ),
      }))
      .filter((r) => r.title && r.monthly_salary > 0)

    if (valid.length === 0) {
      alert('Nenhum registro válido encontrado. Verifique o formato do CSV.')
      e.target.value = ''
      return
    }

    if (!confirm(`Importar ${valid.length} profissional(is)? Registros duplicados serão adicionados.`)) {
      e.target.value = ''
      return
    }

    setImporting(true)
    await importLaborCSV(valid)
    setImporting(false)
    e.target.value = ''
  }

  function startAdding() {
    setAdding(true)
    setEditingId(null)
  }

  function startEditing(id: string) {
    setEditingId(id)
    setAdding(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div>
          <h3 className="font-semibold text-gray-900">Profissionais</h3>
          <p className="text-xs text-gray-400 mt-0.5">{items.length} cadastrado{items.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 border border-gray-300 text-gray-600 text-sm font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            title="Baixar modelo CSV"
          >
            <FileDown size={15} />
            Modelo CSV
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 border border-[var(--brand)] text-[var(--brand)] text-sm font-medium px-3 py-2 rounded-lg hover:bg-[var(--brand)]/5 transition-colors disabled:opacity-50"
          >
            <Upload size={15} />
            {importing ? 'Importando...' : 'Importar CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVChange} />
          <button
            onClick={startAdding}
            className="flex items-center gap-2 bg-[var(--brand)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--brand-dark)] transition-colors"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
            <th className="text-left px-6 py-3 font-medium">Cargo</th>
            <th className="text-left px-6 py-3 font-medium">Nível</th>
            <th className="text-left px-6 py-3 font-medium">Salário mensal</th>
            <th className="text-left px-6 py-3 font-medium">Valor/hora</th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody>
          {adding && (
            <LaborRow
              formId="labor-add"
              onSave={handleCreate}
              onCancel={() => setAdding(false)}
            />
          )}

          {items.map((item) =>
            editingId === item.id ? (
              <LaborRow
                key={item.id}
                formId={`labor-edit-${item.id}`}
                item={item}
                onSave={handleUpdate}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.title}</td>
                <td className="px-6 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${LEVEL_COLORS[item.level]}`}>
                    {LEVELS[item.level]}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">{formatCurrency(item.monthly_salary)}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{formatCurrency(item.hourly_rate)}/h</td>
                <td className="px-6 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => startEditing(item.id)}
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
              <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                Nenhum profissional cadastrado ainda. Clique em &quot;Adicionar&quot; ou importe um CSV.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function LaborRow({
  formId,
  item,
  onSave,
  onCancel,
}: {
  formId: string
  item?: Labor
  onSave: (formData: FormData) => Promise<void>
  onCancel: () => void
}) {
  const [salary, setSalary] = useState(item?.monthly_salary ?? 0)
  const [saving, setSaving] = useState(false)
  const hourlyRate = salary / 220

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
          name="title"
          defaultValue={item?.title ?? ''}
          placeholder="Ex: Desenvolvedor Front-end"
          required
          className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
        />
      </td>
      <td className="px-6 py-2.5">
        <select
          form={formId}
          name="level"
          defaultValue={item?.level ?? 'pleno'}
          className="bg-white text-gray-900 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
        >
          <option value="junior">Júnior</option>
          <option value="pleno">Pleno</option>
          <option value="senior">Sênior</option>
        </select>
      </td>
      <td className="px-6 py-2.5">
        <div className="relative w-40">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">R$</span>
          <input
            form={formId}
            type="number"
            name="monthly_salary"
            value={salary}
            min={0}
            step={100}
            onChange={(e) => setSalary(parseFloat(e.target.value) || 0)}
            required
            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg pl-9 pr-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
          />
        </div>
      </td>
      <td className="px-6 py-2.5 text-sm font-medium text-gray-700">
        {formatCurrency(hourlyRate)}/h
      </td>
      <td className="px-6 py-2.5">
        <form id={formId} action={handleSubmit} className="flex items-center justify-end gap-2">
          {item && <input type="hidden" name="id" value={item.id} />}
          <button
            type="submit"
            disabled={saving}
            className="text-green-600 hover:text-green-700 disabled:opacity-40 transition-colors"
            title="Salvar"
          >
            <Check size={18} />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Cancelar"
          >
            <X size={18} />
          </button>
        </form>
      </td>
    </tr>
  )
}
