-- ============================================================================
-- FanPricing — Fase 4 (FPNG-14): aprovação de desconto <32% + notificações
-- Duas tabelas:
--   discount_approvals — ciclo da solicitação (pedido + decisão) e histórico
--   notifications      — push in-app (sino no header)
-- Rode no SQL Editor do Supabase.
-- ============================================================================

-- 1) Solicitações de aprovação de desconto ------------------------------------
CREATE TABLE IF NOT EXISTS discount_approvals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id          uuid,                              -- orçamento (id único)
  requested_by      uuid,
  requested_by_name text,
  discount_pct      numeric NOT NULL,                  -- desconto solicitado
  margin_pct        numeric,                           -- margem resultante (fração)
  justification     text NOT NULL,                     -- motivo do solicitante
  status            text NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  reviewed_by       uuid,
  reviewer_name     text,
  decision_reason   text,                              -- motivo do admin (recusa)
  created_at        timestamptz NOT NULL DEFAULT now(),
  decided_at        timestamptz
);

CREATE INDEX IF NOT EXISTS discount_approvals_quote_idx  ON discount_approvals (quote_id);
CREATE INDEX IF NOT EXISTS discount_approvals_status_idx ON discount_approvals (status);

ALTER TABLE discount_approvals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'discount_approvals' AND policyname = 'discount_approvals_authenticated_all'
  ) THEN
    CREATE POLICY discount_approvals_authenticated_all ON discount_approvals
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2) Notificações in-app ------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,                    -- destinatário
  type       text NOT NULL,                    -- discount_request | discount_approved | discount_rejected
  title      text NOT NULL,
  body       text,
  link       text,                             -- rota interna (ex: /quotes/discount-approvals/<id>)
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Cada usuário só lê/atualiza as próprias notificações.
  -- (A criação para outros usuários é feita pelo cliente service-role no servidor.)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'notifications_own_select'
  ) THEN
    CREATE POLICY notifications_own_select ON notifications
      FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'notifications_own_update'
  ) THEN
    CREATE POLICY notifications_own_update ON notifications
      FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- Fim.
-- ============================================================================
