import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Star, Sparkles, MessageCircle } from 'lucide-react'

// Metadata dinâmico do site (Para SEO e compartilhamento do link)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: tenant } = await supabase.from('tenants').select('name').eq('slug', slug).single()
  return {
    title: tenant ? `${tenant.name} | Catálogo Exclusivo` : 'Catálogo Não Encontrado',
    description: 'Aproveite as ofertas selecionadas a dedo para você antes que esgotem!',
  }
}

export default async function PublicCatalog({ 
  params,
  searchParams
}: { 
  params: Promise<{ slug: string }>
  searchParams: Promise<{ c?: string }>
}) {
  const { slug } = await params
  const { c: selectedCategory = 'Todos' } = await searchParams
  const supabase = await createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, logo_url, whatsapp')
    .eq('slug', slug)
    .single()

  if (!tenant) notFound()

  // Buscar apenas os produtos da loja dele
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  const now = new Date().getTime()
  // Filtro Matador: O Culto à conversão. Esconde tudo o que não foi atualizado nos últimos 7 dias.
  const activeProducts = (products || []).filter(p => {
    const vDate = new Date(p.last_validated_at || p.created_at).getTime()
    const diffDays = Math.floor((now - vDate) / (1000 * 60 * 60 * 24))
    return diffDays < 7
  })

  // Filtro de Categoria
  const displayProducts = selectedCategory === 'Todos' 
    ? activeProducts 
    : activeProducts.filter(p => p.category === selectedCategory)

  const AVAILABLE_CATEGORIES = ['Todos', 'Diversos', 'Eletrônicos', 'Casa & Cozinha', 'Beleza & Saúde', 'Moda', 'Ferramentas', 'Brinquedos', 'Informática']

  return (
    <div className="min-h-screen bg-[#110e0c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-gold/10 via-[#110e0c] to-[#110e0c] text-white selection:bg-brand-gold/30">
      
      {/* HEADER LUXO */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 bg-[#110e0c]/80 flex justify-center py-5 shadow-2xl backdrop-blur-xl">
         <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
           {tenant.logo_url ? (
             <img src={tenant.logo_url} alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-brand-gold/50 shadow-[0_0_15px_rgba(235,191,123,0.3)]" />
           ) : (
             <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-brand-gold animate-pulse" />
           )}
           <h1 className="text-xl sm:text-2xl font-serif font-bold bg-gradient-to-r from-brand-gold to-[#fcd99e] text-transparent bg-clip-text drop-shadow-[0_0_20px_rgba(235,191,123,0.3)]">
             {tenant.name}
           </h1>
         </div>
      </header>

      {/* HERO SECTION COM DESTAQUE */}
      <div className="pt-32 sm:pt-40 pb-12 sm:pb-16 px-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-700">
         <div className="absolute top-0 w-full h-[300px] bg-brand-gold/10 blur-[150px] pointer-events-none" />
         
         {tenant.logo_url && (
            <div className="w-24 h-24 sm:w-28 sm:h-28 mb-6 rounded-full border border-brand-gold/30 bg-black/40 shadow-[0_0_40px_rgba(235,191,123,0.2)] overflow-hidden relative z-10 p-1">
               <img src={tenant.logo_url} alt="Avatar Oficial" className="w-full h-full object-cover rounded-full" />
            </div>
         )}

         <h2 className="text-4xl sm:text-5xl md:text-6xl font-serif font-black tracking-tight text-white max-w-3xl leading-[1.1] relative z-10">
           {tenant.name} <br /> <span className="text-brand-gold/80 italic font-light drop-shadow-lg text-3xl sm:text-4xl">Ofertas Selecionadas</span>
         </h2>
         <p className="mt-6 text-white/50 text-base md:text-lg max-w-xl font-medium relative z-10">
           Navegue por nossa curadoria especial. Garanta os melhores preços ativos apenas enquanto durarem os nossos estoques monitorados!
         </p>
      </div>

      {/* CATEGORY BAR */}
      <div className="w-full max-w-7xl mx-auto px-6 mb-12 flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide relative z-10">
        {AVAILABLE_CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat
          const url = cat === 'Todos' ? `/c/${slug}` : `/c/${slug}?c=${encodeURIComponent(cat)}`
          return (
            <Link 
              key={cat} 
              href={url}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all ${isActive ? 'bg-brand-gold text-brand-bg shadow-[0_4px_20px_rgba(235,191,123,0.4)]' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white'}`}
            >
              {cat}
            </Link>
          )
        })}
      </div>

      {/* PRODUCT GRID */}
      <main className="max-w-7xl mx-auto px-6 pb-24 relative z-10">
        {displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 sm:p-20 glass rounded-[2.5rem] border border-white/5 opacity-80 backdrop-blur-md">
             <ShoppingCart className="w-16 h-16 sm:w-20 sm:h-20 text-white/20 mb-6 drop-shadow-xl" />
             <h3 className="text-2xl sm:text-3xl font-serif text-white/80 text-center">Nenhuma oferta ativa no momento.</h3>
             <p className="text-sm mt-3 text-white/40 text-center uppercase tracking-widest font-black">As promoções expiram rápido. Volte em breve!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
            {displayProducts.map((product, idx) => (
              <div 
                key={product.id} 
                className="group glass rounded-[2rem] flex flex-col border border-white/10 hover:border-brand-gold/40 bg-white/5 hover:bg-white/10 transition-all duration-500 overflow-hidden shadow-2xl hover:shadow-[0_0_40px_-10px_rgba(235,191,123,0.4)] animate-in fade-in slide-in-from-bottom-8 relative focus-within:ring-4 focus-within:ring-brand-gold/50"
                style={{ animationDelay: `${Math.min(idx * 100, 1000)}ms` , animationFillMode: 'both' }}
              >
                {/* Image Box */}
                <div className="h-64 sm:h-72 relative bg-[#1A1614] overflow-hidden flex-shrink-0">
                   {product.image_url ? (
                     <img src={product.image_url} alt={`Comprar ${product.name}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[800ms] ease-out" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-white/10">
                       <ShoppingCart className="w-16 h-16" />
                     </div>
                   )}
                   {/* Degrade obscuro pântano em baixo pra ler texto */}
                   <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#110e0c]/90 to-transparent z-10" />
                   
                   {/* Tarja super Premium */}
                   <div className="absolute top-4 left-4 sm:top-5 sm:left-5 bg-black/60 backdrop-blur-md border border-brand-gold/30 text-brand-gold text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-2xl z-20 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                      OFERTA ATIVA
                   </div>
                </div>

                {/* Content Box */}
                <div className="p-6 sm:p-7 flex flex-col flex-1 relative z-20 -mt-8">
                  <div className="flex justify-between items-start mb-3">
                     <span className="bg-[#1A1614] text-brand-gold border border-brand-gold/30 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-2xl">
                        {product.category || 'Diversos'}
                     </span>
                  </div>
                  
                  <h3 className="font-serif font-bold text-lg sm:text-xl leading-tight line-clamp-2 mb-2 tracking-wide text-white/90 group-hover:text-white transition-colors">
                    {product.name}
                  </h3>

                  {product.price && (
                    <div className="mb-6 flex items-end gap-2">
                       <span className="text-[10px] uppercase font-black tracking-[0.2em] text-white/40 pb-1.5">Por </span>
                       <span className="text-3xl font-serif font-black text-brand-gold drop-shadow-lg leading-none">
                          <span className="text-base mr-1 opacity-80">R$</span>{Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </span>
                    </div>
                  )}
                  
                  <div className="mt-auto">
                    <Link 
                      href={`/r/${product.short_link}`}
                      target="_blank"
                      className="w-full relative overflow-hidden group/btn inline-flex items-center justify-center gap-3 rounded-[1.25rem] bg-white text-brand-bg px-6 py-4 font-black uppercase tracking-[0.2em] text-[11px] sm:text-xs hover:bg-brand-gold transition-all duration-300 shadow-xl group-hover:shadow-[0_10px_30px_rgba(235,191,123,0.4)]"
                    >
                      <span className="relative z-10 transition-colors group-hover/btn:text-white">Explorar Oferta</span>
                      <ShoppingCart className="w-4 h-4 relative z-10 transition-colors group-hover/btn:text-white" />
                      <div className="absolute inset-0 bg-brand-gold opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {/* WhatsApp Flutuante */}
      {tenant.whatsapp && (
        <a
          href={`https://api.whatsapp.com/send?phone=${tenant.whatsapp}&text=${encodeURIComponent('Olá! Vim do seu catálogo de ofertas e gostaria de tirar uma dúvida.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#1fb855] text-white p-4 rounded-full shadow-[0_8px_30px_rgba(37,211,102,0.4)] hover:shadow-[0_8px_30px_rgba(37,211,102,0.6)] transition-all hover:scale-110 animate-in zoom-in-50 duration-500 group"
          title="Falar com o vendedor pelo WhatsApp"
        >
          <MessageCircle className="w-7 h-7 fill-current group-hover:scale-110 transition-transform" />
        </a>
      )}

      {/* Rodapé Clean */}
      <footer className="py-8 text-center text-white/20 text-xs font-black uppercase tracking-widest border-t border-white/5 relative z-10">
        Gerado por MB Affiliate
      </footer>
    </div>
  )
}
