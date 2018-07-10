export enum Category {
  Car,
  Cash,
  Clothes,
  Entertainment,
  Gift,
  Grocery,
  HomeImprovement,
  HomeAndElectronics,
  Income,
  Medical,
  PersonalCare,
  RecurringExpenses,
  Restaurant,
  Transit,
  TravelExpenses,
  Vitamins,

  Other,
}

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
}

export const EMPTY_TRANSACTION: ITransaction = {
  id: '',
  description: '',
  original_line: '',
  date: '',
  tags: [],
  amount_cents: 0,
  transactions: [],
};
