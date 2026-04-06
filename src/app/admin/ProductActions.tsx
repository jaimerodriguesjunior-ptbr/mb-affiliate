'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Link as LinkIcon, Clipboard } from 'lucide-react'

// Referência GLOBAL da aba do WhatsApp — compartilhada entre todos os cards
// Armazenada no objeto window para sobreviver a qualquer re-render do React
function getWaWindow(): Window | null {
  try {
    const ref = (window as any).__mb_waWindow
    if (ref && !ref.closed) return ref
  } catch (e) {}
  return null
}
function setWaWindow(w: Window | null) {
  (window as any).__mb_waWindow = w
}

// Ícone limpo do WhatsApp
const WhatsappIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.878-.788-1.47-1.761-1.643-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
)

export function ProductActions({ 
  textToCopy, 
  linkToCopy = '',
  phoneNumber = '' 
}: { 
  textToCopy: string, 
  linkToCopy?: string,
  phoneNumber?: string 
}) {
  const [copiedText, setCopiedText] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [waToast, setWaToast] = useState<'opened' | 'copied' | null>(null)

  // Limpa o toast após 3 segundos
  useEffect(() => {
    if (!waToast) return
    const t = setTimeout(() => setWaToast(null), 3000)
    return () => clearTimeout(t)
  }, [waToast])

  const handleCopyText = () => {
    navigator.clipboard.writeText(textToCopy)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleCopyLink = () => {
    if (!linkToCopy) return
    navigator.clipboard.writeText(linkToCopy)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleWhatsApp = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send'
    
    // Monta o texto final com link se necessário
    let finalPayload = textToCopy
    if (linkToCopy && !textToCopy.includes(linkToCopy)) {
      finalPayload += `\n\nConfira aqui: ${linkToCopy}`
    }

    const encodedText = encodeURIComponent(finalPayload)
    const url = phoneNumber 
      ? `${baseUrl}?phone=${phoneNumber}&text=${encodedText}`
      : `${baseUrl}?text=${encodedText}`

    // Sempre copia o texto para a área de transferência
    navigator.clipboard.writeText(finalPayload)

    // Verifica se já temos uma aba do WhatsApp aberta
    const existingWa = getWaWindow()

    if (existingWa) {
      // A aba já está aberta! Só copiamos o texto (já copiado acima).
      // O usuário troca para a aba do WA e cola com Ctrl+V.
      setWaToast('copied')
    } else {
      // Primeira vez (ou aba foi fechada): abre o WhatsApp com texto pré-preenchido
      const w = window.open(url, '_blank')
      setWaWindow(w)
      setWaToast('opened')
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full relative">
      <div className="flex gap-2">
        <button 
          onClick={handleCopyText}
          title="Copiar Texto de Venda"
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            copiedText 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
          }`}
        >
          {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copiedText ? 'Copiado' : 'Texto'}
        </button>

        {linkToCopy && (
          <button 
            onClick={handleCopyLink}
            title="Copiar Link de Afiliado"
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              copiedLink 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copiado' : 'Link'}
          </button>
        )}
      </div>
      
      <button 
        onClick={handleWhatsApp}
        title="Enviar p/ WhatsApp"
        className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-brand-gold text-brand-bg hover:bg-white border border-brand-gold/50 shadow-lg"
      >
        <WhatsappIcon />
        {waToast === 'copied' ? 'Texto Copiado! Cole no WA' : 'Enviar no Grupo'}
      </button>

      {/* Toast de feedback flutuante */}
      {waToast && (
        <div className={`absolute -top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl border animate-in fade-in slide-in-from-bottom-2 duration-300 whitespace-nowrap flex items-center gap-2 ${
          waToast === 'opened'
            ? 'bg-green-500/20 text-green-400 border-green-500/30'
            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        }`}>
          {waToast === 'opened' ? (
            <>
              <Check className="w-3.5 h-3.5" />
              WhatsApp aberto com o texto!
            </>
          ) : (
            <>
              <Clipboard className="w-3.5 h-3.5" />
              Texto copiado! Cole no WhatsApp (Ctrl+V)
            </>
          )}
        </div>
      )}
    </div>
  )
}

