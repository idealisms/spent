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
