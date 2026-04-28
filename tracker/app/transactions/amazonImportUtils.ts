import { ITransaction } from './model';

export interface ICsvRow {
  items: string;
  paymentDate: string;
  amountCents: number;
}

export function parseField(row: string, start: number): [string, number] {
  if (row[start] === '"') {
    let field = '';
    let i = start + 1;
    while (i < row.length) {
      if (row[i] === '"' && row[i + 1] === '"') {
        field += '"';
        i += 2;
      } else if (row[i] === '"') {
        return [field, i + 2]; // skip closing quote + comma
      } else {
        field += row[i++];
      }
    }
    return [field, i];
  }
  const end = row.indexOf(',', start);
  if (end === -1) {return [row.slice(start), row.length + 1];}
  return [row.slice(start, end), end + 1];
}

export function parseRow(row: string): string[] {
  const fields: string[] = [];
  let pos = 0;
  while (pos <= row.length) {
    const [field, next] = parseField(row, pos);
    fields.push(field);
    if (next > row.length) {break;}
    pos = next;
  }
  return fields;
}

export function parseCsv(text: string): Record<string, string>[] {
  // Strip BOM and normalize line endings
  const lines = text
    .replace(/^﻿/, '')
    .split('\n')
    .map(l => l.replace(/\r$/, ''))
    .filter(Boolean);
  if (lines.length < 2) {return [];}
  const headers = parseRow(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? '';
    });
    return obj;
  });
}

// Parses "Card Name: YYYY-MM-DD: $amount; ..." format.
// Falls back to order date + total for gift-card-only payments.
export function parsePayment(
  paymentsStr: string,
  orderDate: string,
  totalStr: string,
): { date: string; amountCents: number } | null {
  for (const entry of paymentsStr
    .split(';')
    .map(e => e.trim())
    .filter(Boolean)) {
    const parts = entry.split(':').map(p => p.trim());
    if (parts.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])) {
      const amount = parseFloat(parts[2].replace(/,/g, '').replace('$', ''));
      if (!isNaN(amount) && amount > 0) {
        return { date: parts[1], amountCents: Math.round(amount * 100) };
      }
    }
  }
  // Gift card fallback: use order date + total
  const total = parseFloat(totalStr.replace(/,/g, ''));
  if (!isNaN(total) && total > 0 && orderDate) {
    return { date: orderDate, amountCents: Math.round(total * 100) };
  }
  return null;
}

export function extractNote(items: string): string {
  const first = items.split(';')[0].trim();
  return first.length > 80 ? first.slice(0, 77) + '...' : first;
}

export function daysDiff(fromDate: string, toDate: string): number {
  return (
    (new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000
  );
}

// Charge date is 0-7 days after CSV payment/order date (items ship after order).
// For split shipments, try pairs of transactions summing to the CSV amount within 14 days.
export function matchCsvRow(
  csvRow: ICsvRow,
  txns: ITransaction[],
): ITransaction[] | null {
  const TOL = 1;
  const near = txns.filter(t => {
    const d = daysDiff(csvRow.paymentDate, t.date);
    return d >= 0 && d <= 7;
  });
  const single = near.find(
    t => Math.abs(t.amount_cents - csvRow.amountCents) <= TOL,
  );
  if (single) {return [single];}

  const wide = txns.filter(t => {
    const d = daysDiff(csvRow.paymentDate, t.date);
    return d >= 0 && d <= 14;
  });
  for (let i = 0; i < wide.length; i++) {
    for (let j = i + 1; j < wide.length; j++) {
      if (
        Math.abs(
          wide[i].amount_cents + wide[j].amount_cents - csvRow.amountCents,
        ) <= TOL
      ) {
        return [wide[i], wide[j]];
      }
    }
  }
  return null;
}
