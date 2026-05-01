import { CloudState } from '../main/model';

export interface ICategoryDefinition {
  emoji: string;
  tags: string[];
}

export const DEFAULT_CATEGORIES: Record<string, ICategoryDefinition> = {
  Bank: { emoji: '🏦', tags: ['bank transfer', 'credit card'] },
  Car: { emoji: '🚗', tags: ['car'] },
  Cash: { emoji: '🏧', tags: ['atm'] },
  Child: { emoji: '👨‍👩‍👧', tags: ['child'] },
  Clothes: { emoji: '👚', tags: ['clothes', 'dry cleaner', 'shoes'] },
  Entertainment: {
    emoji: '🎟️',
    tags: ['bike', 'books', 'entertainment', 'netflix', 'fitness'],
  },
  Gift: { emoji: '🎁', tags: ['gift', 'donation'] },
  Grocery: { emoji: '🛒', tags: ['grocery'] },
  Home: { emoji: '🏠', tags: ['hoa', 'mortgage'] },
  HomeImprovement: { emoji: '🛠️', tags: ['home improvement'] },
  HomeAndElectronics: {
    emoji: '🛍️',
    tags: [
      'art supplies',
      'art',
      'electronics',
      'flowers',
      'furniture',
      'household goods',
      'printing',
      'plants',
      'shipping',
    ],
  },
  Income: {
    emoji: '🤑',
    tags: [
      'credit card reward',
      'dividend',
      'income',
      'interest',
      'paycheck',
      'settlement',
    ],
  },
  Insurance: {
    emoji: '🛡️',
    tags: ['dental', 'health', 'homeowners', 'jewelry', 'umbrella', 'vision'],
  },
  Medical: { emoji: '👩‍⚕️', tags: ['medical'] },
  PersonalCare: { emoji: '💆‍', tags: ['personal care'] },
  RecurringExpenses: {
    emoji: '🔁',
    tags: ['utility', 'phone service', 'internet'],
  },
  Restaurant: { emoji: '🍽', tags: ['restaurant'] },
  Taxes: { emoji: '💸', tags: ['taxes'] },
  Transit: { emoji: '🚇', tags: ['transit', 'taxi'] },
  TravelExpenses: {
    emoji: '🛫',
    tags: ['churning', 'flight', 'lodging', 'rail'],
  },
  Vitamins: { emoji: '💊', tags: ['vitamins'] },
  Other: { emoji: '❓', tags: [] },
};

export interface ITransaction {
  id: string;
  description: string;
  original_line: string;
  date: string;
  tags: Array<string>;
  amount_cents: number;
  transactions: Array<ITransaction>;
  source?: string;
  notes?: string;
  deleted?: true;
}

export interface ITransactionsState {
  /** ms since the epoch */
  lastUpdated: number;
  cloudState: CloudState;

  transactions: ITransaction[];
}
