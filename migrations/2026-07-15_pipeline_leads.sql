-- ============================================================================
-- FanPricing — Módulo Pipeline (funil de leads)
-- Portado do Fan Mídias, adaptado para single-tenant (sem organizacao_id).
-- O Kanban roda pelo enum `status`. O forecast usa probabilidade fixa por
-- status (ver src/lib/pipeline.ts), então NÃO há tabela pipeline_stages.
-- Rode no SQL Editor do Supabase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,                    -- nome do contato
  company              text,                             -- empresa
  email                text,
  phone                text,
  source               text,                             -- origem (Indicação, Site, ...)
  status               text NOT NULL DEFAULT 'prospect', -- prospect | contato | proposta | fechado | perdido
  estimated_value      numeric,                          -- valor estimado (R$)
  owner                text,                             -- responsável (texto livre)
  notes                text,                             -- observações
  temperature          smallint NOT NULL DEFAULT 0,      -- 0 (frio) a 5 (super quente)
  negotiation_history  text,                             -- histórico de negociação
  client_id            uuid,                             -- cliente vinculado (após conversão)
  quote_id             uuid,                             -- orçamento gerado (opcional)
  first_contact_at     timestamptz,                      -- p/ ciclo médio de vendas
  closed_at            timestamptz,                      -- data de fechado/perdido
  created_by           uuid,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_status_idx     ON leads (status);
CREATE INDEX IF NOT EXISTS leads_created_by_idx ON leads (created_by);
CREATE INDEX IF NOT EXISTS leads_client_idx     ON leads (client_id);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'leads' AND policyname = 'leads_authenticated_all'
  ) THEN
    CREATE POLICY leads_authenticated_all ON leads
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- Fim.
-- ============================================================================
