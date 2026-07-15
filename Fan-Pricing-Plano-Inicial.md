# Fan Pricing — Plano de Execução (v2, ancorado no código real)

**Autora:** Stéphanie Moreira · **Revisão:** Igor Bernardes
**Data:** 08/07/2026 · **Base:** repositório atual (Next.js + Supabase) + `supabase-schema.sql` + Ata 08/07
**Prepara:** reunião de 09/07 (15h–16h) — definir barreiras e prazos por prioridade para a **V1**
**Projeto no Linear:** [Fan Pricing / FPNG](https://linear.app/fun-to-fan/project/fan-pricing-0e26a47df814)

---

## 0. Correção de rota (sejamos honestos)

O primeiro plano que te entreguei foi escrito **antes** de eu ver o código. Ele partiu do seu pedido inicial ("segurança entre tenants, níveis de autorização, rotas") e assumiu multi-tenancy greenfield. Depois de ler o repositório, o schema e a Ata, a foto muda em dois pontos importantes:

1. **O sistema já existe e já roda.** É um app Next.js + Supabase com propostas, orçamentos, produtos, mão de obra e markup funcionando. Não é greenfield — é **evolução de um sistema em produção interna**.
2. **Multi-tenancy não é o problema de agora.** Hoje o Fan Pricing é **single-tenant** (uma organização: a End To End) com isolamento **por usuário** (`created_by`). A reunião de amanhã é sobre **V1 interna** — prazos e prioridades. Multi-tenancy é o degrau de "virar produto", que a própria Ata trata como futuro.

Então este plano separa duas coisas que eu tinha misturado: **(A) fechar e endurecer a V1 interna** e **(B) transformar em produto multi-tenant**. Tentar fazer as duas juntas agora atrasaria a V1 sem necessidade.

---

## 1. Estado atual (o que já existe)

**Stack:** Next.js 16 (App Router, Server Actions), React 19, TypeScript, Tailwind 4, Supabase (Postgres + Auth), `@react-pdf/renderer` (proposta em PDF), Nodemailer (e-mails), Recharts. Deploy `standalone` (Docker).

**Domínio (o que o sistema precifica):** custo de **mão de obra** (salário → hora, base 220h) + **ferramentas/licenças** por produto, multiplicado por um **markup** derivado de overhead + impostos + margem líquida. Fluxo: `produtos → orçamento (quote) → proposta (com token público) → contrato`.

**Motor de cálculo atual (`calculations.ts`):**

- `markup = 1 / (1 − overhead_pct − taxes_pct − net_margin_pct)`
- `preço = custo_mão_de_obra × markup + custo_ferramentas`
- `hora = salário_mensal / 220`

**Segurança hoje:** RLS **está ativo** em todas as tabelas, no modelo **dono do registro** (`created_by = auth.uid()`) com bypass para `admin` via função `is_admin()`. Papéis: só `user` e `admin`.

Ou seja: a base de segurança existe e é razoável para uso interno. O problema não é ausência de segurança — são **buracos específicos** e a **distância até multi-tenant**.

---

## 2. Diagnóstico de segurança — achados concretos

Estes são reais, encontrados no código/schema. Ordenados por severidade.

### 🔴 Crítico

**A. Toda proposta é publicamente legível (`using (true)`).**
No schema:
```sql
create policy "Acesso público por token" on public.proposals for select using (true);
```
Isso libera `SELECT` de **todas** as propostas para qualquer requisição anônima — o filtro por `public_token` só existe no código da aplicação, não na policy. Qualquer um com a `anon key` (que é pública, vai no navegador) pode enumerar todas as propostas. **O token não está protegendo nada no nível do banco.**
→ *Correção:* a policy pública deve casar o token, não retornar `true`. O padrão é expor a proposta por token via uma função `security definer` / RPC que recebe o token e retorna só aquela linha, mantendo a tabela fechada para o papel anônimo.

**B. Rota `/admin` sem guarda efetiva.**
A checagem de papel admin vivia em `src/proxy.ts` — mas o arquivo se chama `proxy.ts`, **não** `middleware.ts`, e nada o importa. O Next.js só executa automaticamente `middleware.ts`. Resultado: **o middleware não roda**. O `(dashboard)/layout.tsx` exige login (bom), mas **não** re-checa papel admin. E `admin/users/page.tsx` lista **todos** os usuários via `service_role` (`admin.auth.admin.listUsers()`) sem verificar se quem acessa é admin.
→ *Efeito:* um usuário comum logado pode, na prática, abrir `/admin/users` e ver a lista de usuários. *Correção:* renomear/rewire para `middleware.ts` **e** re-checar papel no server component de cada rota admin (defesa em profundidade — nunca confie só no middleware).

### 🟠 Alto

**C. Uso disseminado do `service_role` (bypassa RLS).**
`createAdminClient()` (service role) aparece em 8 lugares, incluindo páginas e actions. A `service_role` **ignora todo o RLS**. Cada uso precisa ser justificado (só operações legitimamente privilegiadas, ex.: listar usuários do Auth). Uso casual = a RLS deixa de proteger aquele caminho.
→ *Correção:* auditar os 8 usos; trocar por client com sessão do usuário sempre que possível; isolar o service role em uma camada server-only pequena e revisada.

**D. Registro aberto (`/register` público + trigger cria perfil automático).**
`/register` é rota pública e o trigger `handle_new_user` cria perfil `role='user'` para **qualquer** signup. Numa ferramenta interna, isso é porta aberta: qualquer pessoa cria conta e entra no dashboard.
→ *Correção:* registro por convite (ou domínio `@grupoendtoend.com.br` na policy/trigger) enquanto for interno.

### 🟡 Médio

**E. `contracts` insert com `with check (true)`** — qualquer um pode inserir contrato. Fechar por dono da proposta.
**F. Custos sensíveis legíveis por todo usuário autenticado** — `labor.monthly_salary`, `markup_config` são lidos por qualquer `user`. Ok internamente; vira problema quando houver perfis externos.
**G. Schema fora de versionamento / migrations.** O `supabase-schema.sql` é "rode uma vez no editor". Sem migrations versionadas, mudança de schema é manual e não reproduzível.
**H. `next.config` com `images.remotePatterns` liberando `hostname: "**"`** — qualquer domínio de imagem. Restringir aos hosts do Supabase/CDN.
**I. Divergência de modelo:** `types/index.ts` usa `full_name`; schema usa `name`. O código já tem *fallback* — dívida técnica a alinhar.

---

## 3. Autorização — hoje vs. onde precisa chegar

**Hoje:** dois papéis (`user`, `admin`), isolamento por dono do registro. Suficiente para a agência internamente.

**Recomendação (mentor):** **não** inflar RBAC agora. O modelo `user/admin` atende a V1. Só evolua para papéis granulares (Owner/Admin/Editor/Viewer) **quando** entrar multi-tenant, porque aí papel passa a ser por tenant. Adicionar papéis antes disso é complexidade sem retorno.

O que **precisa** virar disciplina desde já: **autorização checada no servidor em toda Server Action**, não só na página. Hoje várias actions (ex.: `deleteClientAction`) confiam no RLS — o que é aceitável — mas as que usam `service_role` **não têm rede**. Regra: `service_role` só atrás de uma verificação explícita de papel.

---

## 4. Rotas — o que já está bom e o que falta

O App Router já dá organização (grupos `(auth)` e `(dashboard)`, Server Actions por domínio, API em `/api`, rota pública `/p/[token]`). Não precisa de "API versionada `/api/v1`" agora — isso é padrão de produto/integrações externas, não de app interno com Server Actions. **Corrigindo minha recomendação anterior:** versionamento de API entra só na fase de produto/integrações.

O que falta em rotas hoje: **o middleware efetivo** (achado B) e **guardas de papel por rota admin**.

---

## 5. Roadmap por prioridade (formato do seu action item: agora / 60 / 90 / 120 dias)

### 🚀 Agora → V1 interna sólida (foco da reunião de 09/07)

Duas frentes em paralelo:

*Frente Segurança (barata, alta severidade — fazer já):*
- Corrigir acesso público de propostas por token (achado A).
- Wire do `middleware.ts` + guarda de papel nas rotas admin (B).
- Auditar os 8 usos de `service_role` (C).
- Fechar registro (convite/domínio) (D) e `contracts` insert (E).

*Frente Produto (o que a Ata pede para a V1):*
- Fechar as **regras de cálculo** abertas (ver seção 6) — bloqueiam o motor.
- **Geração de proposta em PDF**: formato/conteúdo (depende do template do Leandro).
- **Integração de IA** para gerar propostas com dados de mercado (depende da chave de API — Renan).

### 📅 60 dias — Confiabilidade
Migrations versionadas (G); testes automatizados das regras de cálculo e das policies de RLS; observabilidade (captura de erro, logs estruturados); backup com restore testado; rate limiting na rota pública `/p/[token]`.

### 📅 90 dias — Preparar produto
Modelo de auditoria (quem mudou preço/markup/papel); refino de UX; hardening geral; decisão formal go/no-go de produto.

### 📅 120 dias — Multi-tenant (só se virar produto)
Introduzir `tenant_id` em todas as tabelas de negócio + reescrever policies de RLS de "dono do registro" para "escopo de tenant"; RBAC por tenant; onboarding/convites por tenant; billing. **É uma retrofit significativa** — daí a importância de não prometer isso como V1.

---

## 6. Pauta técnica de terça (regras de cálculo em aberto) — mapeada ao código

A Ata lista 5 pontos a validar. Onde cada um bate no código:

| Ponto em aberto (Ata) | Situação no código | Decisão a tomar |
|---|---|---|
| Horas → % de alocação por nível | Hoje é `hora × horas_alocadas` (`hours_allocated`), sem % | Manter horas absolutas ou migrar para % de alocação? Muda `product_labor` e o cálculo |
| Overhead sobre MOD ou custo total | `markup` aplica sobre **mão de obra**; ferramentas somam **fora** do markup | Definir se ferramentas entram no markup ou seguem fora |
| Margem líquida flutuante (padrão 32%) | `net_margin_pct` fixo (default 0.30 no schema) | Permitir flutuar por proposta, com aprovação admin? Muda quote/proposal |
| Ferramentas: fixo ou overhead | Hoje somadas fora do markup, por produto | Se virarem overhead, entram no `markup_config` |
| Proposta em PDF | `ProposalPDF.tsx` existe | Fechar layout/conteúdo com template do Leandro |

> ⚠️ **Divergência a checar:** a Ata cita margem padrão **32%**; o schema tem **30%** (`net_margin_pct 0.30`) e `markup_result 1.68`. Alinhar a fonte de verdade.

---

## 7. Decisões para confirmar (bloqueiam o resto)

1. **V1 é single-tenant interno? (recomendo: sim.)** Multi-tenant vira fase 120d só se houver go de produto. Preciso do teu aval nisso — foi o ponto que eu tinha superdimensionado.
2. **Fixar as 5 regras de cálculo** (seção 6) na reunião de terça.
3. **Margem: 30% ou 32%?** Resolver a divergência schema × Ata.
4. **Autorizar os fixes de segurança da frente "Agora"** — são baratos e independem das decisões de negócio.

---

## 8. O que já organizei no Linear

Team **Fan Pricing (FPNG)** criado, projeto movido, milestones e issues da fundação criadas. **Vou reescrever essas issues** para refletir este plano v2 (V1 + fixes de segurança primeiro; multi-tenant como fase futura), já que as originais assumiam greenfield multi-tenant.
