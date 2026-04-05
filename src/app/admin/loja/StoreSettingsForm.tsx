'use client'

import { useState } from 'react'
import { Save, CheckCircle2, Globe, Building2, Image as ImageIcon, Phone, Key, Copy, Check } from 'lucide-react'
import { updateTenantSettings } from './actions'
import { useRouter } from 'next/navigation'
import { ImageUpload } from '../ImageUpload'

function ApiKeyDisplay({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const masked = apiKey.substring(0, 8) + '••••••••••••••••'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-3">
      <div 
        className="flex-1 text-sm font-mono bg-black/30 border border-white/10 rounded-xl px-5 py-4 text-white/70 cursor-pointer select-all truncate"
        onClick={() => setRevealed(!revealed)}
        title="Clique para revelar/esconder"
      >
        {revealed ? apiKey : masked}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex-shrink-0 p-3 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/20 rounded-xl transition-colors"
        title="Copiar API Key"
      >
        {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-brand-gold" />}
      </button>
    </div>
  )
}

export default function StoreSettingsForm({ tenant }: { tenant: any }) {
  const router = useRouter()
  const [slug, setSlug] = useState(tenant.slug || '')
  const [name, setName] = useState(tenant.name || '')
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url || '')
  // Inteligência para retrocompatibilidade: Lê se é JSON ou apenas número
  let initialPhone = ''
  let initialGroup = ''
  if (tenant.whatsapp) {
    if (tenant.whatsapp.startsWith('{')) {
      try {
        const parsed = JSON.parse(tenant.whatsapp)
        initialPhone = parsed.phone || ''
        initialGroup = parsed.groupUrl || ''
      } catch (e) {}
    } else {
      initialPhone = tenant.whatsapp
    }
  }

  const [whatsapp, setWhatsapp] = useState(initialPhone)
  const [groupUrl, setGroupUrl] = useState(initialGroup)
  
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'error' | 'success', msg: string } | null>(null)

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const displayUrl = `${baseUrl.replace(/^https?:\/\//, '')}/c/${slug || 'sua-loja'}`

  const hasChanges = slug !== tenant.slug || name !== tenant.name || logoUrl !== tenant.logo_url || whatsapp !== initialPhone || groupUrl !== initialGroup

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setStatus(null)

    // Empacotamos para mandar pra Action
    const payloadWhatsapp = JSON.stringify({ phone: whatsapp, groupUrl: groupUrl })
    const res = await updateTenantSettings(tenant.id, { slug, name, logoUrl, whatsapp: payloadWhatsapp })
    
    if (res.success) {
      setSlug(res.slug) // atualiza pro slug higienizado pelo backend
      setStatus({ type: 'success', msg: '✅ A identidade da sua loja foi atualizada com sucesso!' })
      router.refresh()
    } else {
      setStatus({ type: 'error', msg: res.error || 'Erro inesperado ao atualizar a identidade.' })
    }
    setIsSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 relative z-10 animate-in fade-in duration-700">
       {status && (
          <div className={`p-4 rounded-xl border font-bold text-sm shadow-md ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
            {status.msg}
          </div>
       )}

       <div className="glass-input p-6 sm:p-8 rounded-2xl relative border-brand-gold/20 shadow-inner flex flex-col gap-8">
          
          {/* FOTO E NOME O LADO DO OUTRO */}
          <div className="flex max-sm:flex-col gap-6 items-center sm:items-start">
            {/* LOGO UPLOAD COMPONENT */}
            <div className="flex flex-col items-center gap-3">
              <label className="text-[10px] font-black uppercase text-brand-gold/80 flex items-center gap-2 tracking-[0.2em] sm:self-start">
                 <ImageIcon className="w-4 h-4" /> Logo 
              </label>
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-brand-gold/30 flex-shrink-0 overflow-hidden shadow-2xl bg-black/40 relative group">
                 <ImageUpload 
                   currentUrl={logoUrl} 
                   onUploadSuccess={(url) => setLogoUrl(url)} 
                 />
                 <div className="absolute inset-0 ring-inset ring-2 ring-white/10 rounded-full pointer-events-none" />
              </div>
            </div>

            {/* NOME DA EMPRESA */}
            <div className="flex-1 w-full flex flex-col gap-6">
               <div>
                 <label className="text-[11px] font-black uppercase text-brand-gold/80 mb-2 flex items-center gap-2 tracking-[0.2em]">
                   <Building2 className="w-4 h-4" />
                   Nome da Loja
                 </label>
                 <p className="text-white/50 text-xs mb-3">
                   O nome comercial gigante que aparecerá no centro da janela do seu cliente.
                 </p>
                 <input 
                   className="text-lg sm:text-2xl font-bold font-serif bg-black/30 border border-white/10 rounded-xl px-5 py-4 focus:border-brand-gold focus:outline-none w-full text-white/90 shadow-inner"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   placeholder="A Loja da Fulana"
                   required
                 />
               </div>
            </div>
          </div>

          {/* AREA DE DOMINIO SLUG */}
          <div className="pt-6 border-t border-white/5">
             <label className="text-[11px] font-black uppercase text-brand-gold/80 mb-2 flex items-center gap-2 tracking-[0.2em]">
               <Globe className="w-4 h-4" />
               Endereço da Vitrine ("Slug")
             </label>
             <p className="text-white/50 text-xs mb-4">
               Escolha o apelido único que aparecerá no link do seu catálogo público. 
               O sistema limpará qualquer espaço automaticamente.
             </p>
             <input 
               className="text-lg sm:text-2xl font-bold font-serif bg-black/30 border border-white/10 rounded-xl px-5 py-4 focus:border-brand-gold focus:outline-none w-full text-white/90 shadow-inner"
               value={slug}
               onChange={(e) => setSlug(e.target.value)}
               placeholder="Ex: achados-da-ana"
               required
             />
             
             <div className="mt-6 bg-brand-gold/10 border border-brand-gold/20 p-5 rounded-xl flex items-center justify-between gap-3">
               <div className="flex-1 overflow-hidden">
                 <span className="text-[9px] uppercase font-black tracking-widest text-brand-gold/50 block mb-1">Resultado final na internet:</span>
                 <span className="text-white/80 font-mono text-sm sm:text-base selection:bg-brand-gold/30 block truncate">
                    https://<strong className="text-brand-gold">{displayUrl}</strong>
                 </span>
               </div>
               {tenant.slug && (
                 <a 
                   href={`/c/${tenant.slug}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="hidden sm:inline-flex bg-brand-gold text-brand-bg px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-white transition-colors"
                 >
                   Visitar
                 </a>
               )}
             </div>
          </div>

           <div className="pt-6 border-t border-white/5 flex flex-col gap-6">
             <div>
               <label className="text-[11px] font-black uppercase text-brand-gold/80 mb-2 flex items-center gap-2 tracking-[0.2em]">
                 <Phone className="w-4 h-4" />
                 WhatsApp para Dúvidas (Botão Flutuante)
               </label>
               <p className="text-white/50 text-xs mb-4">
                 Inclua seu número com código de país (ex: 5511999999999). 
                 Aparecerá para atendimento privado do visitante.
               </p>
               <input 
                 className="text-lg font-bold font-mono bg-black/30 border border-white/10 rounded-xl px-5 py-4 focus:border-brand-gold focus:outline-none w-full text-white/90 shadow-inner"
                 value={whatsapp}
                 onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                 placeholder="5511999999999"
               />
             </div>

             <div>
               <label className="text-[11px] font-black uppercase text-brand-gold/80 mb-2 flex items-center gap-2 tracking-[0.2em]">
                 <Globe className="w-4 h-4" />
                 Link do Grupo VIP (Botão Fixo)
               </label>
               <p className="text-white/50 text-xs mb-4">
                 Cole o link de convite do seu grupo (ex: https://chat.whatsapp.com/...).
                 Um botão de destaque aparecerá no topo da vitrine para novos membros entrarem.
               </p>
               <input 
                 className="text-lg font-mono bg-black/30 border border-white/10 rounded-xl px-5 py-4 focus:border-brand-gold focus:outline-none w-full text-white/90 shadow-inner"
                 value={groupUrl}
                 onChange={(e) => setGroupUrl(e.target.value)}
                 placeholder="https://chat.whatsapp.com/..."
               />
             </div>
           </div>

          {/* API KEY PARA EXTENSÃO */}
          {tenant.api_key && (
          <div className="pt-6 border-t border-white/5">
             <label className="text-[11px] font-black uppercase text-brand-gold/80 mb-2 flex items-center gap-2 tracking-[0.2em]">
               <Key className="w-4 h-4" />
               API Key — Extensão Chrome
             </label>
             <p className="text-white/50 text-xs mb-4">
               Cole esta chave na extensão do Chrome para conectar a captura de produtos ao seu painel.
               <strong className="text-amber-400/80"> Não compartilhe esta chave.</strong>
             </p>
             <ApiKeyDisplay apiKey={tenant.api_key} />
          </div>
          )}
       </div>

       <div className="flex justify-end mt-2">
           <button 
             type="submit"
             disabled={isSaving || !slug.trim() || !name.trim() || !hasChanges}
             className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-brand-gold text-brand-bg px-8 py-4 font-black uppercase tracking-[0.2em] text-sm hover:bg-white transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isSaving ? 'Registrando...' : (status?.type === 'success' ? 'Marca Atualizada!' : 'Salvar Identidade')}
             {status?.type === 'success' ? <CheckCircle2 className="w-5 h-5 ml-1" /> : <Save className="w-5 h-5 ml-1" />}
           </button>
       </div>
    </form>
  )
}
