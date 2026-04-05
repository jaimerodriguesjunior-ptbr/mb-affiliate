import { NextRequest, NextResponse } from 'next/server'
import { analisarPreco } from '@/utils/price-analysis'

/**
 * GET /api/analyze?product_id=xxx
 * 
 * Retorna análise de preço de um produto específico.
 */
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('product_id')

  if (!productId) {
    return NextResponse.json(
      { success: false, error: 'product_id é obrigatório.' },
      { status: 400 }
    )
  }

  try {
    const analise = await analisarPreco(productId)

    return NextResponse.json({
      success: true,
      data: analise,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao analisar preço.' },
      { status: 500 }
    )
  }
}
