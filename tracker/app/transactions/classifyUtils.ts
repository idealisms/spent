import { ITransaction } from './model';

export const EDIT_DISTANCE_THRESHOLD = 6;

/** Space-optimized Levenshtein distance (O(min(m,n)) space). */
export function editDistance(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const row: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = row[j];
      row[j] =
        a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = temp;
    }
  }
  return row[n];
}

/** Weight of a match at a given edit distance: halves per step (1, .5, .25, ...). */
export function distanceWeight(distance: number): number {
  return Math.pow(2, -distance);
}

/**
 * Returns tag suggestions for `target` using fuzzy matching + weighted majority vote.
 * - Collects all tagged historical transactions within `threshold` edit distance.
 * - Each match is weighted by `distanceWeight(distance)`, so closer matches (an
 *   exact match has distance 0) count far more than loose ones near the threshold.
 * - Returns tags whose total weight is ≥51% of the summed match weight, sorted
 *   alphabetically.
 * - `allTransactions` order does not matter (no longer first-match).
 */
export function suggestTags(
  allTransactions: ITransaction[],
  target: ITransaction,
  threshold = EDIT_DISTANCE_THRESHOLD,
): string[] {
  const normalizedTarget = target.description.trim().toLowerCase();
  const matches: Array<{ transaction: ITransaction; weight: number }> = [];
  for (const t of allTransactions) {
    if (t.id === target.id) {
      continue;
    }
    if (t.tags.length === 0) {
      continue;
    }
    const distance = editDistance(
      normalizedTarget,
      t.description.trim().toLowerCase(),
    );
    if (distance <= threshold) {
      matches.push({ transaction: t, weight: distanceWeight(distance) });
    }
  }
  if (matches.length === 0) {
    return [];
  }
  const tagWeight = new Map<string, number>();
  let totalWeight = 0;
  for (const { transaction, weight } of matches) {
    totalWeight += weight;
    for (const tag of transaction.tags) {
      tagWeight.set(tag, (tagWeight.get(tag) ?? 0) + weight);
    }
  }
  const minWeight = totalWeight * 0.51;
  return [...tagWeight.entries()]
    .filter(([, weight]) => weight >= minWeight)
    .map(([tag]) => tag)
    .sort();
}
