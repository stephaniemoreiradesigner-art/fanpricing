-- ============================================================================
-- FanPricing — Colunas estendidas de profiles (Fase 3 / FPNG-13)
-- Causa provável do bug "promover a admin não aplica": a tela de Usuários salva
-- role junto com phone/cnpj/address/avatar_url; se essas colunas não existirem,
-- o UPDATE inteiro falha e o papel não é gravado.
-- Esta migration é idempotente (ADD COLUMN IF NOT EXISTS) — segura de rodar
-- mesmo que alguma coluna já exista.
-- Rode no SQL Editor do Supabase.
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone       text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cnpj        text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address     text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url  text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active   boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at  timestamptz;

-- ============================================================================
-- Fim.
-- ============================================================================
