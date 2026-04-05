-- ============================================================
-- MB Afiliados — Migração: Extensão Chrome + Monitoramento de Preços
-- ============================================================
-- Execute este SQL no Supabase Dashboard (SQL Editor)
-- ============================================================

-- 1. Adicionar coluna de origem nos produtos
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS origem text DEFAULT 'manual';

-- 2. Adicionar API key nos tenants (para autenticação da extensão)
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS api_key text UNIQUE;

-- 3. Criar tabela de histórico de preços
CREATE TABLE IF NOT EXISTS public.historico_precos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  preco numeric(10,2) NOT NULL,
  data_coleta timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_historico_precos_product_id 
  ON public.historico_precos(product_id);
  
CREATE INDEX IF NOT EXISTS idx_historico_precos_data_coleta 
  ON public.historico_precos(data_coleta DESC);

CREATE INDEX IF NOT EXISTS idx_products_origem 
  ON public.products(origem);

CREATE INDEX IF NOT EXISTS idx_tenants_api_key 
  ON public.tenants(api_key) WHERE api_key IS NOT NULL;

-- 5. RLS para historico_precos
ALTER TABLE public.historico_precos ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para todos (o produto já é público)
CREATE POLICY "Historico de precos visivel por todos" 
  ON public.historico_precos
  FOR SELECT USING (true);

-- Permitir inserção via service role (usado pela API route)
CREATE POLICY "Historico inserido via service role" 
  ON public.historico_precos
  FOR INSERT WITH CHECK (true);

-- 6. Gerar API keys para tenants existentes que ainda não têm
UPDATE public.tenants 
SET api_key = 'mbk_' || replace(gen_random_uuid()::text, '-', '')
WHERE api_key IS NULL;
