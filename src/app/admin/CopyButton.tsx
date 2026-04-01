'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button 
      onClick={handleCopy}
      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
        copied 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'bg-white/10 text-white hover:bg-white/20 border border-white/5'
      }`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" /> Copiado!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" /> Copiar Copy + Link
        </>
      )}
    </button>
  )
}
