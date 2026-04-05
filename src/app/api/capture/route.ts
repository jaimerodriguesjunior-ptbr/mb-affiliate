import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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
 * Body: { titulo, preco, imagem, link, origem }
 * Headers: X-API-Key
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
    const { titulo, preco, imagem, link, origem, external_id, shop_id, metadata } = body

    if (!titulo || !link) {
      return NextResponse.json(
        { success: false, error: 'Título e link são obrigatórios.' },
        { status: 400 }
      )
    }

    // 3. Check if product already exists (Robust deduplication)
    let existingProductId = null
    
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
       
       if (existingById) existingProductId = existingById.id
    }

    // Fallback strategy: Raw link (for other sites or if IDs missing)
    if (!existingProductId) {
      const { data: existingByLink } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('raw_link', link)
        .single()
      
      if (existingByLink) existingProductId = existingByLink.id
    }

    if (existingProductId) {
      // PRODUCT EXISTS — Update current price, history and metadata
      const updateData: any = { 
        last_validated_at: new Date().toISOString(),
        metadata: metadata || {} 
      }
      if (preco) updateData.price = preco

      await supabaseAdmin
        .from('products')
        .update(updateData)
        .eq('id', existingProductId)

      if (preco) {
        await supabaseAdmin.from('historico_precos').insert({
          product_id: existingProductId,
          preco,
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Produto sincronizado. Dados e histórico atualizados.',
        product_id: existingProductId,
        is_new: false,
      })
    }

    // 4. Create new product
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
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar produto: ' + insertError.message },
        { status: 500 }
      )
    }

    // 5. Insert first price history entry
    if (preco && newProduct) {
      await supabaseAdmin.from('historico_precos').insert({
        product_id: newProduct.id,
        preco,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Produto capturado com sucesso!',
      product_id: newProduct?.id,
      is_new: true,
    })
  } catch (error: any) {
    console.error('Capture API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno: ' + (error.message || 'desconhecido') },
      { status: 500 }
    )
  }
}
