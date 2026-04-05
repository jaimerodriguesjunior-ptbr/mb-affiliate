-- 1. Limpeza de dados de teste (Conforme autorizado pelo usuário)
DELETE FROM public.historico_precos;
DELETE FROM public.products;

-- 2. Adição de colunas para identificação universal
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Limpeza de duplicados residuais (caso existam) antes de criar a restrição
-- (Não deve haver nada pois deletamos acima, mas por segurança)

-- 4. Criar restrição única para evitar duplicatas por ID de Origem
-- Combinação: Dono do site + Origem (Shopee/Amazon) + ID Externo + Loja
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS unique_external_product;
ALTER TABLE public.products 
ADD CONSTRAINT unique_external_product 
UNIQUE (tenant_id, origem, external_id, shop_id);

-- 5. Índices para performance de busca na captura
CREATE INDEX IF NOT EXISTS idx_products_external_ids 
ON public.products (external_id, shop_id);

-- 6. Comentários para documentação
COMMENT ON COLUMN public.products.external_id IS 'ID único do produto na origem (ex: itemid na Shopee, ASIN na Amazon)';
COMMENT ON COLUMN public.products.shop_id IS 'ID da loja na origem (ex: shopid na Shopee)';
COMMENT ON COLUMN public.products.metadata IS 'Dados extras como cores, tamanhos, notas e avaliações';
