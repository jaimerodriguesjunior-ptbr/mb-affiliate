'use client'

import { useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { ProductActions } from './ProductActions'

export function GeneralCatalogCopy({ catalogUrl }: { catalogUrl: string }) {
  const [isOpen, setIsOpen] = useState(false)

  const copyText = `✨ *CADÊ AQUELA OFERTA?* ✨

Se você piscou e perdeu alguma promoção que passou por aqui, não se desespere! 😌

Nossas melhores oportunidades, com estoque real e preços verificados, estão organizadinhas esperando por você no nosso *Catálogo Oficial*.

Confira tudo aqui:
👉 ${catalogUrl}

*Dica:* As melhores ofertas voam! Não deixe para depois. 🚀`

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-sm bg-brand-gold text-brand-bg hover:bg-white px-5 py-2.5 rounded-full transition-colors font-bold shadow-[0_8px_20px_rgba(234,216,190,0.2)]"
      >
        <Megaphone className="w-4 h-4" />
        Divulgar Catálogo
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative border border-white/10 animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-serif mb-2 text-brand-gold">Divulgação Geral</h2>
            <p className="text-white/60 text-sm mb-6">
              Envie essa mensagem no seu grupo para lembrar os membros de visitar o catálogo.
            </p>

            <div className="bg-black/30 rounded-xl p-4 mb-6 border border-white/5 text-sm whitespace-pre-wrap text-white/80 max-h-60 overflow-y-auto font-sans leading-relaxed shadow-inner">
              {copyText}
            </div>

            <ProductActions textToCopy={copyText} linkToCopy={catalogUrl} />
          </div>
        </div>
      )}
    </>
  )
}
