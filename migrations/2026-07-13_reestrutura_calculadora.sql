-- ============================================================================
-- FanPricing — Módulo Calculadora Comercial (Orçamento 360)
-- Baseado no MD "Racional da Calculadora Comercial" (Igor, 13/07/2026).
--
-- MÓDULO INDEPENDENTE: cria tabelas próprias que CONVIVEM com o modelo de
-- catálogo/propostas já existente (catalog_items, catalog_item_pricing,
-- proposals, proposal_items...). NÃO altera nem apaga nada do catálogo.
-- Rode no SQL Editor do Supabase.
--
-- ⚠️ Antes de rodar em produção, confirmar com o Igor se a calculadora deve
--    escrever seu Preço de Venda final em catalog_item_pricing / proposal_items.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) pricing_config — variáveis do racional (singleton). Frações (0.10 = 10%).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ovh_pct         numeric NOT NULL DEFAULT 0,   -- Overhead
  cdi_pct         numeric NOT NULL DEFAULT 0,   -- CDI anual
  spread_pct      numeric NOT NULL DEFAULT 0,   -- Spread bancario anual
  prazo_dias      integer NOT NULL DEFAULT 30,  -- Prazo de recebimento (dias)
  reserva_pct     numeric NOT NULL DEFAULT 0,   -- Reserva de risco
  comissao_pct    numeric NOT NULL DEFAULT 0,   -- Comissao broker / comercial
  impostos_pct    numeric NOT NULL DEFAULT 0,   -- Impostos sobre a receita
  margem_alvo_pct numeric NOT NULL DEFAULT 0,   -- Margem alvo
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid
);

-- Seed com o exemplo validado End to End (OVH 10%, Impostos 17,55%, Margem 32%),
-- reproduzindo o markup divisor de 2,18x. Ajustar os demais com o Igor.
INSERT INTO pricing_config (ovh_pct, impostos_pct, margem_alvo_pct, prazo_dias)
SELECT 0.10, 0.1755, 0.32, 30
WHERE NOT EXISTS (SELECT 1 FROM pricing_config);

-- ----------------------------------------------------------------------------
-- 2) labor — funcoes, senioridade, salario e base de horas (CLT/PJ)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS labor (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text    NOT NULL,
  level          text    NOT NULL DEFAULT 'pleno',  -- junior | pleno | senior
  monthly_salary numeric NOT NULL DEFAULT 0,
  regime         text    NOT NULL DEFAULT 'clt',     -- clt | pj
  monthly_hours  numeric NOT NULL DEFAULT 220,       -- CLT = 220h padrao
  hourly_rate    numeric NOT NULL DEFAULT 0,         -- salario / horas
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3) tools — ferramentas/servicos (custo mensal), independente da mao de obra
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tools (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text    NOT NULL,
  monthly_cost numeric NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4) quotes — orcamentos gerados pela calculadora.
--    Composicao (pessoas+ferramentas) guardada como snapshot jsonb.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quotes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid,
  created_by    uuid,
  status        text    NOT NULL DEFAULT 'saved',   -- draft | saved
  total_monthly numeric NOT NULL DEFAULT 0,         -- preco final (com desconto)
  total_setup   numeric NOT NULL DEFAULT 0,
  discount_pct  numeric NOT NULL DEFAULT 0,
  profit_margin numeric NOT NULL DEFAULT 0,         -- margem real
  sale_price    numeric,                            -- preco de venda (sem desconto)
  composition   jsonb,                              -- { labor:[], tools:[] }
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5) RLS — libera para usuarios autenticados (ajuste ao padrao do projeto)
-- ----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pricing_config','labor','tools','quotes'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = t || '_authenticated_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        t || '_authenticated_all', t
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Fim da migracao.
-- ============================================================================
