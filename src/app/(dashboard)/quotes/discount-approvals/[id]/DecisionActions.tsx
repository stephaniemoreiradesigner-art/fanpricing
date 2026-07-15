'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveDiscount, rejectDiscount } from '@/app/actions/discount-approvals'

export function DecisionActions({ approvalId }: { approvalId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')

  async function aprovar() {
    setBusy(true)
    setError('')
    const result = await approveDiscount(approvalId)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  async function recusar() {
    if (!reason.trim()) {
      setError('Escreva o motivo da recusa.')
      return
    }
    setBusy(true)
    setError('')
    const result = await rejectDiscount(approvalId, reason.trim())
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setShowReject(false)
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Decisão</h3>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={aprovar}
          disabled={busy}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {busy ? 'Processando...' : 'Aprovar desconto'}
        </button>
        <button
          onClick={() => { setShowReject(true); setError('') }}
          disabled={busy}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Recusar desconto
        </button>
      </div>

      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !busy && setShowReject(false)} />
          <div className="relative bg-white border border-gray-200 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Motivo da recusa</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/40 resize-none"
              placeholder="Explique por que o desconto não foi aprovado..."
            />
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReject(false)} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={recusar} disabled={busy || !reason.trim()} className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">
                {busy ? 'Enviando...' : 'Confirmar recusa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
