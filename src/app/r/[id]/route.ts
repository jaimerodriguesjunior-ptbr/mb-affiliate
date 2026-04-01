import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // Busca o link original baseado no código curto
  const { data: product } = await supabase
    .from('products')
    .select('raw_link')
    .eq('short_link', id)
    .single()

  if (!product || !product.raw_link) {
    return new NextResponse('Link encurtado não encontrado ou desativado.', { status: 404 })
  }

  // Redirecionamento permanente para preservar cookies de afiliação e SEO
  return NextResponse.redirect(product.raw_link, { status: 301 })
}
