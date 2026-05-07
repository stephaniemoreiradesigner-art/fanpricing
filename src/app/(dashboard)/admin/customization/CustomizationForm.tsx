'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Upload, X, Loader2 } from 'lucide-react'
import { saveCustomization, uploadLogo } from '@/app/actions/customization'

interface Customization {
  company_name: string | null
  logo_url: string | null
  brand_color: string | null
}

interface Props {
  config: Customization | null
}

const DEFAULT_COLOR = '#307ca8'

export function CustomizationForm({ config }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [color, setColor] = useState(config?.brand_color ?? DEFAULT_COLOR)
  const [logoUrl, setLogoUrl] = useState(config?.logo_url ?? '')
  const [logoPreview, setLogoPreview] = useState(config?.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')
    setUploading(true)
    setLogoPreview(URL.createObjectURL(file))

    const fd = new FormData()
    fd.append('logo', file)
    const result = await uploadLogo(fd)

    setUploading(false)
    if (result.error) {
      setUploadError(result.error)
      setLogoPreview(logoUrl)
      return
    }
    setLogoUrl(result.url!)
    setLogoPreview(result.url!)
  }

  function removeLogo() {
    setLogoUrl('')
    setLogoPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(formData: FormData) {
    formData.set('logo_url', logoUrl)
    setSaving(true)
    setSaveMsg('')
    const result = await saveCustomization(formData)
    setSaving(false)
    if (result.error) {
      setSaveMsg(`Erro: ${result.error}`)
    } else {
      setSaveMsg('Salvo com sucesso')
      router.refresh()
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">

      {/* Identidade */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--brand)' }}>
          Identidade da empresa
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Nome da empresa</label>
          <input
            type="text"
            name="company_name"
            defaultValue={config?.company_name ?? ''}
            placeholder="Ex: Agência FanPricing"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--brand)', opacity: 0.7 }}>
            Aparece na aba do navegador e nas propostas enviadas aos clientes.
          </p>
        </div>

        {/* Upload de logotipo */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-2">Logotipo</label>

          {logoPreview ? (
            <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="relative h-12 flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="h-12 max-w-45 object-contain"
                  onError={() => setLogoPreview('')}
                />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded">
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">Logo carregado</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--brand)', opacity: 0.7 }}>
                  Clique em substituir para trocar a imagem
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs font-medium px-3 py-1.5 border rounded-lg transition-colors disabled:opacity-50"
                  style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}
                >
                  Substituir
                </button>
                <button
                  type="button"
                  onClick={removeLogo}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Remover logo"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg transition-colors disabled:opacity-50 hover:bg-gray-50"
              style={{ borderColor: 'var(--brand)' }}
            >
              {uploading ? (
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--brand)' }} />
              ) : (
                <Upload size={24} style={{ color: 'var(--brand)' }} />
              )}
              <span className="text-sm font-medium" style={{ color: 'var(--brand)' }}>
                {uploading ? 'Enviando...' : 'Clique para fazer upload do logotipo'}
              </span>
              <span className="text-xs" style={{ color: 'var(--brand)', opacity: 0.6 }}>
                PNG, SVG ou JPG — recomendado fundo transparente
              </span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoSelect}
          />

          {uploadError && (
            <p className="text-xs text-red-500 mt-1">{uploadError}</p>
          )}
        </div>
      </div>

      {/* Cor da marca */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--brand)' }}>
          Cor da marca
        </h3>

        <div className="flex items-center gap-4">
          <input
            type="color"
            name="brand_color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-14 h-14 rounded-xl border border-gray-300 cursor-pointer p-0.5"
          />
          <div>
            <p className="text-sm font-semibold text-gray-800">{color.toUpperCase()}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--brand)', opacity: 0.7 }}>
              Usada em botões, destaques e PDF das propostas.
            </p>
          </div>
        </div>

        {/* Swatches */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--brand)', opacity: 0.8 }}>Sugestões</p>
          <div className="flex gap-2 flex-wrap">
            {['#307ca8', '#1a56db', '#7c3aed', '#059669', '#dc2626', '#d97706', '#374151'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={c}
                className="w-8 h-8 rounded-lg border-2 transition-all"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? '#111' : 'transparent',
                  transform: color === c ? 'scale(1.15)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg p-4 border border-gray-200 space-y-2">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--brand)', opacity: 0.8 }}>Preview</p>
          <button
            type="button"
            className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: color }}
          >
            Botão principal
          </button>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>
              F
            </div>
            <span className="text-sm font-bold" style={{ color }}>FanPricing</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || uploading}
          className="text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          {saving ? 'Salvando...' : 'Salvar personalização'}
        </button>
        {saveMsg && (
          <span className={`text-sm font-medium ${saveMsg.startsWith('Erro') ? 'text-red-500' : 'text-green-600'}`}>
            {saveMsg.startsWith('Erro') ? saveMsg : `✓ ${saveMsg}`}
          </span>
        )}
      </div>
    </form>
  )
}
