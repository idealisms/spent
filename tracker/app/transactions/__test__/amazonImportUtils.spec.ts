import { ITransaction } from '../model';
import {
  daysDiff,
  extractNote,
  matchCsvRow,
  parseCsv,
  parseField,
  parsePayment,
  parseRow,
} from '../amazonImportUtils';

function makeTxn(
  overrides: Partial<ITransaction> & { id: string },
): ITransaction {
  return {
    description: 'AMAZON.COM',
    original_line: '',
    date: '2024-01-01',
    tags: [],
    amount_cents: 1000,
    transactions: [],
    ...overrides,
  };
}

// --- parseField ---

describe('parseField', () => {
  it('parses a plain unquoted field', () => {
    expect(parseField('hello,world', 0)).toEqual(['hello', 6]);
  });

  it('parses the last field with no trailing comma', () => {
    expect(parseField('hello,world', 6)).toEqual(['world', 12]);
  });

  it('parses a quoted field', () => {
    expect(parseField('"hello world",next', 0)).toEqual(['hello world', 14]);
  });

  it('handles escaped double-quotes inside a quoted field', () => {
    expect(parseField('"say ""hi""",next', 0)).toEqual(['say "hi"', 13]);
  });

  it('parses an empty unquoted field', () => {
    expect(parseField(',next', 0)).toEqual(['', 1]);
  });
});

// --- parseRow ---

describe('parseRow', () => {
  it('splits a simple row', () => {
    expect(parseRow('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('handles quoted fields with commas inside', () => {
    expect(parseRow('"a,b",c')).toEqual(['a,b', 'c']);
  });

  it('handles a single-field row', () => {
    expect(parseRow('only')).toEqual(['only']);
  });

  it('preserves empty fields', () => {
    expect(parseRow('a,,c')).toEqual(['a', '', 'c']);
  });
});

// --- parseCsv ---

describe('parseCsv', () => {
  it('returns empty array for fewer than 2 lines', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('header only')).toEqual([]);
  });

  it('maps rows to header-keyed objects', () => {
    const result = parseCsv('name,amount\nfoo,42');
    expect(result).toEqual([{ name: 'foo', amount: '42' }]);
  });

  it('strips a leading UTF-8 BOM', () => {
    const result = parseCsv('\uFEFFname,amount\nbar,10');
    expect(result).toEqual([{ name: 'bar', amount: '10' }]);
  });

  it('normalizes Windows line endings (CRLF)', () => {
    const result = parseCsv('name,amount\r\nbaz,99\r\n');
    expect(result).toEqual([{ name: 'baz', amount: '99' }]);
  });

  it('trims header whitespace', () => {
    const result = parseCsv(' name , amount \nfoo,5');
    expect(result).toEqual([{ name: 'foo', amount: '5' }]);
  });

  it('handles multiple data rows', () => {
    const result = parseCsv('a,b\n1,2\n3,4');
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ a: '3', b: '4' });
  });

  it('fills missing fields with empty string', () => {
    const result = parseCsv('a,b,c\n1,2');
    expect(result[0].c).toBe('');
  });
});

// --- parsePayment ---

describe('parsePayment', () => {
  it('parses a standard card payment entry', () => {
    const result = parsePayment('Visa: 2024-01-15: $45.99', '', '');
    expect(result).toEqual({ date: '2024-01-15', amountCents: 4599 });
  });

  it('returns the first valid entry when multiple are present', () => {
    const result = parsePayment(
      'Visa: 2024-01-15: $10.00; Mastercard: 2024-01-20: $5.00',
      '',
      '',
    );
    expect(result).toEqual({ date: '2024-01-15', amountCents: 1000 });
  });

  it('parses amounts with comma separators', () => {
    const result = parsePayment('Visa: 2024-03-01: $1,234.56', '', '');
    expect(result).toEqual({ date: '2024-03-01', amountCents: 123456 });
  });

  it('falls back to order date + total for gift-card-only payments', () => {
    const result = parsePayment('Gift Card: 2024-02-01: $0.00', '2024-02-01', '29.99');
    expect(result).toEqual({ date: '2024-02-01', amountCents: 2999 });
  });

  it('returns null when no valid payment and no fallback', () => {
    expect(parsePayment('', '', '')).toBeNull();
  });

  it('skips entries with zero amount', () => {
    const result = parsePayment('Visa: 2024-01-01: $0.00', '2024-01-01', '9.99');
    expect(result).toEqual({ date: '2024-01-01', amountCents: 999 });
  });

  it('skips entries with an invalid date format', () => {
    const result = parsePayment('Visa: Jan 15: $10.00', '2024-01-15', '10.00');
    expect(result).toEqual({ date: '2024-01-15', amountCents: 1000 });
  });

  it('rounds fractional cents correctly', () => {
    const result = parsePayment('Visa: 2024-01-01: $9.999', '', '');
    expect(result).toEqual({ date: '2024-01-01', amountCents: 1000 });
  });
});

// --- extractNote ---

describe('extractNote', () => {
  it('returns the first item when there is only one', () => {
    expect(extractNote('Widget A')).toBe('Widget A');
  });

  it('returns only the first item from a semicolon-separated list', () => {
    expect(extractNote('Widget A; Widget B; Widget C')).toBe('Widget A');
  });

  it('trims whitespace around the first item', () => {
    expect(extractNote('  Widget A  ; Widget B')).toBe('Widget A');
  });

  it('returns a string of exactly 80 chars unchanged', () => {
    const s = 'a'.repeat(80);
    expect(extractNote(s)).toBe(s);
  });

  it('truncates strings longer than 80 chars with ellipsis', () => {
    const s = 'a'.repeat(81);
    const result = extractNote(s);
    expect(result).toHaveLength(80);
    expect(result.endsWith('...')).toBe(true);
  });
});

// --- daysDiff ---

describe('daysDiff', () => {
  it('returns 0 for the same date', () => {
    expect(daysDiff('2024-01-01', '2024-01-01')).toBe(0);
  });

  it('returns 1 for consecutive days', () => {
    expect(daysDiff('2024-01-01', '2024-01-02')).toBe(1);
  });

  it('returns a negative value when toDate is before fromDate', () => {
    expect(daysDiff('2024-01-10', '2024-01-01')).toBe(-9);
  });

  it('handles month boundaries', () => {
    expect(daysDiff('2024-01-31', '2024-02-01')).toBe(1);
  });
});

// --- matchCsvRow ---

describe('matchCsvRow', () => {
  const csvRow = { items: 'Widget', paymentDate: '2024-01-01', amountCents: 5000 };

  it('matches a single transaction on the same day', () => {
    const txn = makeTxn({ id: 't1', date: '2024-01-01', amount_cents: 5000 });
    expect(matchCsvRow(csvRow, [txn])).toEqual([txn]);
  });

  it('matches a single transaction 7 days after payment date', () => {
    const txn = makeTxn({ id: 't1', date: '2024-01-08', amount_cents: 5000 });
    expect(matchCsvRow(csvRow, [txn])).toEqual([txn]);
  });

  it('does not match a transaction 8 days after payment date', () => {
    const txn = makeTxn({ id: 't1', date: '2024-01-09', amount_cents: 5000 });
    expect(matchCsvRow(csvRow, [txn])).toBeNull();
  });

  it('does not match a transaction before the payment date', () => {
    const txn = makeTxn({ id: 't1', date: '2023-12-31', amount_cents: 5000 });
    expect(matchCsvRow(csvRow, [txn])).toBeNull();
  });

  it('matches within 1-cent tolerance', () => {
    const txn = makeTxn({ id: 't1', date: '2024-01-03', amount_cents: 5001 });
    expect(matchCsvRow(csvRow, [txn])).toEqual([txn]);
  });

  it('does not match when amount differs by more than 1 cent', () => {
    const txn = makeTxn({ id: 't1', date: '2024-01-03', amount_cents: 5002 });
    expect(matchCsvRow(csvRow, [txn])).toBeNull();
  });

  it('matches a split shipment: two transactions summing to CSV amount within 14 days', () => {
    const t1 = makeTxn({ id: 't1', date: '2024-01-08', amount_cents: 3000 });
    const t2 = makeTxn({ id: 't2', date: '2024-01-14', amount_cents: 2000 });
    expect(matchCsvRow(csvRow, [t1, t2])).toEqual([t1, t2]);
  });

  it('does not split-match when one transaction is 15 days out', () => {
    const t1 = makeTxn({ id: 't1', date: '2024-01-08', amount_cents: 3000 });
    const t2 = makeTxn({ id: 't2', date: '2024-01-16', amount_cents: 2000 });
    expect(matchCsvRow(csvRow, [t1, t2])).toBeNull();
  });

  it('prefers single match over split when both would work', () => {
    const exact = makeTxn({ id: 'exact', date: '2024-01-02', amount_cents: 5000 });
    const t1 = makeTxn({ id: 't1', date: '2024-01-05', amount_cents: 3000 });
    const t2 = makeTxn({ id: 't2', date: '2024-01-10', amount_cents: 2000 });
    const result = matchCsvRow(csvRow, [exact, t1, t2]);
    expect(result).toEqual([exact]);
  });

  it('returns null when no transactions are provided', () => {
    expect(matchCsvRow(csvRow, [])).toBeNull();
  });
});
