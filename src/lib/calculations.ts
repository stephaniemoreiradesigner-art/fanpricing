import type {
  Product,
  PricingConfig,
  QuoteComposition,
  CostBreakdown,
} from '@/types'

// ============================================================================
// Motor de cálculo — Racional da Calculadora Comercial (MD do Igor, 13/07/2026)
// ----------------------------------------------------------------------------
// Cascata:
//   Custo MOD + Custo Adicional = Custo Direto
//   → Custo OVH → Custo Financeiro (juros compostos) → Custo Reserva
//   → Custo Comercial → Base Operacional → Preço de Venda → Margem/Lucro Real
// ============================================================================

const EMPTY_CONFIG: Pick<
  PricingConfig,
  | 'ovh_pct'
  | 'cdi_pct'
  | 'spread_pct'
  | 'prazo_dias'
  | 'reserva_pct'
  | 'comissao_pct'
  | 'impostos_pct'
  | 'margem_alvo_pct'
> = {
  ovh_pct: 0,
  cdi_pct: 0,
  spread_pct: 0,
  prazo_dias: 0,
  reserva_pct: 0,
  comissao_pct: 0,
  impostos_pct: 0,
  margem_alvo_pct: 0,
}

/**
 * Custo mensal de uma linha de mão de obra.
 * valor/hora × horas do mês × alocação(%).
 */
export function calcLaborLineCost(
  hourlyRate: number,
  monthlyHours: number,
  allocationPct: number
): number {
  return hourlyRate * monthlyHours * (allocationPct / 100)
}

/**
 * Custo financeiro — juros compostos sobre (Custo Direto + Custo OVH).
 * MD §9: (CustoDireto+CustoOVH) * ((1+(CDI+Spread)/12)^(Prazo/30) - 1)
 * CDI e Spread são taxas ANUAIS; a divisão por 12 as põe ao mês.
 */
export function calcCustoFinanceiro(
  custoDireto: number,
  custoOVH: number,
  cdi: number,
  spread: number,
  prazoDias: number
): number {
  const base = custoDireto + custoOVH
  const fator = Math.pow(1 + (cdi + spread) / 12, prazoDias / 30) - 1
  return base * fator
}

/**
 * Breakdown completo conforme o MD. `discountPct` é o desconto comercial (0-100).
 * Retorna todas as linhas da cascata + Preço de Venda (sem e com desconto),
 * Margem Real e Lucro Real.
 */
export function calcBreakdown(
  composition: QuoteComposition,
  config: PricingConfig | null,
  discountPct = 0
): CostBreakdown {
  const c = config ?? EMPTY_CONFIG

  // §1-3: Custo Direto
  const custoMOD = composition.labor.reduce(
    (sum, l) => sum + calcLaborLineCost(l.hourly_rate, l.monthly_hours, l.allocation_pct),
    0
  )
  const custoAdicional = composition.tools.reduce((sum, t) => sum + t.monthly_cost, 0)
  const custoDireto = custoMOD + custoAdicional

  // §5: OVH
  const custoOVH = custoDireto * c.ovh_pct

  // §9: Financeiro
  const custoFinanceiro = calcCustoFinanceiro(
    custoDireto,
    custoOVH,
    c.cdi_pct,
    c.spread_pct,
    c.prazo_dias
  )

  // §11: Reserva
  const custoReserva = (custoDireto + custoOVH) * c.reserva_pct

  // §13: Comissão
  const custoComissao =
    (custoDireto + custoOVH + custoFinanceiro + custoReserva) * c.comissao_pct

  // §14: Base Operacional
  const baseOperacional =
    custoDireto + custoOVH + custoFinanceiro + custoReserva + custoComissao

  // §18: Preço de Venda (markup divisor por Impostos + Margem Alvo)
  const divisor = 1 - c.impostos_pct - c.margem_alvo_pct
  const precoVendaBruto = divisor > 0 ? baseOperacional / divisor : 0
  const desconto = discountPct / 100
  const precoVenda = precoVendaBruto * (1 - desconto)

  // §19-20: Margem Real e Lucro Real (sobre o preço já com desconto)
  const margemReal =
    precoVenda > 0 ? 1 - c.impostos_pct - baseOperacional / precoVenda : 0
  const lucroReal = precoVenda * (1 - c.impostos_pct) - baseOperacional

  return {
    custoMOD,
    custoAdicional,
    custoDireto,
    custoOVH,
    custoFinanceiro,
    custoReserva,
    custoComissao,
    baseOperacional,
    precoVendaBruto,
    precoVenda,
    margemReal,
    lucroReal,
  }
}

/**
 * Valor/hora a partir do salário mensal e da base de horas.
 * CLT = 220h padrão; PJ ou outras empresas podem ter base editável.
 */
export function calcLaborHourlyRate(monthlySalary: number, monthlyHours = 220): number {
  return monthlyHours > 0 ? monthlySalary / monthlyHours : 0
}

// ---------------------------------------------------------------------------
// Legado — orçamento por produtos (modelo antigo do repositório). Mantido
// apenas para não quebrar imports enquanto telas antigas não são removidas.
// ---------------------------------------------------------------------------
export function calcProductPrice(product: Product, markup: number): number {
  const laborCost = (product.product_labor ?? []).reduce((sum, pl) => {
    const hourlyRate = pl.labor?.hourly_rate ?? 0
    return sum + hourlyRate * pl.hours_allocated
  }, 0)
  const toolsCost = (product.product_tools ?? []).reduce((sum, pt) => sum + pt.monthly_cost, 0)
  return laborCost * markup + toolsCost
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(value)
}
