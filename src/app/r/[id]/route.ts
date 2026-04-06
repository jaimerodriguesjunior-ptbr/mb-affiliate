import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Busca o link original baseado no código curto e pega o tenant_id pra métrica
  const { data: product } = await supabase
    .from('products')
    .select('id, raw_link, tenant_id')
    .eq('short_link', id)
    .single()

  if (!product || !product.raw_link) {
    return new NextResponse('Link encurtado não encontrado ou desativado.', { status: 404 })
  }

  // Rastreamento invisível (fire and forget sem atrasar o cliente)
  if (product.tenant_id) {
    supabase.from('catalog_events').insert([{
      tenant_id: product.tenant_id,
      product_id: product.id,
      event_type: 'product_click'
    }]).then() // Deixa rolar em background
  }

  // Redirecionamento permanente para preservar cookies de afiliação e SEO
  return NextResponse.redirect(product.raw_link, { status: 301 })
}

