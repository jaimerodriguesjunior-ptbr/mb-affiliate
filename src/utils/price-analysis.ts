import { createClient } from '@supabase/supabase-js'

// Admin client para consultas server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type StatusOferta = 'excelente' | 'boa' | 'normal' | 'sem_dados'

export interface AnalisePreco {
  product_id: string
  preco_atual: number | null
  menor_preco: number | null
  maior_preco: number | null
  media_preco: number | null
  variacao_percentual: number | null
  status_oferta: StatusOferta
  total_registros: number
}

/**
 * Analisa o histórico de preços de um produto.
 * 
 * Retorna:
 * - preco_atual: último preço registrado
 * - menor_preco: menor preço já registrado
 * - variacao_percentual: diferença percentual do preço atual vs menor
 * - status_oferta: classificação automática
 */
export async function analisarPreco(productId: string): Promise<AnalisePreco> {
  // Buscar todo o histórico de preços, ordenado por data
  const { data: historico, error } = await supabaseAdmin
    .from('historico_precos')
    .select('preco, data_coleta')
    .eq('product_id', productId)
    .order('data_coleta', { ascending: false })

  if (error || !historico || historico.length === 0) {
    return {
      product_id: productId,
      preco_atual: null,
      menor_preco: null,
      maior_preco: null,
      media_preco: null,
      variacao_percentual: null,
      status_oferta: 'sem_dados',
      total_registros: 0,
    }
  }

  const precos = historico.map((h) => Number(h.preco))
  const precoAtual = precos[0] // Mais recente (desc order)
  const menorPreco = Math.min(...precos)
  const maiorPreco = Math.max(...precos)
  const mediaPreco = precos.reduce((a, b) => a + b, 0) / precos.length

  // Variação: quanto o preço atual está acima do menor preço
  // 0% = é o menor preço (excelente!)
  // 10% = está 10% acima do menor (boa)
  // >10% = normal
  let variacao = 0
  if (menorPreco > 0) {
    variacao = ((precoAtual - menorPreco) / menorPreco) * 100
  }

  // Classificação automática
  let statusOferta: StatusOferta = 'normal'
  if (historico.length < 2) {
    // Com apenas 1 registro, não temos como comparar
    statusOferta = 'sem_dados'
  } else if (variacao <= 0) {
    statusOferta = 'excelente' // Menor preço histórico!
  } else if (variacao <= 10) {
    statusOferta = 'boa' // Até 10% acima do menor
  } else {
    statusOferta = 'normal' // Mais de 10% acima
  }

  return {
    product_id: productId,
    preco_atual: Math.round(precoAtual * 100) / 100,
    menor_preco: Math.round(menorPreco * 100) / 100,
    maior_preco: Math.round(maiorPreco * 100) / 100,
    media_preco: Math.round(mediaPreco * 100) / 100,
    variacao_percentual: Math.round(variacao * 10) / 10,
    status_oferta: statusOferta,
    total_registros: historico.length,
  }
}

/**
 * Analisa preços de todos os produtos de um tenant.
 * Útil para o dashboard do admin.
 */
export async function analisarPrecosTenant(tenantId: string): Promise<Map<string, AnalisePreco>> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('tenant_id', tenantId)

  if (!products) return new Map()

  const results = new Map<string, AnalisePreco>()
  
  // Buscar todo o histórico de uma vez (mais eficiente)
  const productIds = products.map((p) => p.id)
  
  const { data: allHistorico } = await supabaseAdmin
    .from('historico_precos')
    .select('product_id, preco, data_coleta')
    .in('product_id', productIds)
    .order('data_coleta', { ascending: false })

  if (!allHistorico) return results

  // Agrupar por produto
  const grouped = new Map<string, { preco: number; data_coleta: string }[]>()
  for (const h of allHistorico) {
    if (!grouped.has(h.product_id)) {
      grouped.set(h.product_id, [])
    }
    grouped.get(h.product_id)!.push(h)
  }

  // Calcular análise para cada produto
  for (const productId of productIds) {
    const historico = grouped.get(productId) || []
    
    if (historico.length === 0) {
      results.set(productId, {
        product_id: productId,
        preco_atual: null,
        menor_preco: null,
        maior_preco: null,
        media_preco: null,
        variacao_percentual: null,
        status_oferta: 'sem_dados',
        total_registros: 0,
      })
      continue
    }

    const precos = historico.map((h) => Number(h.preco))
    const precoAtual = precos[0]
    const menorPreco = Math.min(...precos)
    const maiorPreco = Math.max(...precos)
    const mediaPreco = precos.reduce((a, b) => a + b, 0) / precos.length

    let variacao = 0
    if (menorPreco > 0) {
      variacao = ((precoAtual - menorPreco) / menorPreco) * 100
    }

    let statusOferta: StatusOferta = 'normal'
    if (historico.length < 2) {
      statusOferta = 'sem_dados'
    } else if (variacao <= 0) {
      statusOferta = 'excelente'
    } else if (variacao <= 10) {
      statusOferta = 'boa'
    } else {
      statusOferta = 'normal'
    }

    results.set(productId, {
      product_id: productId,
      preco_atual: Math.round(precoAtual * 100) / 100,
      menor_preco: Math.round(menorPreco * 100) / 100,
      maior_preco: Math.round(maiorPreco * 100) / 100,
      media_preco: Math.round(mediaPreco * 100) / 100,
      variacao_percentual: Math.round(variacao * 10) / 10,
      status_oferta: statusOferta,
      total_registros: historico.length,
    })
  }

  return results
}
