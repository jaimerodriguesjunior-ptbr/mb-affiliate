import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { scrapeAndGenerateCopy } from '@/app/admin/produtos/actions'

// Use service role to bypass RLS — we validate via API key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/capture
 * 
 * Recebe dados de um produto capturado pela extensão Chrome.
 * Autenticação via header X-API-Key (vinculado ao tenant).
 * 
 * Body: { titulo, preco, imagem, link, origem, generate_ai }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate API Key
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API Key não fornecida.' },
        { status: 401 }
      )
    }

    // Find tenant by API key
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('api_key', apiKey)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { success: false, error: 'API Key inválida.' },
        { status: 401 }
      )
    }

    // 2. Parse and validate body
    const body = await request.json()
    const { titulo, preco, imagem, link, origem, external_id, shop_id, metadata, generate_ai } = body

    if (!titulo || !link) {
      return NextResponse.json(
        { success: false, error: 'Título e link são obrigatórios.' },
        { status: 400 }
      )
    }

    // 3. Check if product already exists (Robust deduplication)
    let productId = null
    let isNew = false
    
    // Primary strategy: Unique IDs (Item ID + Shop ID)
    if (external_id && shop_id) {
       const { data: existingById } = await supabaseAdmin
         .from('products')
         .select('id')
         .eq('tenant_id', tenant.id)
         .eq('origem', origem)
         .eq('external_id', external_id)
         .eq('shop_id', shop_id)
         .single()
       
       if (existingById) productId = existingById.id
    }

    // Fallback strategy: Raw link (for other sites or if IDs missing)
    if (!productId) {
      const { data: existingByLink } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('raw_link', link)
        .single()
      
      if (existingByLink) productId = existingByLink.id
    }

    if (productId) {
      // PRODUCT EXISTS — Update current price, history and metadata
      const updateData: any = { 
        last_validated_at: new Date().toISOString(),
        metadata: metadata || {} 
      }
      if (preco) updateData.price = preco

      await supabaseAdmin
        .from('products')
        .update(updateData)
        .eq('id', productId)

      if (preco) {
        await supabaseAdmin.from('historico_precos').insert({
          product_id: productId,
          preco,
        })
      }
    } else {
      // 4. Create new product
      isNew = true
      const shortId = crypto.randomUUID().split('-')[0]

      const { data: newProduct, error: insertError } = await supabaseAdmin
        .from('products')
        .insert({
          tenant_id: tenant.id,
          name: titulo,
          raw_link: link,
          short_link: shortId,
          image_url: imagem || null,
          price: preco || null,
          origem: origem || 'outro',
          is_published: false,
          metadata: metadata || {},
          external_id: external_id || null,
          shop_id: shop_id || null,
          generated_copy: null, 
        })
        .select('id')
        .single()

      if (insertError) {
        throw new Error('Erro ao salvar produto: ' + insertError.message)
      }
      productId = newProduct.id

      // 5. Insert first price history entry
      if (preco) {
        await supabaseAdmin.from('historico_precos').insert({
          product_id: productId,
          preco,
        })
      }
    }

    // --- 6. OPTIONAL: AI COPY GENERATION ---
    if (generate_ai && productId) {
      try {
        const aiResult = await scrapeAndGenerateCopy(link)
        if (aiResult.success && aiResult.data?.copy) {
          await supabaseAdmin
            .from('products')
            .update({ generated_copy: aiResult.data.copy })
            .eq('id', productId)
        }
      } catch (aiErr) {
        console.error('AI Generation failed in capture API:', aiErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: generate_ai ? 'Produto salvo e Copy gerada!' : 'Produto capturado com sucesso!',
      product_id: productId,
      is_new: isNew,
    })

  } catch (error: any) {
    console.error('Capture API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno: ' + (error.message || 'desconhecido') },
      { status: 500 }
    )
  }
}
