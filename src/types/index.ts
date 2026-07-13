export type UserRole = 'user' | 'admin'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  avatar_url: string | null
  phone: string | null
  cnpj: string | null
  address: string | null
  created_at: string
  updated_at: string | null
}

export interface Client {
  id: string
  razao_social: string
  nome_fantasia: string | null
  cnpj: string | null
  ie: string | null
  im: string | null
  address: string | null
  city: string | null
  zip: string | null
  state: string | null
  responsible: string | null
  phone: string | null
  email: string | null
  created_by: string | null
  created_at: string
}

export type LaborRegime = 'clt' | 'pj'

export interface Labor {
  id: string
  title: string
  level: 'junior' | 'pleno' | 'senior'
  monthly_salary: number
  hourly_rate: number
  // Regime e base de horas mensais — editavel por empresa. CLT = 220h padrao.
  regime: LaborRegime
  monthly_hours: number
  created_at: string
}

// Cadastro independente de ferramentas/servicos (tabela separada de mao de obra).
export interface Tool {
  id: string
  name: string
  monthly_cost: number
  created_at: string
}

// Configuracao de precificacao — variaveis do Racional (MD do Igor, 13/07/2026).
// Singleton editavel so por admin (dados sensiveis: nunca expostos ao cliente).
// Todos os *_pct sao fracoes (0.10 = 10%). prazo_dias em dias corridos.
export interface PricingConfig {
  id: string
  ovh_pct: number         // §4 Overhead (% sobre Custo Direto)
  cdi_pct: number         // §6 CDI anual
  spread_pct: number      // §7 Spread bancario anual
  prazo_dias: number      // §8 Prazo de recebimento (dias)
  reserva_pct: number     // §10 Reserva de risco
  comissao_pct: number    // §12 Comissao broker (custo comercial)
  impostos_pct: number    // §15 Impostos sobre a receita
  margem_alvo_pct: number // §16 Margem alvo
  updated_at: string
  updated_by: string | null
}

// Alias legado — telas de produto antigas ainda importam MarkupConfig.
// Nao usar em codigo novo; usar PricingConfig.
export interface MarkupConfig {
  id: string
  markup_result: number
  updated_at: string
  updated_by: string | null
}

export interface Product {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  product_labor?: ProductLabor[]
  product_tools?: ProductTool[]
}

export interface ProductLabor {
  id: string
  product_id: string
  labor_id: string
  hours_allocated: number
  labor?: Labor
}

export interface ProductTool {
  id: string
  product_id: string
  name: string
  monthly_cost: number
}

// ---- Composicao do orcamento baseada em pessoas + ferramentas ----
export interface QuoteLaborLine {
  labor_id: string
  title: string
  level: Labor['level']
  hourly_rate: number
  monthly_hours: number
  // Alocacao em porcentagem (0-100). Ex: 50 = meio periodo do profissional.
  allocation_pct: number
}

export interface QuoteToolLine {
  tool_id: string
  name: string
  monthly_cost: number
}

// Snapshot da composicao salvo no orcamento (jsonb).
export interface QuoteComposition {
  labor: QuoteLaborLine[]
  tools: QuoteToolLine[]
}

// Detalhamento de custo (cascata do MD) exibido na tela "Ver detalhes".
export interface CostBreakdown {
  custoMOD: number         // §1 Custo de mao de obra
  custoAdicional: number   // §2 Ferramentas/servicos
  custoDireto: number      // §3 MOD + Adicional
  custoOVH: number         // §5 Custo de overhead
  custoFinanceiro: number  // §9 Custo financeiro (juros compostos)
  custoReserva: number     // §11 Reserva de risco
  custoComissao: number    // §13 Custo comercial
  baseOperacional: number  // §14 Base operacional
  precoVendaBruto: number  // §18 Preco de venda antes do desconto
  precoVenda: number       // §18 Preco de venda com desconto
  margemReal: number       // §19 Margem real (fracao)
  lucroReal: number        // §20 Lucro real (R$)
}

export interface Quote {
  id: string
  client_id: string | null
  created_by: string | null
  status: 'draft' | 'saved'
  total_monthly: number
  total_setup: number
  discount_pct: number
  profit_margin: number
  notes: string | null
  created_at: string
  composition?: QuoteComposition | null
  sale_price?: number | null
  client?: Client
  quote_items?: QuoteItem[]
}

export interface QuoteItem {
  id: string
  quote_id: string
  product_id: string | null
  calculated_price: number
  product?: Product
}

export type SetupPaymentMethod = 'boleto' | 'cartao'
export type ProposalStatus = 'draft' | 'sent' | 'viewed'

export interface Proposal {
  id: string
  quote_id: string | null
  client_id: string | null
  created_by: string | null
  status: ProposalStatus
  setup_installments: number
  setup_payment_method: SetupPaymentMethod
  contract_months: number
  public_token: string
  sent_at: string | null
  viewed_at: string | null
  created_at: string
  client?: Client
  quote?: Quote
}

export type ContractStatus = 'pending' | 'signed' | 'completed'

export interface Contract {
  id: string
  proposal_id: string | null
  client_id: string | null
  status: ContractStatus
  notes: string | null
  signed_at: string | null
  created_at: string
  proposal?: Proposal
  client?: Client
}
