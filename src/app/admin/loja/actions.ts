'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateTenantSettings(tenantId: string, payload: { slug: string, name: string, logoUrl: string | null, whatsapp: string }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada. Faça login novamente.' }
    
    // Tratamento radical do slug
    const safeSlug = payload.slug
      .trim()
      .toLowerCase()
      .normalize('NFD') // separa acentos das letras
      .replace(/[\u0300-\u036f]/g, '') // remove os acentos
      .replace(/[^a-z0-9-]/g, '-') // troca qualquer lixo por hífen
      .replace(/-+/g, '-') // previne múltiplos hífens
      .replace(/^-|-$/g, '') // previne hífen nas pontas

    if (!safeSlug) return { success: false, error: 'O link não pode ser totalmente vazio ou apenas símbolos.' }

    const { error } = await supabase
      .from('tenants')
      .update({ 
        slug: safeSlug,
        name: payload.name.trim() || 'Minha Nova Vitrine',
        logo_url: payload.logoUrl,
        whatsapp: payload.whatsapp || null
      })
      .eq('id', tenantId)
      
    if (error) {
       if (error.code === '23505') return { success: false, error: '❌ Este nome de link já está sendo usado por outra loja registrada! Escolha outro.' }
       return { success: false, error: error.message }
    }
    
    revalidatePath('/admin/loja')
    return { success: true, slug: safeSlug }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
