-- Criação da tabela de Analytics
CREATE TABLE public.catalog_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index para facilitar a contagem de eventos rápidos pelo tenant e por data
CREATE INDEX idx_catalog_events_tenant_time ON public.catalog_events (tenant_id, created_at DESC);
CREATE INDEX idx_catalog_events_type ON public.catalog_events (tenant_id, event_type);

-- Comentários da tabela
COMMENT ON TABLE public.catalog_events IS 'Armazena métricas de visualização e clique da vitrine do afiliado';
COMMENT ON COLUMN public.catalog_events.event_type IS 'Tipos: page_view, product_click, whatsapp_float_click, whatsapp_group_click';

-- Como estamos utilizando a service_role interna pro tracking /r/[id] e nas chamadas de servidor, 
-- NÃO precisamos forçar RLS super restrito se inserirmos via service_key (ou podemos liberar insert anônimo se usarmos a rota de API pública)

-- Habilitar RLS
ALTER TABLE public.catalog_events ENABLE ROW LEVEL SECURITY;

-- Permitir leitura apenas para o dono (owner do tenant) - útil para o dashboard (caso faça selects diretos sem RPC)
CREATE POLICY "Donos podem ver os eventos do seu tenant" 
ON public.catalog_events 
FOR SELECT 
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE owner_id = auth.uid()
  )
);

-- Permitir INSERT para uso nas APIs do servidor (service_role ignora RLS, então não precisa de policy de insert explícita para o admin,
-- mas caso desejemos usar anon key na rota de API em algum momento, criamos uma pública para insert):
CREATE POLICY "Permitir registro de eventos anonimos" 
ON public.catalog_events 
FOR INSERT 
WITH CHECK (true);
