// ============================================================
// MB Afiliados — Content Script (Injetado na página)
// ============================================================

(function () {
  'use strict';

  /**
   * Detecta a origem do site
   */
  function detectOrigin() {
    const host = window.location.hostname;
    if (host.includes('shopee')) return 'shopee';
    if (host.includes('shein')) return 'shein';
    if (host.includes('mercadolivre') || host.includes('mercadolibre')) return 'mercadolivre';
    if (host.includes('amazon')) return 'amazon';
    return 'outro';
  }

  /**
   * Extração Universal via JSON-LD
   */
  function extractFromJsonLD() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || '');
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'Product' || item['@type']?.includes?.('Product')) {
            const offerData = Array.isArray(item.offers) ? item.offers[0] : (item.offers || {});
            
            let imagem = '';
            if (Array.isArray(item.image)) imagem = item.image[0];
            else if (typeof item.image === 'string') imagem = item.image;
            else if (item.image?.url) imagem = item.image.url;

            if (imagem.startsWith('//')) imagem = 'https:' + imagem;

            return {
              titulo: item.name || '',
              preco: parseFloat(offerData.price || offerData.lowPrice || '0') || null,
              imagem: imagem,
              nota: item.aggregateRating?.ratingValue || null,
              vendas: item.aggregateRating?.reviewCount || null,
            };
          }
        }
      } catch (e) {}
    }
    return null;
  }

  /**
   * Extração de IDs e Dados Específicos por Site
   */
  function extractSourceSpecificData(origem) {
    const data = {
      external_id: '',
      shop_id: '',
      variacoes: [],
      nota_detalhada: '',
      nota_count: '',
      vendas_texto: ''
    };

    if (origem === 'shopee') {
      try {
        // 1. IDs da Shopee via URL (padrão i.SHOPID.ITEMID)
        const match = window.location.href.match(/-i\.(\d+)\.(\d+)/);
        if (match) {
          data.shop_id = match[1];
          data.external_id = match[2];
        }

        // 2. Variações (Cores, Tamanhos, Modelos)
        const allButtons = Array.from(document.querySelectorAll('button'));
        const labels = Array.from(document.querySelectorAll('label, div')).filter(el => 
          /(cor|tamanho|modelo|selecione)/i.test(el.innerText) && el.innerText.length < 20
        );

        labels.forEach(labelEl => {
          const container = labelEl.parentElement;
          if (container) {
            const options = Array.from(container.querySelectorAll('button'))
              .map(btn => btn.innerText.trim())
              .filter(txt => txt.length > 0 && txt.length < 30);
            
            if (options.length > 0) {
              const categoria = labelEl.innerText.replace(':', '').trim();
              if (!data.variacoes.find(v => v.categoria === categoria)) {
                data.variacoes.push({ categoria, opcoes: options });
              }
            }
          }
        });

        // 3. Notas e Vendas (Busca por Texto - Mais Robusto)
        // Procura pelo padrão "4.7 de 5" que aparece no print do usuário
        const bodyText = document.body.innerText;
        const ratingMatch = bodyText.match(/(\d[.,]\d)\s*de\s*5/);
        if (ratingMatch) {
          data.nota_detalhada = ratingMatch[1];
        }

        // 4. Quantidade de Avaliações (O "Ouro")
        // Regex corrigido: (?:mil|k|m)? para capturar a PALAVRA "mil" literalmente
        // Exemplos: "5,8mil", "80k", "1.2k", "500"
        const reviewsMatch = bodyText.match(/([\d][\d.,]*(?:mil|k|m)?)\s*Avaliaç[õo~]es?/i);
        if (reviewsMatch) {
          data.nota_count = reviewsMatch[1].trim();
        }

        // 5. Quantidade de Vendidos (Volume total)
        // Exemplos: "90mil+", "90mil+ Vendidos", "1k vendidos"
        const salesMatch = bodyText.match(/([\d][\d.,]*(?:mil|k|m)?)\+?\s*[Vv]endidos?/i);
        if (salesMatch) {
          data.vendas_texto = salesMatch[1].trim();
        }

      } catch (e) {
        console.error('Erro na extração Shopee:', e);
      }
    } else if (origem === 'shein') {
      try {
        // ID do produto na Shein: padrão "-p-XXXXXXXX-" na URL
        const sheinMatch = window.location.href.match(/-p-(\d+)/);
        if (sheinMatch) data.external_id = sheinMatch[1];

        // Shein não usa shop_id separado — usa o ID do produto globalmente
        data.shop_id = 'shein';

        const bodyText = document.body.innerText;

        // Nota da Shein: ex: "4.90" ou "4.7 de 5"
        const ratingMatch = bodyText.match(/(\d[.,]\d{1,2})\s*de\s*5/i)
          || bodyText.match(/Avaliado em\s*([\d.,]+)/i);
        if (ratingMatch) data.nota_detalhada = ratingMatch[1];

        // Volume de avaliações: Shein usa "Comentário do Clientes (500+)"
        // ATENÇÃO: o número vem DEPOIS da palavra na Shein!
        const reviewsMatch = bodyText.match(/Coment[aá]rios?(?:\s+\w+){0,3}\s*\(([\d]+\+?)\)/i)
          || bodyText.match(/\(([\d]+\+?)\)\s*Coment[aá]rios?/i)
          || bodyText.match(/([\d][\d.,]{0,5}(?:[km]|mil)?)\s*Coment[aá]rios?/i)
          || bodyText.match(/([\d][\d.,]{0,5}(?:[km]|mil)?)\s*(?:Reviews?)/i);
        if (reviewsMatch) data.nota_count = reviewsMatch[1].trim();

        // Vendidos (Shein às vezes exibe)
        const salesMatch = bodyText.match(/([\d][\d.,]*(?:[km]|mil)?)\+?\s*[Vv]endidos?/i);
        if (salesMatch) data.vendas_texto = salesMatch[1].trim();

        // Variações na Shein: Cor e Tamanho têm estrutura própria
        const labels = Array.from(document.querySelectorAll('[class*="goods-size"], [class*="color"], .product-color__item, .size-item'));
        if (labels.length > 0) {
          // Cores
          const colorEls = document.querySelectorAll('[class*="color-item"], [class*="colorItem"]');
          if (colorEls.length > 0) {
            data.variacoes.push({
              categoria: 'Cor',
              opcoes: Array.from(colorEls).map(el => el.getAttribute('aria-label') || el.title || '').filter(Boolean)
            });
          }
          // Tamanhos
          const sizeEls = document.querySelectorAll('[class*="size-item"], [class*="sizeItem"]');
          if (sizeEls.length > 0) {
            data.variacoes.push({
              categoria: 'Tamanho',
              opcoes: Array.from(sizeEls).map(el => el.innerText.trim()).filter(t => t.length > 0 && t.length < 15)
            });
          }
        }

      } catch (e) {
        console.error('Erro na extração Shein:', e);
      }

    } else if (origem === 'amazon') {
      // Amazon: ASIN no URL ou em elemento da página
      const asinMatch = window.location.href.match(/\/dp\/([A-Z0-9]{10})/i)
        || window.location.href.match(/\/gp\/product\/([A-Z0-9]{10})/i);
      if (asinMatch) data.external_id = asinMatch[1];
      data.shop_id = 'amazon';

      const bodyText = document.body.innerText;
      const reviewsMatch = bodyText.match(/([\d][\d.,]*(?:k|mil)?)\s*(?:avalia[çc][oõ]es?|ratings?|reviews?)/i);
      if (reviewsMatch) data.nota_count = reviewsMatch[1].trim();

    } else if (origem === 'mercadolivre') {
      const match = window.location.href.match(/MLB-?(\d+)/i);
      if (match) data.external_id = 'MLB' + match[1];
    }

    return data;
  }

  /**
   * Fallback via Meta Tags
   */
  function extractFromMetaTags() {
    const getMeta = (prop) => document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`)?.getAttribute('content') || '';
    return {
      titulo: getMeta('og:title') || document.title,
      imagem: getMeta('og:image'),
      preco: parseFloat(getMeta('product:price:amount')) || null
    };
  }

  /**
   * Orquestrador Principal
   */
  function extractProductData() {
    const origem = detectOrigin();
    const jsonLd = extractFromJsonLD();
    const meta = extractFromMetaTags();
    const deep = extractSourceSpecificData(origem);

    // Consolidação
    const titulo = jsonLd?.titulo || meta.titulo || document.title;
    const preco = jsonLd?.preco || meta.preco || null;
    const imagem = jsonLd?.imagem || meta.imagem || '';

    return {
      titulo: titulo.split('|')[0].split('-')[0].trim(),
      preco,
      imagem,
      link: window.location.href,
      origem,
      external_id: deep.external_id,
      shop_id: deep.shop_id,
      metadata: {
        variacoes: deep.variacoes,
        nota: deep.nota_detalhada || jsonLd?.nota,
        vendas: deep.vendas_texto || jsonLd?.vendas,
        avaliacoes: deep.nota_count || jsonLd?.vendas,
        captura_em: new Date().toISOString()
      },
      metodo_extracao: jsonLd ? 'JSON-LD + DOM' : 'DOM Scanning'
    };
  }

  // Listener para o Popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'captureProduct') {
      try {
        const data = extractProductData();
        sendResponse({ success: true, data });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    }
    return true;
  });
})();
