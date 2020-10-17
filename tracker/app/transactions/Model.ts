import { CloudState } from '../main/Model';

// If this were to move into Settings, we would need to also
// move the mappings to emoji.
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

// TODO: Move into settings.
export const TAG_TO_CATEGORY: Map<string, Category> = new Map([
  ['bank transfer', Category.Bank],
  ['credit card', Category.Bank],
  ['car', Category.Car],
  ['atm', Category.Cash],
  ['clothes', Category.Clothes],
  ['dry cleaner', Category.Clothes],
  ['shoes', Category.Clothes],
  ['bike', Category.Entertainment],
  ['books', Category.Entertainment],
  ['entertainment', Category.Entertainment],
  ['netflix', Category.Entertainment],
  ['fitness', Category.Entertainment],
  ['gift', Category.Gift],
  ['donation', Category.Gift],
  ['grocery', Category.Grocery],
  ['hoa', Category.Home],
  ['mortgage', Category.Home],
  ['home improvement', Category.HomeImprovement],
  ['art supplies', Category.HomeAndElectronics],
  ['art', Category.HomeAndElectronics],
  ['electronics', Category.HomeAndElectronics],
  ['flowers', Category.HomeAndElectronics],
  ['furniture', Category.HomeAndElectronics],
  ['household goods', Category.HomeAndElectronics],
  ['printing', Category.HomeAndElectronics], // Or maybe RecurringExpenses renamed as ServiceFee?
  ['plants', Category.HomeAndElectronics],
  ['shipping', Category.HomeAndElectronics], // Or maybe RecurringExpenses renamed as ServiceFee?
  ['credit card reward', Category.Income],
  ['dividend', Category.Income],
  ['income', Category.Income],
  ['interest', Category.Income],
  ['paycheck', Category.Income],
  ['settlement', Category.Income],
  ['dental', Category.Insurance],
  ['health', Category.Insurance],
  ['homeowners', Category.Insurance],
  ['jewelry', Category.Insurance],
  ['umbrella', Category.Insurance],
  ['vision', Category.Insurance],
  ['medical', Category.Medical],
  ['personal care', Category.PersonalCare],
  ['utility', Category.RecurringExpenses],
  ['phone service', Category.RecurringExpenses],
  ['internet', Category.RecurringExpenses],
  ['restaurant', Category.Restaurant],
  ['taxes', Category.Taxes],
  ['transit', Category.Transit],
  ['taxi', Category.Transit],
  ['churning', Category.TravelExpenses],
  ['flight', Category.TravelExpenses],
  ['lodging', Category.TravelExpenses],
  ['rail', Category.TravelExpenses],
  ['vitamins', Category.Vitamins],
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

export interface ITransactionsState {
  /** ms since the epoch */
  lastUpdated: number;
  cloudState: CloudState;

  transactions: ITransaction[];
}
