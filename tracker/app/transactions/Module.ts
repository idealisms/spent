import { ITransaction } from './Model';

export const DAILY_EXCLUDE_TAGS = new Set([
  'bank transfer',
  'credit card',
  'exclude',
  'hoa',
  'home sale',
  'insurance',
  'investment',
  'medical',
  'mortgage',
  'netflix',
  'new house',
  'paycheck',
  'phone service',
  'rent',
  'settlement',
  'stock',
  'taxes',
  'utility',
]);

// TODO: Move these functions into a util file.
export function shouldExclude(transaction: ITransaction, excludeTags: Set<string>): boolean {
  for (let tag of transaction.tags) {
    if (excludeTags.has(tag)) {
      return true;
    }
  }
  return false;
}

export function formatAmount(transaction: ITransaction): string {
  let amountCentsNumber = transaction.amount_cents;
  let isNegative = amountCentsNumber < 0;
  let amountCents = Math.abs(amountCentsNumber).toString();
  let digits = amountCents.length;
  let dollars = amountCents.substr(0, digits - 2);
  let numCommas = parseInt(
      ((dollars.length - 1) / 3).toString(), 10);
  for (let c = numCommas * 3; c > 0; c -= 3) {
      dollars = dollars.substr(0, dollars.length - c) + ',' +
          dollars.substr(dollars.length - c);
  }
  let amount = dollars + '.' + amountCents.substr(digits - 2);
  if (isNegative) {
      amount = '(' + amount + ')';
  }
  return amount;
}
