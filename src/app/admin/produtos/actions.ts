'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/utils/supabase/server'

// The keys from our environment - rotated to avoid limits
const GEMINI_KEYS = [
  process.env.GEMINI_SECRET_KEY_1,
  process.env.GEMINI_SECRET_KEY_2,
  process.env.GEMINI_SECRET_KEY_3,
  process.env.GEMINI_SECRET_KEY_4,
  process.env.GEMINI_SECRET_KEY_5,
].filter(Boolean) as string[]

async function fetchWithRetry(url: string, retries = 2): Promise<{ html: string, finalUrl: string }> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 segundos max
      const resp = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        redirect: 'follow',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (resp.ok) return { html: await resp.text(), finalUrl: resp.url }
    } catch (e) {
      // Timeout ou erro de rede — tudo bem, seguimos com fallback
      if (i === retries - 1) console.warn('Scraper: todas tentativas falharam, seguindo com URL pura.')
    }
  }
  return { html: '', finalUrl: url }
}

export async function scrapeAndGenerateCopy(url: string, pageContent: string = '') {
  try {
    // 1. Scrape the URL (seguindo redirecionamentos)
    const { html: htmlText, finalUrl } = await fetchWithRetry(url)
    
    // Simple regex parsing for basic meta tags
    const titleMatch = htmlText?.match(/<title[^>]*>([^<]+)<\/title>/i)
    const ogTitleMatch = htmlText?.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"[^>]*>/i) || htmlText?.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:title"[^>]*>/i)
    const ogImageMatch = htmlText?.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"[^>]*>/i) || htmlText?.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"[^>]*>/i)
    const metaDescMatch = htmlText?.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"[^>]*>/i)

    // Fallback inteligente: Extrair o nome do produto da URL FINAL (após redirecionamentos)
    // A Shopee redireciona s.shopee.com.br/xxx para shopee.com.br/Nome-Do-Produto-i.shopId.itemId
    let urlProductName = ''
    try {
      const urlObj = new URL(finalUrl)
      const pathParts = urlObj.pathname.split('/').filter(Boolean)
      // Shopee pattern: /Nome-Do-Produto-i.shopId.itemId
      const shopeeSlug = pathParts.find(p => p.match(/-i\.\d+\.\d+$/))
      if (shopeeSlug) {
        urlProductName = shopeeSlug.replace(/-i\.\d+\.\d+$/, '').replace(/-/g, ' ')
      } else {
        // Tenta achar o segmento mais longo e descritivo na URL
        const candidates = pathParts.filter(p => p.length > 8 && !p.match(/^\d+$/))
        if (candidates.length > 0) {
          urlProductName = candidates[candidates.length - 1].replace(/[-_]/g, ' ')
        }
      }
    } catch {}

    const scrapedTitle = ogTitleMatch?.[1] || titleMatch?.[1] || ''
    // Se o título scrapeado é genérico/vazio, usar o extraído da URL
    const title = (scrapedTitle && scrapedTitle.length > 10 && !scrapedTitle.toLowerCase().includes('shopee'))
      ? scrapedTitle
      : (urlProductName || scrapedTitle || 'Produto')
    const imageUrl = ogImageMatch?.[1] || null
    const description = metaDescMatch?.[1] || ''

    // Criar o identificador curto (para a vitrine pública)
    const shortId = crypto.randomUUID().split('-')[0]

    // 2. Generate Copy with Gemini (with failover)
    // IMPORTANTE: No texto do WhatsApp, usamos o LINK ORIGINAL (raw_link) 
    // porque o WhatsApp puxa a preview (imagem + título) do link original.
    // O link encurtado (/r/xxx) é usado apenas na vitrine pública.
    let generatedCopy = ''

    const hasProductInfo = title && title !== 'Produto'
    
    let prompt = ''
    
    if (pageContent) {
      // Modo C: O usuário colou o texto da página! \o/
      prompt = `
      Você é um especialista em vendas pelo WhatsApp no Brasil.
      Vou te passar todo o texto (sujo) copiado da página de um produto.
      Sua tarefa é descobrir qual é o produto, qual o preço (se houver) e criar um texto para vendê-lo.
      
      TEXTO DA PÁGINA:
      """
      ${pageContent.substring(0, 5000)} /* Limita para não estourar tokens caso o usuário cole a bíblia */
      """
      
      REGRAS OBRIGATÓRIAS DA COPY:
      1. Descubra e CITE O NOME REAL DO PRODUTO no texto.
      2. Destaque UM benefício incrível baseado no que você leu.
      3. Seja CURTO e DIRETO: máximo 5-6 linhas. Ninguém lê textão no WhatsApp.
      4. INCLUA OBRIGATORIAMENTE este link EXATO no final: ${url}
      5. NÃO use markdown (sem ** ou \`\`\`). Apenas texto puro com emojis.
      6. Seja natural, enérgico e persuasivo!

      MUITO IMPORTANTE: A sua resposta DEVE SER EXCLUSIVAMENTE um objeto JSON válido, com nenhuma outra palavra antes ou depois. Use o seguinte formato:
      {
        "title": "Nome real e limpo do produto",
        "price": 99.90, // O preço em formato numérico (ou null se não encontrar)
        "copy": "Sua_copy_de_vendas_aqui"
      }
      `
    } else if (hasProductInfo) {
      // Modo A: Conseguimos o título pelo código
      prompt = `
      Você é um especialista em vendas pelo WhatsApp no Brasil.
      Crie um texto CURTO e DIRETO (máximo 6 linhas), persuasivo, com emojis, para vender este produto específico:
      
      Produto: ${title}
      ${description ? `Detalhes: ${description}` : ''}
      
      REGRAS OBRIGATÓRIAS DA COPY:
      1. CITE O NOME REAL DO PRODUTO no texto (não invente nomes genéricos).
      2. Destaque UM benefício claro e real deste produto específico.
      3. Seja CURTO: máximo 5-6 linhas. Ninguém lê textão no WhatsApp.
      4. INCLUA OBRIGATORIAMENTE este link EXATO no final: ${url}
      5. NÃO use markdown (sem ** ou \`\`\`). Apenas texto puro com emojis.
      6. Seja natural, como se fosse uma pessoa real indicando algo incrível.

      MUITO IMPORTANTE: A sua resposta DEVE SER EXCLUSIVAMENTE um objeto JSON válido, com nenhuma outra palavra antes ou depois. Use o seguinte formato:
      {
        "title": "${title}",
        "price": null, 
        "copy": "Sua_copy_de_vendas_aqui"
      }
    `
    } else {
      // Modo B: Não conseguimos nada (Fallback cego)
      prompt = `
      Você é um especialista em vendas pelo WhatsApp no Brasil.
      Eu tenho este link de produto para vender: ${url}
      
      Acesse mentalmente o link acima. Se for da Shopee, tente deduzir pelo formato da URL o que pode ser o produto.
      Crie um texto CURTO e DIRETO (máximo 6 linhas), persuasivo, com emojis.
      
      REGRAS OBRIGATÓRIAS DA COPY:
      1. Se você conseguir imaginar o que é o produto pelo link, CITE O NOME no texto.
      2. Se não souber o produto, crie um texto de curiosidade (ex: "Achei essa promoção insana...").
      3. Seja CURTO: máximo 5-6 linhas.
      4. INCLUA OBRIGATORIAMENTE este link EXATO no final: ${url}
      5. NÃO use markdown (sem ** ou \`\`\`). Apenas texto puro com emojis.
      6. Seja natural, como se fosse uma pessoa real indicando algo incrível.

      MUITO IMPORTANTE: A sua resposta DEVE SER EXCLUSIVAMENTE um objeto JSON válido, com nenhuma outra palavra antes ou depois. Use o seguinte formato:
      {
        "title": "Nome sugerido ou apenas Produto Surpresa",
        "price": null,
        "copy": "Sua_copy_de_vendas_aqui"
      }
    `
    }

    let parsedResult = { title: title || 'Produto', price: null as number | null, copy: '' }

    for (const key of GEMINI_KEYS) {
      try {
        const genAI = new GoogleGenerativeAI(key)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
        const result = await model.generateContent(prompt)
        
        // Extrair apenas o JSON ignorando qualquer texto em markdown ```json ... ``` gerado pelo LLM
        let rawText = result.response.text()
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
        
        parsedResult = JSON.parse(rawText)
        break // success, leave loop
      } catch (err) {
        console.warn('Gemini key failed or JSON parse error, switching to next...')
        continue
      }
    }

    if (!parsedResult.copy) {
      throw new Error('Todas as chaves da IA falharam (limite ou erro).')
    }

    // Se a IA encontrou um nome melhor (especialmente no Modo C), usamos o dela. Mas priorizamos o scrap se ela viajar.
    const finalTitle = (pageContent && parsedResult.title) ? parsedResult.title : (title || parsedResult.title || 'Produto')

    return {
      success: true,
      data: {
        title: finalTitle.replace(/&amp;/g, '&').replace(/"/g, ''),
        imageUrl,
        description: description.replace(/&amp;/g, '&'),
        copy: parsedResult.copy,
        shortId,
        price: parsedResult.price
      }
    }

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao processar o link.',
    }
  }
}

export async function saveProduct(data: {
  title: string
  description: string
  imageUrl: string | null
  copy: string
  rawLink: string
  shortId: string
  price: number | null
  category: string | null
}) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada. Faça login novamente.' }

    // Verifica se já existe um tenant para este usuário
    let { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    // Como o usuário foi criado manualmente no painel, ele ainda não tem um tenant.
    // Vamos criar um automaticamente para ele.
    if (!tenant) {
      const slug = user.email ? user.email.split('@')[0] : crypto.randomUUID().split('-')[0]
      const { data: newTenant, error: tErr } = await supabase
        .from('tenants')
        .insert({
          owner_id: user.id,
          name: 'Minha Loja Afiliado',
          slug: slug,
        })
        .select()
        .single()
        
      if (tErr) return { success: false, error: 'Erro ao configurar sua loja pela primeira vez.' }
      tenant = newTenant
    }

    const { error } = await supabase
      .from('products')
      .insert({
        tenant_id: tenant!.id,
        name: data.title,
        raw_link: data.rawLink,
        short_link: data.shortId,
        image_url: data.imageUrl,
        generated_copy: data.copy,
        price: data.price,
        category: data.category,
      })

    if (error) return { success: false, error: error.message }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updateProduct(id: string, updates: { name: string, image_url: string, generated_copy: string, raw_link: string, price: number | null, category: string | null }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada. Faça login novamente.' }

    const { error } = await supabase
      .from('products')
      .update({
        ...updates,
        last_validated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch(e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteProduct(id: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada.' }

    // Segurança: Confirma que o produto pertence ao tenant do usuário logado
    const { data: product } = await supabase
      .from('products')
      .select('tenant_id')
      .eq('id', id)
      .single()

    if (!product) return { success: false, error: 'Produto não encontrado.' }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_id', user.id)
      .eq('id', product.tenant_id)
      .single()

    if (!tenant) return { success: false, error: 'Você não tem permissão para excluir este produto.' }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function togglePublish(id: string, newState: boolean) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sessão expirada.' }

    const { error } = await supabase
      .from('products')
      .update({ is_published: newState })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
