-- ============================================================================
-- FanPricing — Seed de Ferramentas (custos mensais estimados, em BRL)
-- Rode no SQL Editor do Supabase. Ajuste os valores conforme os contratos reais.
-- Idempotente: só insere ferramentas que ainda não existem (pelo nome).
-- ============================================================================
INSERT INTO tools (name, monthly_cost)
SELECT v.name, v.monthly_cost
FROM (VALUES
  ('Adobe Creative Cloud', 350),
  ('Figma',                120),
  ('Canva Pro',             55),
  ('RD Station Marketing', 900),
  ('Google Workspace',     300),
  ('Semrush',              650),
  ('Supermetrics',         500),
  ('Notion',               100),
  ('Slack',                150),
  ('Meta Business / Ads Manager', 0),
  ('CapCut Pro',            40),
  ('Hospedagem / Cloud (AWS)', 400),
  ('Assistente de IA (ChatGPT/Claude)', 120)
) AS v(name, monthly_cost)
WHERE NOT EXISTS (SELECT 1 FROM tools t WHERE t.name = v.name);
