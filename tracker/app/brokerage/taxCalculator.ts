import { IBrokerageTransaction, IQualifiedConfig, ITaxSummary } from './model';

// ── 2025 Tax Year Constants (Married Filing Jointly) ──────────────────────────

const c = (dollars: number) => Math.round(dollars * 100); // dollars → cents

// Federal ordinary income brackets (MFJ 2025)
const FED_ORDINARY_BRACKETS = [
  { min: c(0),       max: c(23_850),   rate: 0.10 },
  { min: c(23_850),  max: c(96_950),   rate: 0.12 },
  { min: c(96_950),  max: c(206_700),  rate: 0.22 },
  { min: c(206_700), max: c(394_600),  rate: 0.24 },
  { min: c(394_600), max: c(501_050),  rate: 0.32 },
  { min: c(501_050), max: c(751_600),  rate: 0.35 },
  { min: c(751_600), max: Infinity,    rate: 0.37 },
];

// Federal LTCG / qualified-dividend brackets (MFJ 2025)
const FED_LTCG_BRACKETS = [
  { min: c(0),        max: c(96_700),   rate: 0.00 },
  { min: c(96_700),   max: c(583_750),  rate: 0.15 },
  { min: c(583_750),  max: Infinity,    rate: 0.20 },
];

const FED_STANDARD_DEDUCTION = c(30_000);

// Net Investment Income Tax: 3.8% on NII above $250k (MFJ, not inflation-adjusted)
const NIIT_THRESHOLD = c(250_000);
const NIIT_RATE = 0.038;

// California ordinary income brackets (MFJ 2025, approximate — CA adjusts annually)
// Top bracket includes the 1% Mental Health Services Tax surtax above $1M.
const CA_BRACKETS = [
  { min: c(0),          max: c(20_824),    rate: 0.010 },
  { min: c(20_824),     max: c(49_368),    rate: 0.020 },
  { min: c(49_368),     max: c(77_918),    rate: 0.040 },
  { min: c(77_918),     max: c(108_162),   rate: 0.060 },
  { min: c(108_162),    max: c(136_700),   rate: 0.080 },
  { min: c(136_700),    max: c(698_274),   rate: 0.093 },
  { min: c(698_274),    max: c(837_922),   rate: 0.103 },
  { min: c(837_922),    max: c(1_000_000), rate: 0.113 },
  { min: c(1_000_000),  max: Infinity,     rate: 0.133 },
];

const CA_STANDARD_DEDUCTION = c(10_726);

// ── Bracket helpers ───────────────────────────────────────────────────────────

interface IBracket { min: number; max: number; rate: number; }

// Progressive ordinary income tax.
function applyBrackets(amountCents: number, brackets: IBracket[]): number {
  let tax = 0;
  let remaining = Math.max(0, amountCents);
  for (const b of brackets) {
    if (remaining <= 0) {break;}
    const room = Math.min(remaining, b.max - b.min);
    tax += room * b.rate;
    remaining -= room;
  }
  return Math.round(tax);
}

// LTCG / qualified dividends are taxed at preferential rates but "stack" on
// top of ordinary taxable income when determining which bracket applies.
function applyLtcgBrackets(
  ltcgCents: number,
  stackedOrdinaryCents: number,
  brackets: IBracket[],
): number {
  let tax = 0;
  let remaining = Math.max(0, ltcgCents);
  for (const b of brackets) {
    if (remaining <= 0) {break;}
    // Room in this bracket after ordinary income has already filled it.
    const roomStart = Math.max(b.min, stackedOrdinaryCents);
    const room = Math.max(0, b.max - roomStart);
    const taxed = Math.min(remaining, room);
    tax += taxed * b.rate;
    remaining -= taxed;
  }
  return Math.round(tax);
}

// ── Main calculation ──────────────────────────────────────────────────────────

export function calculateTax(
  transactions: IBrokerageTransaction[],
  qualifiedConfig: IQualifiedConfig,
): ITaxSummary {
  // Aggregate dividends by symbol so we can apply per-symbol qualified fractions.
  const dividendsBySymbol: Record<string, number> = {};
  let interestCents = 0;
  let ltcgCents = 0;
  let stcgCents = 0;

  for (const t of transactions) {
    switch (t.category) {
      case 'dividend':
        dividendsBySymbol[t.symbol] = (dividendsBySymbol[t.symbol] ?? 0) + t.amountCents;
        break;
      case 'interest':
        interestCents += t.amountCents;
        break;
      case 'ltcg':
        ltcgCents += t.amountCents;
        break;
      case 'stcg':
        stcgCents += t.amountCents;
        break;
      default:
        break;
    }
  }

  let qualifiedDividendsCents = 0;
  let ordinaryDividendsCents = 0;
  for (const [symbol, total] of Object.entries(dividendsBySymbol)) {
    const qualFrac = Math.min(1, Math.max(0, qualifiedConfig[symbol] ?? 0));
    qualifiedDividendsCents += Math.round(total * qualFrac);
    ordinaryDividendsCents += Math.round(total * (1 - qualFrac));
  }

  // ── Federal ───────────────────────────────────────────────────────────────

  const fedOrdinaryIncomeCents = ordinaryDividendsCents + interestCents + stcgCents;
  const federalTaxableOrdinaryCents = Math.max(0, fedOrdinaryIncomeCents - FED_STANDARD_DEDUCTION);
  const federalOrdinaryTaxCents = applyBrackets(federalTaxableOrdinaryCents, FED_ORDINARY_BRACKETS);

  const fedPreferentialCents = qualifiedDividendsCents + ltcgCents;
  const federalLtcgTaxCents = applyLtcgBrackets(
    fedPreferentialCents,
    federalTaxableOrdinaryCents,
    FED_LTCG_BRACKETS,
  );

  // NIIT: 3.8% × min(NII, max(0, MAGI − threshold)).
  // With no W-2 income, NII = MAGI = total investment income.
  const totalInvestmentIncomeCents = fedOrdinaryIncomeCents + fedPreferentialCents;
  const niitBaseCents = Math.max(0, totalInvestmentIncomeCents - NIIT_THRESHOLD);
  const federalNiitCents = Math.round(niitBaseCents * NIIT_RATE);

  const federalTotalCents = federalOrdinaryTaxCents + federalLtcgTaxCents + federalNiitCents;

  // ── California ────────────────────────────────────────────────────────────
  // CA taxes all investment income at ordinary rates — no preferential LTCG rate.

  const caAllIncomeCents =
    ordinaryDividendsCents + qualifiedDividendsCents + interestCents + ltcgCents + stcgCents;
  const caTaxableIncomeCents = Math.max(0, caAllIncomeCents - CA_STANDARD_DEDUCTION);
  const caTaxCents = applyBrackets(caTaxableIncomeCents, CA_BRACKETS);

  return {
    qualifiedDividendsCents,
    ordinaryDividendsCents,
    interestCents,
    ltcgCents,
    stcgCents,
    federalStandardDeductionCents: FED_STANDARD_DEDUCTION,
    federalTaxableOrdinaryCents,
    federalOrdinaryTaxCents,
    federalLtcgTaxCents,
    federalNiitCents,
    federalTotalCents,
    caStandardDeductionCents: CA_STANDARD_DEDUCTION,
    caTaxableIncomeCents,
    caTaxCents,
    totalTaxCents: federalTotalCents + caTaxCents,
  };
}
