-- ============================================================================
-- FanPricing — Contratos do módulo (ligados às propostas do módulo)
-- Reunião 13/07/2026. Um contrato nasce de uma proposta aceita (quote_proposals).
-- Rode no SQL Editor do Supabase (depois das migrações do módulo).
-- ============================================================================

CREATE TABLE IF NOT EXISTS contracts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id  uuid,                         -- referencia quote_proposals
  client_id    uuid,
  status       text NOT NULL DEFAULT 'pending',  -- pending | signed | completed
  notes        text,
  signed_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_proposal_idx ON contracts (proposal_id);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contracts' AND policyname = 'contracts_authenticated_all'
  ) THEN
    CREATE POLICY contracts_authenticated_all ON contracts
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- Fim.
-- ============================================================================
