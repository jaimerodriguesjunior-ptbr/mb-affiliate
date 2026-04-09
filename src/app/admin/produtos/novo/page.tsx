'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Wand2, Link as LinkIcon, Save, RefreshCw } from 'lucide-react'
import { scrapeAndGenerateCopy, saveProduct, getTenantCategories } from '../actions'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ImageUpload } from '../../ImageUpload'

type PreviewData = {
  title: string
  imageUrl: string | null
  description: string
  copy: string
  shortId: string
  price: number | ''
  category: string
}

export default function NewProductPage() {
  const [link, setLink] = useState('')
  const [pageContent, setPageContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [availableCategories, setAvailableCategories] = useState<string[]>([])

  useEffect(() => {
    getTenantCategories().then(setAvailableCategories)
  }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!link) return
    setIsLoading(true)
    setErrorMsg('')
    
    // Call our Server Action (com texto colado da página ou vazio)
    const result = await scrapeAndGenerateCopy(link, pageContent.trim())
    
    if (result.success && result.data) {
       setPreview({ 
         ...result.data, 
         price: result.data.price === null ? '' : result.data.price, 
         category: 'DIVERSOS' 
       })
    } else {
       setErrorMsg(result.error || 'Erro desconhecido')
    }
    
    setIsLoading(false)
  }

  const handleSave = async () => {
    if (!preview) return
    if (!link) {
      setErrorMsg('O link original do produto é obrigatório.')
      return
    }
    setIsSaving(true)
    setErrorMsg('')
    
    // Call Server Action
    const res = await saveProduct({
      title: preview.title,
      description: preview.description,
      imageUrl: preview.imageUrl,
      copy: preview.copy,
      rawLink: link,
      shortId: preview.shortId,
      price: preview.price === '' ? null : preview.price,
      category: preview.category
    })

    if (res.success) {
       router.push('/admin')
    } else {
       setErrorMsg(res.error || 'Erro ao salvar o produto.')
       setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto glass rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/5">
        <header className="flex items-center gap-5 border-b border-white/10 pb-6 mb-8">
          <Link href="/admin" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5">
            <ArrowLeft className="w-5 h-5 text-brand-gold" />
          </Link>
          <div>
            <h1 className="text-3xl font-serif">Novo Produto</h1>
            <p className="text-brand-gold/70 text-sm mt-1 font-medium">Use a IA para buscar os dados ou cadastre tudo manualmente.</p>
          </div>
        </header>

        {!preview ? (
          <form onSubmit={handleGenerate} className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <label htmlFor="url" className="text-[11px] font-black tracking-[0.2em] uppercase text-brand-gold/80 ml-1">
                Link Original do Produto (Fornecedor)
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-brand-gold">
                  <LinkIcon className="h-5 w-5 text-white/30 group-focus-within:text-brand-gold transition-colors" />
                </div>
                <input
                  id="url"
                  type="url"
                  required
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Exemplo: https://s.shopee.com.br/xxxx"
                  className="glass-input w-full rounded-2xl pl-12 pr-6 py-5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all font-sans text-base shadow-inner bg-white/5"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-black tracking-[0.2em] uppercase text-brand-gold/80 ml-1">
                Texto da Página (Ctrl+A → Ctrl+C no site)
              </label>
              <textarea
                value={pageContent}
                onChange={(e) => setPageContent(e.target.value)}
                placeholder="Abra o link do produto no navegador, selecione tudo (Ctrl+A), copie (Ctrl+C) e cole aqui. Isso ajuda a IA a gerar um texto bem específico!"
                className="glass-input w-full rounded-2xl px-6 py-5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-all font-sans text-sm shadow-inner bg-white/5 h-36 resize-y"
              />
              <p className="text-[10px] text-white/40 ml-2">Opcional mas RECOMENDADO. Sem isso a IA gera texto genérico.</p>
              
              {errorMsg && (
                <p className="text-sm font-bold text-red-400 ml-2 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{errorMsg}</p>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button 
                disabled={isLoading || !link}
                type="submit"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-brand-brown px-8 py-5 text-[13px] font-black uppercase tracking-[0.2em] text-white shadow-[0_16px_30px_rgba(140,109,69,0.30)] hover:bg-brand-brown-dark focus:ring-2 focus:ring-brand-gold/50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Analisando e Gerando Copy...' : (pageContent ? 'Gerar Copy com Texto Colado' : 'Gerar Copy (Modo Básico)')}
                < Wand2 className={`w-5 h-5 transition-transform ${isLoading ? 'animate-pulse' : 'group-hover:rotate-12 group-hover:scale-110'}`} />
              </button>

              <button 
                type="button"
                onClick={() => {
                  setErrorMsg('')
                  setPreview({
                    title: '',
                    imageUrl: null,
                    description: '',
                    copy: '',
                    shortId: crypto.randomUUID().split('-')[0],
                    price: '',
                    category: 'DIVERSOS'
                  })
                }}
                disabled={isLoading}
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
              >
                Ou Criar Tudo Manualmente
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-6 animate-in fade-in duration-700">
             <div className="glass-input p-6 rounded-2xl relative border-brand-gold/20">
                <button 
                  onClick={() => setPreview(null)} 
                  className="absolute top-4 right-4 text-xs font-bold text-white/50 hover:text-white flex items-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" /> refazer
                </button>
                <div className="flex max-sm:flex-col gap-6">
                  <div className="w-full sm:w-48 h-48 rounded-xl border border-white/10 flex-shrink-0 overflow-hidden shadow-lg bg-black/20">
                     <ImageUpload 
                       currentUrl={preview.imageUrl} 
                       onUploadSuccess={(url) => setPreview({ ...preview, imageUrl: url })} 
                     />
                  </div>
                  <div className="flex flex-col gap-3 flex-1 min-w-0">
                     <input 
                       className="text-xl font-bold font-serif leading-tight bg-transparent border-b border-brand-gold/30 focus:border-brand-gold focus:outline-none pb-1 w-full"
                       value={preview.title}
                       onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                       placeholder="Dê um título ao produto"
                     />
                     <div className="flex gap-4 mt-2">
                       <div className="flex-1">
                         <label className="text-[9px] font-black uppercase text-brand-gold/60 mb-1 tracking-widest">
                           URL da Imagem (Opcional):
                         </label>
                         <input 
                           className="w-full glass-input bg-white/5 rounded-lg p-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-brand-gold/50 text-white/70"
                           value={preview.imageUrl || ''}
                           onChange={(e) => setPreview({ ...preview, imageUrl: e.target.value })}
                           placeholder="Link direto de imagem..."
                         />
                       </div>
                       <div className="flex-1">
                         <label className="text-[9px] font-black uppercase text-brand-gold/60 mb-1 tracking-widest">
                           Link Original (Obrigatório):
                         </label>
                         <input 
                           className="w-full glass-input bg-white/5 rounded-lg p-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-brand-gold/50 text-white/70 border border-brand-gold/30 focus:border-brand-gold/80"
                           value={link}
                           onChange={(e) => setLink(e.target.value)}
                           placeholder="https://s.shopee..."
                         />
                       </div>
                     </div>
                     <div className="flex gap-4 mt-2">
                       <div className="flex-1">
                         <label className="text-[10px] font-black uppercase text-brand-gold/70 mb-1 block tracking-widest">
                           💰 Preço Real (Opcional):
                         </label>
                         <input 
                           type="number"
                           step="0.01"
                           className="w-full glass-input bg-white/5 rounded-lg p-2.5 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                           value={preview.price}
                           onChange={(e) => setPreview({ ...preview, price: e.target.value ? parseFloat(e.target.value) : '' })}
                           placeholder="99.90"
                         />
                       </div>
                       <div className="flex-1">
                         <label className="text-[10px] font-black uppercase text-brand-gold/70 mb-1 block tracking-widest">
                           🏷️ Categoria da Loja:
                         </label>
                         <input
                            list="categories-list"
                            className="w-full glass-input bg-[#221c18] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50 cursor-pointer placeholder-white/20 uppercase"
                            value={preview.category}
                            onChange={(e) => setPreview({ ...preview, category: e.target.value.toUpperCase() })}
                            placeholder="DIGITE OU SELECIONE..."
                          />
                          <datalist id="categories-list">
                            {availableCategories.map(c => (
                              <option key={c} value={c} />
                            ))}
                            {availableCategories.length === 0 && (
                              <>
                                <option value="DIVERSOS" />
                                <option value="ELETRÔNICOS" />
                                <option value="CASA & COZINHA" />
                                <option value="BELEZA & SAÚDE" />
                                <option value="MODA" />
                              </>
                            )}
                          </datalist>
                       </div>
                     </div>

                     <div className="flex-1 mt-3">
                        <label className="text-[10px] font-black uppercase text-brand-gold/70 mb-2 block tracking-widest">
                          Texto Gerado para o WhatsApp:
                        </label>
                        <textarea 
                           className="w-full h-32 glass-input bg-white/5 rounded-xl p-4 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                           value={preview.copy}
                           onChange={(e) => setPreview({ ...preview, copy: e.target.value })}
                        />
                     </div>
                  </div>
                </div>
             </div>

             {errorMsg && (
                <p className="text-sm font-bold text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{errorMsg}</p>
             )}
             <div className="flex gap-4 items-center">
                 <button 
                   onClick={handleSave}
                   disabled={isSaving}
                   className="flex-1 group inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gold text-brand-bg px-6 py-4 font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isSaving ? 'Salvando...' : 'Salvar no Catálogo'}
                   <Save className="w-4 h-4 ml-1" />
                 </button>
             </div>
          </div>
        )}

      </div>
    </div>
  )
}
