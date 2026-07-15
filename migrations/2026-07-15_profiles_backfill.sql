-- ============================================================================
-- FanPricing — Backfill de profiles (Fase 3 / FPNG-13)
-- Causa raiz do bug "promover a admin não aplica": usuários criados no Auth
-- (ex.: Igor, Leandro) NÃO tinham linha em `profiles`. Sem a linha, um UPDATE
-- não casa nada e o papel nunca é gravado; e um INSERT pode falhar se
-- `created_at` não tiver default.
-- Esta migration: (1) garante default em created_at, (2) cria a linha que
-- falta para todo usuário do Auth. Idempotente.
-- Rode no SQL Editor do Supabase.
-- ============================================================================

-- 1. Garante default em created_at (evita falha ao criar profiles).
ALTER TABLE profiles ALTER COLUMN created_at SET DEFAULT now();

-- 2. Cria profiles para usuários do Auth que ainda não têm (papel padrão 'user').
INSERT INTO profiles (id, email, role)
SELECT u.id, u.email, 'user'
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 3. Conferência.
SELECT email, full_name, role FROM profiles ORDER BY email;

-- ============================================================================
-- Fim.
-- ============================================================================
