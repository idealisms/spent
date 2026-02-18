import { ITransaction } from './model';

/**
 * Returns tag suggestions for `target` by finding the most recent past
 * transaction with the same description (case-insensitive) that already
 * has tags. `allTransactions` must be sorted newest-first.
 *
 * Returns an empty array if no matching history is found.
 */
export function suggestTags(
  allTransactions: ITransaction[],
  target: ITransaction
): string[] {
  const normalizedTarget = target.description.trim().toLowerCase();
  for (const t of allTransactions) {
    if (t.id === target.id) { continue; }
    if (t.tags.length === 0) { continue; }
    if (t.description.trim().toLowerCase() === normalizedTarget) {
      return [...t.tags];
    }
  }
  return [];
}
