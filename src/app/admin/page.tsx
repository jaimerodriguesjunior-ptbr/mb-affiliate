import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, Plus, ExternalLink, Edit2, Clock, Settings, Store, TrendingDown, TrendingUp, Minus, Zap, Star, MessageSquare, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { ProductActions } from './ProductActions'
import { GeneralCatalogCopy } from './GeneralCatalogCopy'
import { PublishToggle } from './PublishToggle'
import { analisarPrecosTenant, type StatusOferta } from '@/utils/price-analysis'

export default async function AdminDashboard({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: selectedStatus = 'all' } = await searchParams
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
    let query = supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
    
    if (selectedStatus === 'published') {
      query = query.eq('is_published', true)
    } else if (selectedStatus === 'monitoring') {
      query = query.eq('is_published', false)
    }

    const { data: prods } = await query
    if (prods) products = prods
  }

  // Análise de preços para todos os produtos do tenant
  let priceAnalysis = new Map<string, any>()
  if (tenant) {
    priceAnalysis = await analisarPrecosTenant(tenant.id)
  }

  return (
    <div className="flex-1 p-6 sm:p-8 animate-in fade-in duration-500 h-full overflow-auto">
      <div className="max-w-7xl mx-auto">
        {/* ... (header) */}
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
                  <>
                    <a 
                      href={`/c/${tenant.slug}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm bg-white/10 text-white hover:bg-white/20 border border-white/10 px-5 py-2.5 rounded-full transition-colors font-bold shadow-sm"
                    >
                      Acessar Vitrine
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <GeneralCatalogCopy catalogUrl={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/c/${tenant.slug}`} />
                  </>
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

        {/* FILTRO DE STATUS */}
        <div className="flex flex-wrap items-center gap-3 mb-8 animate-in slide-in-from-left-4 duration-500">
          <Link 
            href="/admin?status=all"
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedStatus === 'all' ? 'bg-brand-gold text-brand-bg shadow-[0_5px_20px_rgba(235,191,123,0.3)]' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white'}`}
          >
            Todos ({products.length})
          </Link>
          <Link 
            href="/admin?status=published"
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedStatus === 'published' ? 'bg-brand-gold text-brand-bg shadow-[0_5px_20px_rgba(235,191,123,0.3)]' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white'}`}
          >
            🟢 Ativos na Vitrine
          </Link>
          <Link 
            href="/admin?status=monitoring"
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedStatus === 'monitoring' ? 'bg-brand-gold text-brand-bg shadow-[0_5px_20px_rgba(235,191,123,0.3)]' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white'}`}
          >
            🕒 Em Monitoramento
          </Link>
        </div>

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

             // Análise de preço deste produto
             const analise = priceAnalysis.get(product.id)
             const statusOferta: StatusOferta | undefined = analise?.status_oferta

             // Cores e labels do status
             const statusConfig: Record<string, { bg: string, text: string, label: string, Icon: any }> = {
               excelente: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: '⚡ Menor preço!', Icon: TrendingDown },
               boa: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: '👍 Boa oferta', Icon: Minus },
               normal: { bg: 'bg-white/5', text: 'text-white/50', label: 'Preço normal', Icon: TrendingUp },
               sem_dados: { bg: 'bg-white/5', text: 'text-white/30', label: '—', Icon: Minus },
             }
             const sConfig = statusOferta ? statusConfig[statusOferta] : null

             // Origem do produto
             const origemLabels: Record<string, string> = {
               shopee: '🛒 Shopee',
               mercadolivre: '🤝 ML',
               amazon: '📦 AMZ',
               magalu: '💜 Magalu',
               manual: '✏️ Manual',
               outro: '🌐 Outro',
             }

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
                  {/* Status Badge (Published/Monitoring) */}
                  <div className="absolute bottom-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <PublishToggle productId={product.id} initialStatus={product.is_published} />
                  </div>
                  {/* Origem Badge */}
                  {product.origem && product.origem !== 'manual' && (
                    <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 z-20 shadow-lg group-hover:opacity-0 transition-opacity duration-300">
                      <span className="text-[9px] font-bold text-white/70">
                        {origemLabels[product.origem] || product.origem}
                      </span>
                    </div>
                  )}
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                      {product.is_published ? '🟢 Vitrine Online' : '🕒 Em Monitoramento'}
                    </span>
                  </div>
                  
                  {/* TRIO DE OURO: NOTA, AVALIAÇÕES E VENDAS */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {product.metadata?.nota && (
                      <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-lg border border-yellow-500/20 group/stat">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[10px] font-black">{product.metadata.nota}</span>
                      </div>
                    )}
                    {product.metadata?.avaliacoes && (
                      <div className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-lg border border-blue-500/20" title="Total de Avaliações">
                        <MessageSquare className="w-3 h-3" />
                        <span className="text-[10px] font-black">{product.metadata.avaliacoes}</span>
                      </div>
                    )}
                    {product.metadata?.vendas && (
                      <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20" title="Volume de Vendas">
                        <ShoppingBag className="w-3 h-3" />
                        <span className="text-[10px] font-black">{product.metadata.vendas}</span>
                      </div>
                    )}
                  </div>

                  <h3 className={`font-serif font-bold text-lg leading-tight line-clamp-2 mb-3 tracking-wide ${isExpired ? 'text-red-200' : ''}`}>{product.name}</h3>
                  
                  {/* Exibir Variações (se houver no metadata) */}
                  {product.metadata?.variacoes?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {product.metadata.variacoes.map((v: any, i: number) => (
                        <span key={i} className="bg-white/5 text-[9px] text-white/50 px-2 py-0.5 rounded border border-white/5 font-medium">
                          {v.categoria}: {v.opcoes.length}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Status de Oferta */}
                 {sConfig && statusOferta !== 'sem_dados' && (
                   <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 ${sConfig.bg} border border-white/5`}>
                     <sConfig.Icon className={`w-3.5 h-3.5 ${sConfig.text}`} />
                     <span className={`text-[11px] font-bold ${sConfig.text}`}>{sConfig.label}</span>
                     {analise?.variacao_percentual !== null && analise?.variacao_percentual !== undefined && (
                       <span className="text-[10px] text-white/40 ml-auto">
                         {analise.variacao_percentual > 0 ? '+' : ''}{analise.variacao_percentual}%
                       </span>
                     )}
                   </div>
                 )}

                 <div className={`flex-1 text-xs text-white/60 bg-black/30 rounded-lg p-3 line-clamp-4 font-sans border border-white/5 mt-auto mb-4 ${isExpired ? 'opacity-50' : ''}`}>
                   {product.generated_copy || <span className="italic text-white/30">Sem texto de venda — gere no editor</span>}
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
