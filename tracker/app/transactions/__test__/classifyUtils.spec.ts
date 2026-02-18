import { ITransaction } from '../model';
import { editDistance, suggestTags } from '../classifyUtils';

function makeTransaction(
  overrides: Partial<ITransaction> & { id: string }
): ITransaction {
  return {
    description: '',
    original_line: '',
    date: '2024-01-01',
    tags: [],
    amount_cents: 100,
    transactions: [],
    ...overrides,
  };
}

const TARGET = makeTransaction({ id: 'target', description: 'WHOLE FOODS' });

describe('editDistance', () => {
  it('returns 0 for two empty strings', () => {
    expect(editDistance('', '')).toBe(0);
  });

  it('returns 0 for identical strings', () => {
    expect(editDistance('abc', 'abc')).toBe(0);
  });

  it('returns 1 for a single substitution', () => {
    expect(editDistance('abc', 'axc')).toBe(1);
  });

  it('returns 1 for a single deletion', () => {
    expect(editDistance('abc', 'ac')).toBe(1);
  });

  it('returns 1 for a single insertion', () => {
    expect(editDistance('ac', 'abc')).toBe(1);
  });

  it('handles the classic kitten/sitting example', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });
});

describe('suggestTags', () => {
  it('returns tag from a single exact-matching transaction (threshold=0)', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOODS', tags: ['grocery'] }),
    ];
    expect(suggestTags(history, TARGET, 0)).toEqual(['grocery']);
  });

  it('matches a near-match within threshold (threshold=1)', () => {
    // 'WHOLE FOOD' is 1 edit away from 'WHOLE FOODS'
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOOD', tags: ['grocery'] }),
    ];
    expect(suggestTags(history, TARGET, 1)).toEqual(['grocery']);
  });

  it('does not match beyond threshold (threshold=1)', () => {
    // 'WHOLE FOO' is 2 edits away from 'WHOLE FOODS'
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOO', tags: ['grocery'] }),
    ];
    expect(suggestTags(history, TARGET, 1)).toEqual([]);
  });

  it('majority vote: tag in 2 of 2 matches is returned', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOODS', tags: ['grocery'] }),
      makeTransaction({ id: 'b', description: 'WHOLE FOODS', tags: ['grocery'] }),
    ];
    expect(suggestTags(history, TARGET, 0)).toEqual(['grocery']);
  });

  it('majority vote: tag in 1 of 2 matches is not returned (< 51%)', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOODS', tags: ['grocery'] }),
      makeTransaction({ id: 'b', description: 'WHOLE FOODS', tags: ['food'] }),
    ];
    expect(suggestTags(history, TARGET, 0)).toEqual([]);
  });

  it('majority vote: tag in 2 of 3 matches is returned (67% >= 51%)', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOODS', tags: ['grocery'] }),
      makeTransaction({ id: 'b', description: 'WHOLE FOODS', tags: ['grocery'] }),
      makeTransaction({ id: 'c', description: 'WHOLE FOODS', tags: ['food'] }),
    ];
    expect(suggestTags(history, TARGET, 0)).toEqual(['grocery']);
  });

  it('majority vote: tag in 1 of 3 matches is not returned', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOODS', tags: ['grocery'] }),
      makeTransaction({ id: 'b', description: 'WHOLE FOODS', tags: ['food'] }),
      makeTransaction({ id: 'c', description: 'WHOLE FOODS', tags: ['food'] }),
    ];
    expect(suggestTags(history, TARGET, 0)).toEqual(['food']);
  });

  it('matches case-insensitively', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'whole foods', tags: ['grocery'] }),
    ];
    expect(suggestTags(history, TARGET, 0)).toEqual(['grocery']);
  });

  it('ignores leading/trailing whitespace in descriptions', () => {
    const history = [
      makeTransaction({ id: 'a', description: '  WHOLE FOODS  ', tags: ['grocery'] }),
    ];
    expect(suggestTags(history, TARGET, 0)).toEqual(['grocery']);
  });

  it('skips the target transaction itself', () => {
    const history = [TARGET];
    expect(suggestTags(history, TARGET, 0)).toEqual([]);
  });

  it('skips past transactions with no tags', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOODS', tags: [] }),
    ];
    expect(suggestTags(history, TARGET, 0)).toEqual([]);
  });

  it('returns empty array when no match within threshold', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'AMAZON', tags: ['household goods'] }),
    ];
    expect(suggestTags(history, TARGET, 0)).toEqual([]);
  });

  it('returns empty array for empty history', () => {
    expect(suggestTags([], TARGET)).toEqual([]);
  });

  it('does not mutate the source tags array', () => {
    const sourceTags = ['grocery'];
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOODS', tags: sourceTags }),
    ];
    const result = suggestTags(history, TARGET, 0);
    result.push('mutated');
    expect(sourceTags).toEqual(['grocery']);
  });

  it('returns results sorted alphabetically', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOODS', tags: ['zebra', 'apple'] }),
      makeTransaction({ id: 'b', description: 'WHOLE FOODS', tags: ['zebra', 'apple'] }),
    ];
    expect(suggestTags(history, TARGET, 0)).toEqual(['apple', 'zebra']);
  });
});
