import { parseCsv } from '../transactions/amazonImportUtils';
import { BrokerageSource, IBrokerageTransaction, IncomeCategory } from './model';

function toYMD(s: string): string {
  s = s.trim();
  // M/D/YYYY or MM/DD/YYYY → YYYY-MM-DD
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseDollars(s: string): number {
  if (!s) return 0;
  const trimmed = s.trim();
  const neg = trimmed.startsWith('(') || trimmed.startsWith('-');
  const val = parseFloat(trimmed.replace(/[$,()]/g, '').replace(/^-/, ''));
  if (isNaN(val)) return 0;
  return neg ? -Math.round(val * 100) : Math.round(val * 100);
}

function makeTransaction(
  date: string,
  source: BrokerageSource,
  symbol: string,
  description: string,
  category: IncomeCategory,
  amountCents: number,
): IBrokerageTransaction {
  return { date, source, symbol, description, category, amountCents };
}

// Vanguard CSV has two sections in one file:
//   Section 1: holdings  (header: "Account Number,Investment Name,Symbol,...")
//   Section 2: transactions (header: "Account Number,Trade Date,...")
// We detect the transactions section by its header and parse only that.
//
// Vanguard sells are skipped — cost basis is not included in the export.
// Reinvestment rows are skipped — the corresponding Dividend row already
// records the taxable income; Reinvestment is just the share purchase.
export function parseVanguardCsv(text: string): IBrokerageTransaction[] {
  const lines = text
    .replace(/^﻿/, '')
    .split('\n')
    .map(l => l.replace(/\r$/, ''));

  const txHeaderIdx = lines.findIndex(l =>
    l.startsWith('Account Number,Trade Date'),
  );
  if (txHeaderIdx === -1) return [];

  const txSection = lines.slice(txHeaderIdx).filter(Boolean).join('\n');
  const rows = parseCsv(txSection);
  const result: IBrokerageTransaction[] = [];

  for (const row of rows) {
    const type = (row['Transaction Type'] || '').trim();
    const symbol = (row['Symbol'] || '').trim();
    const description = (row['Investment Name'] || '').trim();
    const date = toYMD(row['Trade Date'] || '');
    const amountCents = parseDollars(row['Net Amount'] || '');

    if (!isValidDate(date) || amountCents === 0) continue;

    let category: IncomeCategory;
    if (type === 'Dividend') {
      category = 'dividend';
    } else if (type === 'Interest') {
      category = 'interest';
    } else if (type === 'Sell') {
      // Cost basis not available in transaction CSV — skipped.
      // Capital gains from Vanguard fund sales must come from the 1099-B.
      continue;
    } else {
      // Buy, Reinvestment, Sweep in/out, Withdrawal, etc. — not taxable events
      continue;
    }

    result.push(makeTransaction(date, 'vanguard', symbol, description, category, amountCents));
  }

  return result;
}

// Schwab simple brokerage CSV.
// Sells are skipped — no cost basis in this export format.
export function parseSchwebCsv(text: string): IBrokerageTransaction[] {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const result: IBrokerageTransaction[] = [];

  for (const row of rows) {
    const dateStr = (row['Date'] || '').trim();
    if (!dateStr) continue;
    const date = toYMD(dateStr);
    if (!isValidDate(date)) continue; // skip totals/summary rows

    const action = (row['Action'] || '').trim().toLowerCase();
    const symbol = (row['Symbol'] || '').trim();
    const description = (row['Description'] || '').trim();
    const amountCents = parseDollars(row['Amount'] || '');

    if (amountCents === 0) continue;

    let category: IncomeCategory;
    if (
      action === 'div' ||
      action === 'cash div' ||
      action.includes('dividend')
    ) {
      category = 'dividend';
    } else if (action.includes('interest')) {
      category = 'interest';
    } else {
      // Buy, Sell (no basis), Wire, Journal, etc.
      continue;
    }

    result.push(makeTransaction(date, 'schwab', symbol, description, category, amountCents));
  }

  return result;
}

// Schwab equity awards CSV (RSU sales).
// Each row with a non-empty RealizedGainLoss is a capital gain/loss event.
// The vest-day ordinary income is already handled via W-2 — only the
// subsequent capital gain/loss is recorded here.
export function parseSchwebEquityCsv(text: string): IBrokerageTransaction[] {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const result: IBrokerageTransaction[] = [];

  for (const row of rows) {
    const gainStr = (row['RealizedGainLoss'] || '').trim();
    if (!gainStr || gainStr === 'N/A' || gainStr === '--') continue;

    const dateStr = (row['Date'] || '').trim();
    const date = toYMD(dateStr);
    if (!isValidDate(date)) continue;

    const symbol = (row['Symbol'] || '').trim();
    const description = (row['Description'] || '').trim();
    const gainCents = parseDollars(gainStr);
    if (gainCents === 0) continue;

    const holdingPeriod = (row['HoldingPeriod'] || '').trim().toLowerCase();
    const category: IncomeCategory = holdingPeriod.includes('long') ? 'ltcg' : 'stcg';

    result.push(makeTransaction(date, 'schwab_equity', symbol, description, category, gainCents));
  }

  return result;
}
