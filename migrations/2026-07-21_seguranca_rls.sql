-- ============================================================================
-- FanPricing — Correções de segurança (FPNG-1 e FPNG-8)
-- Rode no SQL Editor do Supabase, depois das migrações anteriores.
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FPNG-1 — quote_proposals: a policy "public_token IS NOT NULL" liberava
-- SELECT de TODAS as propostas enviadas para o papel anon, não só a do token
-- pedido. Fecha a tabela para anon e expõe só via função security definer,
-- que recebe o token como parâmetro e retorna apenas a linha correspondente.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS quote_proposals_public_read ON quote_proposals;

CREATE OR REPLACE FUNCTION get_public_proposal(p_token text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(qp) || jsonb_build_object(
    'client_razao_social', c.razao_social,
    'client_nome_fantasia', c.nome_fantasia
  )
  FROM quote_proposals qp
  LEFT JOIN clients c ON c.id = qp.client_id
  WHERE qp.public_token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_public_proposal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_proposal(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION mark_proposal_viewed(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE quote_proposals
  SET status = 'viewed', viewed_at = now()
  WHERE public_token = p_token AND status = 'sent';
END;
$$;

REVOKE ALL ON FUNCTION mark_proposal_viewed(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_proposal_viewed(text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- FPNG-8 — contracts: não tinha created_by, e a policy liberava insert/update
-- para qualquer usuário autenticado ("with check (true)"). Adiciona a coluna
-- e escopa insert/update ao dono do registro (ou admin).
-- ----------------------------------------------------------------------------

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_by uuid;
CREATE INDEX IF NOT EXISTS contracts_created_by_idx ON contracts (created_by);

DROP POLICY IF EXISTS contracts_authenticated_all ON contracts;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contracts' AND policyname = 'contracts_select_own_or_admin'
  ) THEN
    CREATE POLICY contracts_select_own_or_admin ON contracts
      FOR SELECT TO authenticated
      USING (
        created_by = auth.uid()
        OR created_by IS NULL  -- contratos antigos, sem dono registrado ainda
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contracts' AND policyname = 'contracts_insert_own'
  ) THEN
    CREATE POLICY contracts_insert_own ON contracts
      FOR INSERT TO authenticated
      WITH CHECK (created_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contracts' AND policyname = 'contracts_update_own_or_admin'
  ) THEN
    CREATE POLICY contracts_update_own_or_admin ON contracts
      FOR UPDATE TO authenticated
      USING (
        created_by = auth.uid()
        OR created_by IS NULL
        OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      );
  END IF;
END $$;

-- ============================================================================
-- Fim. Depois de rodar, contratos criados a partir de agora terão created_by
-- preenchido (ver src/app/actions/contracts.ts). Contratos já existentes
-- ficam com created_by NULL e continuam visíveis/editáveis por qualquer
-- usuário até serem migrados manualmente, se você quiser restringir também
-- o histórico antigo.
-- ============================================================================
