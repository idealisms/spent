export type BrokerageSource = 'vanguard' | 'schwab' | 'schwab_equity';

export type IncomeCategory =
  | 'dividend'  // qualified fraction determined by qualifiedConfig
  | 'interest'  // always ordinary income
  | 'ltcg'      // long-term capital gain (or loss)
  | 'stcg';     // short-term capital gain (or loss)

export interface IBrokerageTransaction {
  date: string;         // YYYY-MM-DD
  source: BrokerageSource;
  symbol: string;
  description: string;
  category: IncomeCategory;
  amountCents: number;  // positive = income/gain, negative = loss
}

// symbol → fraction of dividends that are qualified (0.0 – 1.0)
// Sourced from prior-year 1099-DIV. Persisted in localStorage.
export type IQualifiedConfig = Record<string, number>;

export interface ITaxSummary {
  // Income buckets (before deductions)
  qualifiedDividendsCents: number;
  ordinaryDividendsCents: number;
  interestCents: number;
  ltcgCents: number;
  stcgCents: number;
  // Federal
  federalStandardDeductionCents: number;
  federalTaxableOrdinaryCents: number;
  federalOrdinaryTaxCents: number;
  federalLtcgTaxCents: number;
  federalNiitCents: number;
  federalTotalCents: number;
  // California
  caStandardDeductionCents: number;
  caTaxableIncomeCents: number;
  caTaxCents: number;
  // Grand total
  totalTaxCents: number;
}
