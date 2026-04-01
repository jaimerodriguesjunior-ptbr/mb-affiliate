import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import StoreSettingsForm from './StoreSettingsForm'

export default async function LojaSettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!tenant) {
    redirect('/login')
  }

  return (
    <div className="flex-1 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-auto h-full">
      <div className="max-w-3xl mx-auto glass rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/5 relative overflow-hidden">
        {/* Decorative flair */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-gold/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />
        
        <header className="flex items-center gap-5 border-b border-white/10 pb-6 mb-8 relative z-10">
          <Link href="/admin" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5">
            <ArrowLeft className="w-5 h-5 text-brand-gold" />
          </Link>
          <div>
            <h1 className="text-3xl font-serif">Configurações da Vitrine</h1>
            <p className="text-brand-gold/70 text-sm mt-1 font-medium">Defina como seus clientes conhecerão sua loja.</p>
          </div>
        </header>

        <StoreSettingsForm tenant={tenant} />
      </div>
    </div>
  )
}
