// ============================================================
// MB Afiliados — Popup Script
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const backendUrlInput = document.getElementById('backendUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const captureBtn = document.getElementById('captureBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusMsg = document.getElementById('statusMsg');
  const preview = document.getElementById('preview');
  const previewImage = document.getElementById('previewImage');
  const previewTitle = document.getElementById('previewTitle');
  const previewPrice = document.getElementById('previewPrice');
  const previewOrigin = document.getElementById('previewOrigin');
  const saveActions = document.getElementById('saveActions');
  const saveWithAiBtn = document.getElementById('saveWithAiBtn');
  const pageWarning = document.getElementById('pageWarning');
  const openDashboard = document.getElementById('openDashboard');

  let capturedProduct = null;

  // --- Load saved settings ---
  chrome.storage.local.get(['backendUrl', 'apiKey'], (result) => {
    if (result.backendUrl) backendUrlInput.value = result.backendUrl;
    if (result.apiKey) apiKeyInput.value = result.apiKey;
  });

  // --- Save settings on change ---
  backendUrlInput.addEventListener('change', () => {
    chrome.storage.local.set({ backendUrl: backendUrlInput.value.trim() });
  });
  apiKeyInput.addEventListener('change', () => {
    chrome.storage.local.set({ apiKey: apiKeyInput.value.trim() });
  });

  // --- Open Dashboard link ---
  openDashboard.addEventListener('click', (e) => {
    e.preventDefault();
    const url = backendUrlInput.value.trim();
    if (url) {
      chrome.tabs.create({ url: url + '/admin' });
    }
  });

  // --- Show status ---
  function showStatus(message, type = 'info') {
    statusMsg.textContent = message;
    statusMsg.className = 'status ' + type;
  }

  function hideStatus() {
    statusMsg.className = 'status';
  }

  // --- Format price ---
  function formatPrice(price) {
    if (!price) return 'Preço não encontrado';
    return 'R$ ' + price.toFixed(2).replace('.', ',');
  }

  // --- Origin labels ---
  function originLabel(origin) {
    const labels = {
      shopee: '🛒 Shopee',
      mercadolivre: '🤝 Mercado Livre',
      amazon: '📦 Amazon',
      magalu: '💜 Magalu',
      outro: '🌐 Outro',
    };
    return labels[origin] || origin;
  }

  // --- Capture product ---
  captureBtn.addEventListener('click', async () => {
    hideStatus();
    preview.classList.remove('visible');
    saveActions.classList.remove('visible');
    pageWarning.style.display = 'none';

    // Disable button and show spinner
    captureBtn.disabled = true;
    captureBtn.innerHTML = '<div class="spinner"></div><span>Capturando...</span>';

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id) {
        showStatus('Nenhuma aba ativa encontrada.', 'error');
        return;
      }

      // Check if content script is available, inject if needed
      try {
        // First, try to inject the content script (it's idempotent via IIFE)
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js'],
        });
      } catch (injectError) {
        console.warn('Script injection skipped:', injectError.message);
      }

      // Small delay to let content script initialize
      await new Promise((r) => setTimeout(r, 300));

      // Send capture message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'captureProduct',
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Falha ao capturar dados da página.');
      }

      capturedProduct = response.data;

      // Show preview
      if (capturedProduct.imagem) {
        previewImage.src = capturedProduct.imagem;
        previewImage.style.display = 'block';
      } else {
        previewImage.style.display = 'none';
      }

      previewTitle.textContent = capturedProduct.titulo || 'Produto sem título';
      previewPrice.textContent = formatPrice(capturedProduct.preco);
      previewOrigin.textContent = originLabel(capturedProduct.origem);

      // --- MetaData Display ---
      const extra = document.getElementById('previewExtra');
      extra.innerHTML = '';
      
      if (capturedProduct.metadata?.nota) {
        const star = document.createElement('div');
        star.style = 'background: rgba(235,191,123,0.1); color: #ebbf7b; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; border: 1px solid rgba(235,191,123,0.2); display: flex; align-items: center; gap: 4px;';
        star.innerHTML = `⭐ <span>${capturedProduct.metadata.nota}</span>`;
        extra.appendChild(star);
      }

      if (capturedProduct.metadata?.avaliacoes) {
        const reviews = document.createElement('div');
        reviews.style = 'background: rgba(59,130,246,0.1); color: #60a5fa; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; border: 1px solid rgba(59,130,246,0.2); display: flex; align-items: center; gap: 4px;';
        reviews.innerHTML = `💬 <span>${capturedProduct.metadata.avaliacoes}</span>`;
        extra.appendChild(reviews);
      }

      if (capturedProduct.metadata?.vendas) {
        const sales = document.createElement('div');
        sales.style = 'background: rgba(16,185,129,0.1); color: #34d399; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; border: 1px solid rgba(16,185,129,0.2); display: flex; align-items: center; gap: 4px;';
        sales.innerHTML = `🛍️ <span>${capturedProduct.metadata.vendas}</span>`;
        extra.appendChild(sales);
      }

      if (capturedProduct.metadata?.variacoes?.length > 0) {
        const vars = document.createElement('div');
        vars.style = 'background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; border: 1px solid rgba(255,255,255,0.1);';
        vars.innerText = `${capturedProduct.metadata.variacoes.length} Vars`;
        extra.appendChild(vars);
      }

      preview.classList.add('visible');
      saveActions.classList.add('visible');

      showStatus(
        `✅ Produto capturado via ${capturedProduct.metodo_extracao || 'Auto-Scanner'}`,
        'success'
      );
    } catch (error) {
      console.error('Capture error:', error);
      if (
        error.message?.includes('Cannot access') ||
        error.message?.includes('Receiving end does not exist')
      ) {
        pageWarning.style.display = 'block';
        showStatus('Não foi possível acessar esta página. Navegue até um produto.', 'error');
      } else {
        showStatus(error.message || 'Erro desconhecido.', 'error');
      }
    } finally {
      captureBtn.disabled = false;
      captureBtn.innerHTML = '<span>📸</span><span>Capturar Produto</span>';
    }
  });

  // --- Save to backend ---
  async function handleSave(generateAi = false) {
    if (!capturedProduct) return;

    const rawBackendUrl = backendUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!rawBackendUrl) {
      showStatus('Configure a URL do seu painel primeiro.', 'error');
      return;
    }

    if (!apiKey) {
      showStatus('Configure sua API Key primeiro.', 'error');
      return;
    }

    // Remove barra do final e a palavra /admin caso o usuário tenha colado o link do painel
    let backendUrl = rawBackendUrl.replace(/\/+$/, '').replace(/\/admin$/, '');
    
    if (!backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) 
        ? 'http://' + backendUrl 
        : 'https://' + backendUrl;
    }

    // Disable buttons and show loading
    saveBtn.disabled = true;
    saveWithAiBtn.disabled = true;
    
    if (generateAi) {
      saveWithAiBtn.innerHTML = '<div class="spinner"></div><span>Gerando Copy...</span>';
      showStatus('✨ A IA está criando o seu texto de venda... Aguarde.', 'info');
    } else {
      saveBtn.innerHTML = '<div class="spinner"></div><span>Salvando...</span>';
      hideStatus();
    }

    try {
      const response = await fetch(backendUrl + '/api/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          titulo: capturedProduct.titulo,
          preco: capturedProduct.preco,
          imagem: capturedProduct.imagem,
          link: capturedProduct.link,
          origem: capturedProduct.origem,
          external_id: capturedProduct.external_id,
          shop_id: capturedProduct.shop_id,
          metadata: capturedProduct.metadata,
          generate_ai: generateAi
        }),
      });

      let result;
      const responseText = await response.text();
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Non-JSON response:", responseText);
        throw new Error(`A URL não é uma API válida (Status ${response.status}). Verifique se a URL do painel está certa ou se o site está atualizado.`);
      }

      if (!response.ok || !result.success) {
        throw new Error(result?.error || `Erro ${response.status}`);
      }

      showStatus(generateAi ? '✅ Produto salvo e Copy gerada com sucesso!' : '✅ Produto salvo com sucesso!', 'success');

      // Reset state
      capturedProduct = null;
      preview.classList.remove('visible');
      saveActions.classList.remove('visible');
    } catch (error) {
      console.error('Save error:', error);
      showStatus('Erro ao conectar com: ' + backendUrl + '. Verifique se o servidor está ligado.', 'error');
    } finally {
      saveBtn.disabled = false;
      saveWithAiBtn.disabled = false;
      saveBtn.innerHTML = '<span>💾</span><span>Salvar no Painel</span>';
      saveWithAiBtn.innerHTML = '<span>✨</span><span>Salvar + Gerar Post IA</span>';
    }
  }

  saveBtn.addEventListener('click', () => handleSave(false));
  saveWithAiBtn.addEventListener('click', () => handleSave(true));
});
