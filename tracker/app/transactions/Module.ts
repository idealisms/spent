import { ITransaction } from './Model';

const EXCLUDE_TAGS = [
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
];

export function shouldExclude(transaction: ITransaction): boolean {
  for (let tag of transaction.tags) {
    if (EXCLUDE_TAGS.indexOf(tag) !== -1) {
      return true;
    }
  }
  return false;
}
