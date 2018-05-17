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
  'new house',
  'paycheck',
  'rent',
  'settlement',
  'stock',
  'taxes',
]);

export function shouldExclude(transaction: ITransaction, excludeTags: Set<string>): boolean {
  for (let tag of transaction.tags) {
    if (excludeTags.has(tag)) {
      return true;
    }
  }
  return false;
}
