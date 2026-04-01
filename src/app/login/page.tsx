import { login } from './actions'
import { ArrowRight, Lock } from 'lucide-react'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const params = await searchParams

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden h-full">
      <div className="glass max-w-md w-full rounded-3xl p-8 sm:p-12 relative z-10 transition-all animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 bg-brand-brown/30 rounded-full flex items-center justify-center mb-4 border border-brand-gold/20 shadow-[0_0_30px_rgba(234,216,190,0.15)]">
            <Lock className="text-brand-gold w-5 h-5" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-brand-gold mb-2">
            Acesso Restrito
          </p>
          <h1 className="font-serif text-3xl leading-tight drop-shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            Painel do Afiliado
          </h1>
        </div>

        <form className="flex flex-col gap-5">
           {params?.message && (
            <p className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center rounded-xl font-medium">
              {params.message}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-bold tracking-wider uppercase text-brand-gold/70 ml-1">Email</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              placeholder="seu@email.com"
              className="glass-input rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-brand-gold/50 transition-all font-sans text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs font-bold tracking-wider uppercase text-brand-gold/70 ml-1">Senha</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              placeholder="••••••••"
              className="glass-input rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-brand-gold/50 transition-all font-sans text-sm"
            />
          </div>

          <button 
            formAction={login}
            className="group mt-4 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-brand-brown px-6 py-4 text-[12px] font-black uppercase tracking-[0.2em] text-white shadow-[0_16px_30px_rgba(140,109,69,0.30)] hover:bg-brand-brown-dark hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Entrar
            <ArrowRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
        </form>
      </div>
    </main>
  )
}
