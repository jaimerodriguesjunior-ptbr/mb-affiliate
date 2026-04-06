import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenant_id, product_id, event_type } = body

    if (!tenant_id || !event_type) {
      return new NextResponse('Faltam parâmetros obrigatórios', { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('catalog_events')
      .insert([
        {
          tenant_id,
          product_id: product_id || null,
          event_type
        }
      ])

    if (error) {
      console.error('Erro ao gravar tracking:', error)
      return new NextResponse(error.message, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro na rota de track:', error)
    return new NextResponse('Erro interno do servidor', { status: 500 })
  }
}
