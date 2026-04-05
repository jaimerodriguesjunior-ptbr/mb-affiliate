'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { togglePublish } from './produtos/actions'
import { useRouter } from 'next/navigation'

export function PublishToggle({ productId, initialStatus }: { productId: string, initialStatus: boolean }) {
  const [isPublished, setIsPublished] = useState(initialStatus)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleToggle = async () => {
    if (loading) return
    setLoading(true)
    
    const res = await togglePublish(productId, !isPublished)
    
    if (res.success) {
      setIsPublished(!isPublished)
      router.refresh()
    } else {
      alert('Erro ao atualizar status: ' + res.error)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={isPublished ? 'Remover da Vitrine Pública' : 'Publicar na Vitrine Pública'}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all border ${
        isPublished 
          ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/30 shadow-[0_0_15px_rgba(235,191,123,0.15)]' 
          : 'bg-white/5 text-white/30 border-white/5 hover:border-white/20'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95'}`}
    >
      {isPublished ? (
        <>
          <Eye className="w-3 h-3" />
          <span>Ativo na Vitrine</span>
        </>
      ) : (
        <>
          <EyeOff className="w-3 h-3" />
          <span>Em Monitoramento</span>
        </>
      )}
    </button>
  )
}
