import { ICategoryDefinition } from '../../transactions/model';
import {
  addCategory,
  addTag,
  deleteCategory,
  deleteTag,
  editCategory,
} from '../categoriesUtils';

const INITIAL: Record<string, ICategoryDefinition> = {
  Food: { emoji: '🍔', tags: ['grocery', 'restaurant'] },
  Car: { emoji: '🚗', tags: ['gas', 'repair'] },
  Other: { emoji: '❓', tags: [] },
};

describe('deleteTag', () => {
  it('removes an existing tag', () => {
    const result = deleteTag(INITIAL, 'Food', 'grocery');
    expect(result['Food'].tags).toEqual(['restaurant']);
  });

  it('is a no-op on an unknown tag', () => {
    const result = deleteTag(INITIAL, 'Food', 'unknown');
    expect(result['Food'].tags).toEqual(['grocery', 'restaurant']);
  });

  it('is a no-op on an unknown category', () => {
    const result = deleteTag(INITIAL, 'Nonexistent', 'grocery');
    expect(result).toEqual(INITIAL);
  });

  it('does not mutate the input', () => {
    const before = JSON.stringify(INITIAL);
    deleteTag(INITIAL, 'Food', 'grocery');
    expect(JSON.stringify(INITIAL)).toBe(before);
  });
});

describe('addTag', () => {
  it('appends a new tag', () => {
    const result = addTag(INITIAL, 'Food', 'snack');
    expect(result['Food'].tags).toEqual(['grocery', 'restaurant', 'snack']);
  });

  it('is a no-op if tag already present', () => {
    const result = addTag(INITIAL, 'Food', 'grocery');
    expect(result).toEqual(INITIAL);
  });

  it('is a no-op on empty string', () => {
    const result = addTag(INITIAL, 'Food', '');
    expect(result).toEqual(INITIAL);
  });

  it('trims whitespace before adding', () => {
    const result = addTag(INITIAL, 'Food', '  snack  ');
    expect(result['Food'].tags).toContain('snack');
    expect(result['Food'].tags).not.toContain('  snack  ');
  });

  it('is a no-op on unknown category', () => {
    const result = addTag(INITIAL, 'Nonexistent', 'tag');
    expect(result).toEqual(INITIAL);
  });
});

describe('deleteCategory', () => {
  it('removes a known category', () => {
    const result = deleteCategory(INITIAL, 'Car');
    expect(result['Car']).toBeUndefined();
    expect(result['Food']).toBeDefined();
  });

  it('is a no-op on unknown key', () => {
    const result = deleteCategory(INITIAL, 'Nonexistent');
    expect(result).toEqual(INITIAL);
  });

  it('does not mutate the input', () => {
    const before = JSON.stringify(INITIAL);
    deleteCategory(INITIAL, 'Car');
    expect(JSON.stringify(INITIAL)).toBe(before);
  });
});

describe('addCategory', () => {
  it('adds a new entry with empty tags', () => {
    const result = addCategory(INITIAL, 'Health', '💊');
    expect(result['Health']).toEqual({ emoji: '💊', tags: [] });
  });

  it('is a no-op if name already exists', () => {
    const result = addCategory(INITIAL, 'Food', '🆕');
    expect(result).toEqual(INITIAL);
  });

  it('preserves existing entries', () => {
    const result = addCategory(INITIAL, 'Health', '💊');
    expect(result['Food']).toEqual(INITIAL['Food']);
    expect(result['Car']).toEqual(INITIAL['Car']);
  });
});

describe('editCategory', () => {
  it('renames a key, preserving tags', () => {
    const result = editCategory(INITIAL, 'Car', 'Vehicle', '🚙');
    expect(result['Vehicle']).toEqual({ emoji: '🚙', tags: ['gas', 'repair'] });
    expect(result['Car']).toBeUndefined();
  });

  it('changes only the emoji when name is unchanged', () => {
    const result = editCategory(INITIAL, 'Car', 'Car', '🚙');
    expect(result['Car'].emoji).toBe('🚙');
    expect(result['Car'].tags).toEqual(['gas', 'repair']);
  });

  it('rename to same name is a no-op on structure', () => {
    const result = editCategory(INITIAL, 'Food', 'Food', '🍔');
    expect(result['Food']).toEqual(INITIAL['Food']);
  });

  it('handles unknown old name gracefully', () => {
    const result = editCategory(INITIAL, 'Nonexistent', 'New', '🆕');
    expect(result).toEqual(INITIAL);
  });
});
