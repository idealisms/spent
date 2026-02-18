import { ITransaction } from '../model';
import { suggestTags } from '../classifyUtils';

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

describe('suggestTags', () => {
  it('returns tags from the most recent matching transaction', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOODS', tags: ['grocery'], date: '2024-03-01' }),
      makeTransaction({ id: 'b', description: 'WHOLE FOODS', tags: ['food'], date: '2024-01-01' }),
    ];
    expect(suggestTags(history, TARGET)).toEqual(['grocery']);
  });

  it('matches case-insensitively', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'whole foods', tags: ['grocery'] }),
    ];
    expect(suggestTags(history, TARGET)).toEqual(['grocery']);
  });

  it('ignores leading/trailing whitespace in descriptions', () => {
    const history = [
      makeTransaction({ id: 'a', description: '  WHOLE FOODS  ', tags: ['grocery'] }),
    ];
    expect(suggestTags(history, TARGET)).toEqual(['grocery']);
  });

  it('skips the target transaction itself', () => {
    const history = [TARGET];
    expect(suggestTags(history, TARGET)).toEqual([]);
  });

  it('skips past transactions with no tags', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOODS', tags: [] }),
    ];
    expect(suggestTags(history, TARGET)).toEqual([]);
  });

  it('returns empty array when no matching history exists', () => {
    const history = [
      makeTransaction({ id: 'a', description: 'AMAZON', tags: ['household goods'] }),
    ];
    expect(suggestTags(history, TARGET)).toEqual([]);
  });

  it('returns empty array for empty history', () => {
    expect(suggestTags([], TARGET)).toEqual([]);
  });

  it('does not mutate the source tags array', () => {
    const sourceTags = ['grocery'];
    const history = [
      makeTransaction({ id: 'a', description: 'WHOLE FOODS', tags: sourceTags }),
    ];
    const result = suggestTags(history, TARGET);
    result.push('mutated');
    expect(sourceTags).toEqual(['grocery']);
  });
});
