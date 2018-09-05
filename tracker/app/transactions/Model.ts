export enum Category {
  Bank,
  Car,
  Cash,
  Clothes,
  Entertainment,
  Gift,
  Grocery,
  Home,
  HomeImprovement,
  HomeAndElectronics,
  Income,
  Insurance,
  Medical,
  PersonalCare,
  RecurringExpenses,
  Restaurant,
  Taxes,
  Transit,
  TravelExpenses,
  Vitamins,

  Other,
}

export const TAG_TO_CATEGORY: { [s: string]: Category; } = {
  'bank transfer': Category.Bank,
  'credit card': Category.Bank,
  'car': Category.Car,
  'atm': Category.Cash,
  'clothes': Category.Clothes,
  'dry cleaner': Category.Clothes,
  'shoes': Category.Clothes,
  'books': Category.Entertainment,
  'entertainment': Category.Entertainment,
  'gift': Category.Gift,
  'donation': Category.Gift,
  'grocery': Category.Grocery,
  'hoa': Category.Home,
  'mortgage': Category.Home,
  'home improvement': Category.HomeImprovement,
  'art supplies': Category.HomeAndElectronics,
  'art': Category.HomeAndElectronics,
  'electronics': Category.HomeAndElectronics,
  'flowers': Category.HomeAndElectronics,
  'furniture': Category.HomeAndElectronics,
  'household goods': Category.HomeAndElectronics,
  'printing': Category.HomeAndElectronics,  // Or maybe RecurringExpenses renamed as ServiceFee?
  'plants': Category.HomeAndElectronics,
  'credit card reward': Category.Income,
  'dividend': Category.Income,
  'income': Category.Income,
  'interest': Category.Income,
  'insurance': Category.Insurance,
  'medical': Category.Medical,
  'personal care': Category.PersonalCare,
  'utility': Category.RecurringExpenses,
  'phone service': Category.RecurringExpenses,
  'internet': Category.RecurringExpenses,
  'membership fee': Category.RecurringExpenses,
  'restaurant': Category.Restaurant,
  'taxes': Category.Taxes,
  'transit': Category.Transit,
  'taxi': Category.Transit,
  'flight': Category.TravelExpenses,
  'lodging': Category.TravelExpenses,
  'rail': Category.TravelExpenses,
  'vitamins': Category.Vitamins,
};

export const DAILY_EXCLUDE_TAGS = new Set([
  'bank transfer',
  'credit card',
  'domain name',
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
