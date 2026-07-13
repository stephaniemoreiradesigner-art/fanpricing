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

export interface Labor {
  id: string
  title: string
  level: 'junior' | 'pleno' | 'senior'
  monthly_salary: number
  hourly_rate: number
  created_at: string
}

export interface MarkupConfig {
  id: string
  overhead_pct: number
  taxes_pct: number
  net_margin_pct: number
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
