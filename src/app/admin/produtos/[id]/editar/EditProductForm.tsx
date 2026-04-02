'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { updateProduct, deleteProduct } from '../../actions'
import { useRouter } from 'next/navigation'
import { ImageUpload } from '../../../ImageUpload'

export default function EditProductForm({ product }: { product: any }) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [data, setData] = useState({
    title: product.name || '',
    imageUrl: product.image_url || '',
    copy: product.generated_copy || '',
    rawLink: product.raw_link || '',
    price: product.price || '',
    category: product.category || 'Diversos'
  })

  const displayImage = data.imageUrl || product.image_url
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const currentShortUrl = `${baseUrl}/r/${product.short_link}`

  const validationDate = new Date(product.last_validated_at || product.created_at)
  const diffMs = new Date().getTime() - validationDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const daysLeft = Math.max(0, 7 - diffDays)
  const isExpired = daysLeft === 0

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMsg('')
    const res = await updateProduct(product.id, {
      name: data.title,
      image_url: data.imageUrl,
      generated_copy: data.copy,
      raw_link: data.rawLink,
      price: data.price === '' ? null : data.price,
      category: data.category
    })
    
    if (res.success) {
      router.push('/admin')
    } else {
      setErrorMsg(res.error || 'Erro ao atualizar no banco de dados.')
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      '⚠️ TEM CERTEZA?\n\nEssa ação é IRREVERSÍVEL.\nO produto será removido permanentemente do seu painel e da vitrine pública.'
    )
    if (!confirmed) return

    setIsSaving(true)
    setErrorMsg('')
    const res = await deleteProduct(product.id)
    if (res.success) {
      router.push('/admin')
    } else {
      setErrorMsg(res.error || 'Erro ao excluir o produto.')
      setIsSaving(false)
    }
  }

  return (
    <div className="flex-1 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-auto h-full">
      <div className="max-w-4xl mx-auto glass rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/5">
        <header className="flex items-start sm:items-center justify-between border-b border-white/10 pb-6 mb-8 gap-4 max-sm:flex-col">
          <div className="flex items-center gap-5">
            <Link href="/admin" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5">
              <ArrowLeft className="w-5 h-5 text-brand-gold" />
            </Link>
            <div>
              <h1 className="text-3xl font-serif">Editar Produto</h1>
              <p className="text-brand-gold/70 text-sm mt-1 font-medium">Ajuste os textos da IA ou insira manualmente uma foto.</p>
            </div>
          </div>
          <div className={`px-5 py-2.5 rounded-2xl text-center shadow-inner flex flex-col items-center justify-center min-w-[120px] ${isExpired ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
             <span className="block text-[10px] font-black uppercase tracking-widest">{isExpired ? 'Status' : 'Validade'}</span>
             <span className="block text-xl font-bold font-serif">{isExpired ? 'Expirado' : `${daysLeft} dias`}</span>
          </div>
        </header>

        <div className="flex flex-col gap-6">
           {errorMsg && (
                <p className="text-sm font-bold text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{errorMsg}</p>
           )}

           <div className="glass-input p-6 rounded-2xl relative border-brand-gold/20 shadow-inner">
              <div className="flex max-sm:flex-col gap-8">
                <div className="w-full sm:w-56 h-56 rounded-xl border border-white/10 flex-shrink-0 overflow-hidden shadow-lg">
                   <ImageUpload 
                     currentUrl={displayImage} 
                     onUploadSuccess={(url) => setData({ ...data, imageUrl: url })} 
                   />
                </div>
                
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                   <input 
                     className="text-2xl font-bold font-serif leading-tight bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-gold focus:outline-none w-full"
                     value={data.title}
                     onChange={(e) => setData({ ...data, title: e.target.value })}
                     placeholder="Dê um título ao produto"
                   />

                   <div className="flex gap-4 mt-1">
                     <div className="flex-1">
                       <label className="text-[10px] font-black uppercase text-brand-gold/60 mb-2 tracking-widest pl-1 block">
                         💰 Preço Real (Opcional):
                       </label>
                       <input 
                         type="number"
                         step="0.01"
                         className="w-full glass-input bg-white/5 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50 shadow-inner"
                         value={data.price}
                         onChange={(e) => setData({ ...data, price: e.target.value ? parseFloat(e.target.value) : '' })}
                         placeholder="99.90"
                       />
                     </div>
                     <div className="flex-1">
                       <label className="text-[10px] font-black uppercase text-brand-gold/60 mb-2 tracking-widest pl-1 block">
                         🏷️ Categoria da Loja:
                       </label>
                       <select
                         className="w-full glass-input bg-[#221c18] border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50 cursor-pointer shadow-inner"
                         value={data.category}
                         onChange={(e) => setData({ ...data, category: e.target.value })}
                       >
                         {['Diversos', 'Eletrônicos', 'Casa & Cozinha', 'Beleza & Saúde', 'Moda', 'Ferramentas', 'Brinquedos', 'Informática'].map(c => (
                           <option key={c} value={c}>{c}</option>
                         ))}
                       </select>
                     </div>
                   </div>
                   
                   <div className="flex flex-col mt-1">
                     <label className="text-[10px] font-black uppercase text-brand-gold/60 mb-2 tracking-widest pl-1">
                       URL da Imagem:
                     </label>
                     <input 
                       className="glass-input bg-white/5 rounded-xl p-3 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-brand-gold/50 text-white/70 shadow-inner"
                       value={data.imageUrl}
                       onChange={(e) => setData({ ...data, imageUrl: e.target.value })}
                       placeholder="Cole um link direto para a imagem vazada do fornecedor..."
                     />
                     <span className="text-[10px] text-white/40 mt-2 pl-1">A IA não encontrou a foto original? Copie o link da imagem no site da Shopee/Amazon e cole aqui.</span>
                   </div>
                   
                   <div className="flex flex-col mt-4">
                     <label className="text-[10px] font-black uppercase text-brand-gold/60 mb-2 tracking-widest pl-1">
                       Seus Links:
                     </label>
                     <div className="glass-input bg-white/5 rounded-xl p-3 flex flex-col gap-3 shadow-inner border border-white/5 w-full overflow-hidden">
                       <div className="flex flex-col gap-1 w-full">
                         <label className="text-[9px] font-bold text-white/50">LINK DO FORNECEDOR (ORIGINAL):</label>
                         <input 
                           className="bg-black/20 text-white/80 text-xs rounded-lg p-2.5 w-full focus:outline-none focus:ring-1 focus:ring-brand-gold/50 border border-white/5"
                           value={data.rawLink}
                           onChange={(e) => setData({ ...data, rawLink: e.target.value })}
                           placeholder="Cole o novo link do fornecedor aqui caso o anterior tenha inspirado..."
                         />
                       </div>
                       
                       <p className="text-[11px] text-brand-gold">
                         <strong className="text-brand-gold select-none">Encurtado: </strong> {currentShortUrl}
                       </p>
                     </div>
                   </div>
                   
                   <div className="flex-1 mt-4">
                      <label className="text-[10px] font-black uppercase text-brand-gold/60 mb-2 block tracking-widest pl-1">
                        Texto de Vendas (Copy do WhatsApp):
                      </label>
                      <textarea 
                         className="w-full h-48 glass-input bg-white/5 rounded-xl p-4 text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand-gold/50 shadow-inner resize-y"
                         value={data.copy}
                         onChange={(e) => setData({ ...data, copy: e.target.value })}
                      />
                   </div>
                </div>
              </div>
           </div>

           <div className="flex gap-4 items-center mt-4">
               <button 
                 onClick={handleSave}
                 disabled={isSaving}
                 className="flex-1 group inline-flex items-center justify-center gap-3 rounded-2xl bg-brand-gold text-brand-bg px-6 py-5 font-black uppercase tracking-widest text-sm hover:bg-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
               >
                 {isSaving ? 'Processando...' : (isExpired ? 'Revalidar Link Agora!' : 'Atualizar Mudanças')}
                 <Save className="w-5 h-5 ml-1" />
               </button>

               <button 
                 onClick={handleDelete}
                 disabled={isSaving}
                 className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-5 font-black uppercase tracking-widest text-xs hover:bg-red-500 hover:text-white transition-all shadow-lg disabled:opacity-50"
                 title="Excluir produto permanentemente"
               >
                 <Trash2 className="w-5 h-5" />
               </button>
           </div>
        </div>
      </div>
    </div>
  )
}
