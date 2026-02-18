import { ITransaction } from './model';

export const EDIT_DISTANCE_THRESHOLD = 6;

/** Space-optimized Levenshtein distance (O(min(m,n)) space). */
export function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const row: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = row[j];
      row[j] = a[i - 1] === b[j - 1]
        ? prev
        : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = temp;
    }
  }
  return row[n];
}

/**
 * Returns tag suggestions for `target` using fuzzy matching + majority vote.
 * - Collects all tagged historical transactions within `threshold` edit distance.
 * - Returns tags that appear in ≥51% of those matches, sorted alphabetically.
 * - `allTransactions` order does not matter (no longer first-match).
 */
export function suggestTags(
  allTransactions: ITransaction[],
  target: ITransaction,
  threshold = EDIT_DISTANCE_THRESHOLD
): string[] {
  const normalizedTarget = target.description.trim().toLowerCase();
  const matches: ITransaction[] = [];
  for (const t of allTransactions) {
    if (t.id === target.id) { continue; }
    if (t.tags.length === 0) { continue; }
    if (editDistance(normalizedTarget, t.description.trim().toLowerCase()) <= threshold) {
      matches.push(t);
    }
  }
  if (matches.length === 0) { return []; }
  const tagFreq = new Map<string, number>();
  for (const t of matches) {
    for (const tag of t.tags) {
      tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
    }
  }
  const minCount = matches.length * 0.51;
  return [...tagFreq.entries()]
    .filter(([, count]) => count >= minCount)
    .map(([tag]) => tag)
    .sort();
}
