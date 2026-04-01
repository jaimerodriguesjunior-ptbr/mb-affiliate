import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, Plus, ExternalLink, Edit2, Clock, Settings, Store } from 'lucide-react'
import Link from 'next/link'
import { ProductActions } from './ProductActions'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq('owner_id', user.id)
    .single()

  let products: any[] = []
  if (tenant) {
    const { data: prods } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
    if (prods) products = prods
  }

  return (
    <div className="flex-1 p-6 sm:p-8 animate-in fade-in duration-500 h-full overflow-auto">
      <div className="max-w-7xl mx-auto">
        <header className="glass rounded-3xl p-6 px-8 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between border border-white/10 mb-8">
          <div>
            <h1 className="text-3xl font-serif">Painel de Administração</h1>
            <p className="text-brand-gold/70 mt-1 font-medium">Bem vindo, {user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-6 sm:mt-0">
            <Link 
              href="/admin/produtos/novo"
              className="flex items-center gap-2 text-sm bg-brand-brown text-white hover:bg-brand-brown-dark px-5 py-2.5 rounded-full transition-colors font-bold shadow-[0_8px_20px_rgba(140,109,69,0.3)]"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </Link>
            {tenant && (
              <>
                <Link 
                  href="/admin/loja"
                  className="flex items-center gap-2 text-sm bg-brand-gold/10 text-brand-gold border border-brand-gold/20 hover:bg-brand-gold/20 px-5 py-2.5 rounded-full transition-colors font-bold shadow-sm"
                >
                  <Store className="w-4 h-4" />
                  Configurar Loja
                </Link>
                {tenant.slug && (
                  <a 
                    href={`/c/${tenant.slug}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm bg-brand-gold text-brand-bg hover:bg-white px-5 py-2.5 rounded-full transition-colors font-bold shadow-[0_8px_20px_rgba(234,216,190,0.2)]"
                  >
                    Minha Vitrine
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </>
            )}
            <form action="/auth/signout" method="post">
              <button className="flex items-center gap-2 text-sm bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-full transition-colors border border-white/10 shadow-sm font-medium">
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </form>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {/* LIST EXISTING PRODUCTS */}
           {products.map((product) => {
             const validationDate = new Date(product.last_validated_at || product.created_at)
             const diffMs = new Date().getTime() - validationDate.getTime()
             const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
             const isExpired = diffDays >= 7
             const daysLeft = Math.max(0, 7 - diffDays)

             let clockColor = 'text-green-400'
             if (daysLeft <= 2 && daysLeft > 0) clockColor = 'text-amber-400'
             if (isExpired) clockColor = 'text-red-400'

             return (
             <div key={product.id} className={`glass rounded-2xl flex flex-col border ${isExpired ? 'border-red-500/50 hover:border-red-500 bg-red-950/20' : 'border-white/5 hover:border-white/20 bg-white/5'} transition-all overflow-hidden shadow-xl animate-in zoom-in-95 duration-500`}>
               {isExpired && (
                 <div className="bg-red-600/90 text-white text-center text-[10px] font-black uppercase tracking-[0.3em] py-2 z-20 shadow-md w-full">
                   ⚠️ Link Vencido (+7 dias)
                 </div>
               )}
               <div className="relative group flex-shrink-0">
                 {product.image_url ? (
                   <div className="h-44 bg-black/40">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                   </div>
                 ) : (
                   <div className="h-44 bg-black/20 flex items-center justify-center">
                      <span className="text-white/30 text-sm">Sem foto</span>
                   </div>
                 )}
                 {/* Clock Countdown */}
                 <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10 z-20 shadow-lg group-hover:opacity-0 transition-opacity duration-300">
                   <Clock className={`w-3.5 h-3.5 ${clockColor}`} />
                   <span className={`text-[10px] font-black ${clockColor}`}>
                     {isExpired ? 'Vencido' : `${daysLeft}d restantes`}
                   </span>
                 </div>
                 {/* Hover Edit Action centered directly over image */}
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center justify-center backdrop-blur-[2px]">
                   <Link 
                     href={`/admin/produtos/${product.id}/editar`} 
                     className="bg-brand-gold text-brand-bg p-4 rounded-full hover:scale-110 transition-transform shadow-2xl flex items-center justify-center"
                   >
                     <Edit2 className="w-5 h-5 fill-current" />
                   </Link>
                 </div>
               </div>
               
               <div className="p-5 flex flex-col flex-1">
                 <h3 className={`font-serif font-bold text-lg leading-tight line-clamp-2 mb-3 tracking-wide ${isExpired ? 'text-red-200' : ''}`}>{product.name}</h3>
                 
                 <div className={`flex-1 text-xs text-white/60 bg-black/30 rounded-lg p-3 line-clamp-4 font-sans border border-white/5 mt-auto mb-4 ${isExpired ? 'opacity-50' : ''}`}>
                   {product.generated_copy}
                 </div>
                 
                 <div className={`pt-3 border-t border-white/5 ${isExpired ? 'opacity-30 pointer-events-none' : ''}`}>
                   {/* This button already opens whatsapp natively on click! */}
                   <ProductActions textToCopy={product.generated_copy} />
                 </div>
               </div>
             </div>
             )
           })}
        </div>
      </div>
    </div>
  )
}
