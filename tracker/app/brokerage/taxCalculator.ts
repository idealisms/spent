import { IBracketInfo, IBrokerageTransaction, IQualifiedConfig, ITaxSummary } from './model';

// ── 2026 Tax Year Constants (Married Filing Jointly) ──────────────────────────

const c = (dollars: number) => Math.round(dollars * 100); // dollars → cents

// Federal ordinary income brackets (MFJ 2026) — IRS Rev. Proc. 2025-xx
const FED_ORDINARY_BRACKETS = [
  { min: c(0),        max: c(24_800),   rate: 0.10 },
  { min: c(24_800),   max: c(100_800),  rate: 0.12 },
  { min: c(100_800),  max: c(211_400),  rate: 0.22 },
  { min: c(211_400),  max: c(403_550),  rate: 0.24 },
  { min: c(403_550),  max: c(512_450),  rate: 0.32 },
  { min: c(512_450),  max: c(768_700),  rate: 0.35 },
  { min: c(768_700),  max: Infinity,    rate: 0.37 },
];

// Federal LTCG / qualified-dividend brackets (MFJ 2026)
const FED_LTCG_BRACKETS = [
  { min: c(0),        max: c(98_900),   rate: 0.00 },
  { min: c(98_900),   max: c(613_700),  rate: 0.15 },
  { min: c(613_700),  max: Infinity,    rate: 0.20 },
];

const FED_STANDARD_DEDUCTION = c(32_200);

// Net Investment Income Tax: 3.8% on NII above $250k (MFJ, not inflation-adjusted)
const NIIT_THRESHOLD = c(250_000);
const NIIT_RATE = 0.038;

// California ordinary income brackets (MFJ 2025 — 2026 brackets not yet published by FTB)
// Above $1M the 1% Mental Health Services Tax surcharge applies, so the effective rates
// for the top two segments are 12.3% ($1M–$1,485,906) and 13.3% (above $1,485,906).
const CA_BRACKETS = [
  { min: c(0),           max: c(22_158),    rate: 0.010 },
  { min: c(22_158),      max: c(52_528),    rate: 0.020 },
  { min: c(52_528),      max: c(82_904),    rate: 0.040 },
  { min: c(82_904),      max: c(115_084),   rate: 0.060 },
  { min: c(115_084),     max: c(145_448),   rate: 0.080 },
  { min: c(145_448),     max: c(742_958),   rate: 0.093 },
  { min: c(742_958),     max: c(891_542),   rate: 0.103 },
  { min: c(891_542),     max: c(1_000_000), rate: 0.113 },
  { min: c(1_000_000),   max: c(1_485_906), rate: 0.123 },
  { min: c(1_485_906),   max: Infinity,     rate: 0.133 },
];

const CA_STANDARD_DEDUCTION = c(11_412);

// ── Bracket helpers ───────────────────────────────────────────────────────────

interface IBracket { min: number; max: number; rate: number; }

// Returns the current bracket rate and how much room is left before the next bracket.
// For LTCG with stacking, pass the combined (ordinary + LTCG) position as `position`.
function getBracketInfo(position: number, brackets: IBracket[]): IBracketInfo {
  for (let i = 0; i < brackets.length; i++) {
    if (position < brackets[i].max || i === brackets.length - 1) {
      const next = i < brackets.length - 1 ? brackets[i + 1] : null;
      return {
        currentRate: brackets[i].rate,
        nextRate: next ? next.rate : null,
        roomCents: next ? Math.max(0, next.min - position) : null,
      };
    }
  }
  const last = brackets[brackets.length - 1];
  return { currentRate: last.rate, nextRate: null, roomCents: null };
}

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

  const federalOrdinaryBracket = getBracketInfo(federalTaxableOrdinaryCents, FED_ORDINARY_BRACKETS);
  // LTCG stacks on top of ordinary taxable income when finding the applicable bracket.
  const federalLtcgBracket = getBracketInfo(
    federalTaxableOrdinaryCents + fedPreferentialCents,
    FED_LTCG_BRACKETS,
  );

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
    federalOrdinaryBracket,
    federalLtcgBracket,
    caStandardDeductionCents: CA_STANDARD_DEDUCTION,
    caTaxableIncomeCents,
    caTaxCents,
    totalTaxCents: federalTotalCents + caTaxCents,
  };
}
