import type { Product, MarkupConfig } from '@/types'

export function calcMarkup(config: MarkupConfig): number {
  const { overhead_pct, taxes_pct, net_margin_pct } = config
  return 1 / (1 - overhead_pct - taxes_pct - net_margin_pct)
}

export function calcProductPrice(product: Product, markup: number): number {
  const laborCost = (product.product_labor ?? []).reduce((sum, pl) => {
    const hourlyRate = pl.labor?.hourly_rate ?? 0
    return sum + hourlyRate * pl.hours_allocated
  }, 0)

  const toolsCost = (product.product_tools ?? []).reduce((sum, pt) => {
    return sum + pt.monthly_cost
  }, 0)

  return laborCost * markup + toolsCost
}

export function calcLaborHourlyRate(monthlySalary: number): number {
  return monthlySalary / 220
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
  }).format(value)
}
