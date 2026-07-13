-- ============================================================================
-- FanPricing — Proposta do módulo (gerada a partir do orçamento labor+ferramentas)
-- Reunião 13/07/2026. Segue o modelo decidido hoje (NÃO usa a tabela catalog
-- 'proposals'). Regras de sigilo do doc do Leandro aplicadas na apresentação.
-- Rode no SQL Editor do Supabase (depois da migração do módulo calculadora).
-- ============================================================================

CREATE TABLE IF NOT EXISTS quote_proposals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id       uuid,                       -- orçamento de origem (tabela quotes)
  client_id      uuid,
  created_by     uuid,
  status         text NOT NULL DEFAULT 'draft',   -- draft | sent | viewed | accepted
  title          text NOT NULL DEFAULT 'Proposta comercial',
  intro          text,                        -- introdução (editável; futura geração por IA)
  scope          text,                        -- "O que está incluído" (client-facing)
  billing_model  text NOT NULL DEFAULT 'projeto',  -- projeto (50/50) | always_on
  contract_months integer NOT NULL DEFAULT 12,
  -- Snapshots congelados no momento do envio (client-facing; sem custos internos):
  total_monthly  numeric NOT NULL DEFAULT 0,
  total_setup    numeric NOT NULL DEFAULT 0,
  discount_pct   numeric NOT NULL DEFAULT 0,
  public_token   text UNIQUE,
  valid_until    date,
  sent_at        timestamptz,
  viewed_at      timestamptz,
  accepted_at    timestamptz,
  accepted_by_name  text,
  accepted_by_email text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quote_proposals_token_idx ON quote_proposals (public_token);
CREATE INDEX IF NOT EXISTS quote_proposals_quote_idx ON quote_proposals (quote_id);

ALTER TABLE quote_proposals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quote_proposals' AND policyname = 'quote_proposals_authenticated_all'
  ) THEN
    CREATE POLICY quote_proposals_authenticated_all ON quote_proposals
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  -- Leitura pública pelo token (para a página /p/[token] do cliente):
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quote_proposals' AND policyname = 'quote_proposals_public_read'
  ) THEN
    CREATE POLICY quote_proposals_public_read ON quote_proposals
      FOR SELECT TO anon USING (public_token IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- Fim.
-- ============================================================================
