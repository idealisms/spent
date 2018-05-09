export enum Category {
  Car,
  Cash,
  Clothes,
  Entertainment,
  Food,
  Gift,
  HomeImprovement,
  HomeAndElectronics,
  Medical,
  PersonalCare,
  RecurringExpenses,
  Transit,
  TravelExpenses,

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
  // notes?: string;  // TODO
}
