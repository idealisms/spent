import { ICategoryDefinition } from '../transactions/model';

/** Returns new Record with the tag removed from the named category. */
export function deleteTag(
  cats: Record<string, ICategoryDefinition>,
  categoryName: string,
  tag: string
): Record<string, ICategoryDefinition> {
  const def = cats[categoryName];
  if (!def) {
    return cats;
  }
  return {
    ...cats,
    [categoryName]: {
      ...def,
      tags: def.tags.filter(t => t !== tag),
    },
  };
}

/** Returns new Record with tag appended (no-op if already present, empty, or unknown category). */
export function addTag(
  cats: Record<string, ICategoryDefinition>,
  categoryName: string,
  tag: string
): Record<string, ICategoryDefinition> {
  const trimmed = tag.trim();
  const def = cats[categoryName];
  if (!def || !trimmed || def.tags.includes(trimmed)) {
    return cats;
  }
  return {
    ...cats,
    [categoryName]: {
      ...def,
      tags: [...def.tags, trimmed],
    },
  };
}

/** Returns new Record without the named category. */
export function deleteCategory(
  cats: Record<string, ICategoryDefinition>,
  categoryName: string
): Record<string, ICategoryDefinition> {
  if (!(categoryName in cats)) {
    return cats;
  }
  const result = { ...cats };
  delete result[categoryName];
  return result;
}

/** Returns new Record with a new category {emoji, tags: []}; no-op if name already exists. */
export function addCategory(
  cats: Record<string, ICategoryDefinition>,
  name: string,
  emoji: string
): Record<string, ICategoryDefinition> {
  if (name in cats) {
    return cats;
  }
  return {
    ...cats,
    [name]: { emoji, tags: [] },
  };
}

/** Returns new Record with key renamed from oldName→newName and emoji updated. */
export function editCategory(
  cats: Record<string, ICategoryDefinition>,
  oldName: string,
  newName: string,
  newEmoji: string
): Record<string, ICategoryDefinition> {
  const def = cats[oldName];
  if (!def) {
    return cats;
  }
  if (oldName === newName) {
    return {
      ...cats,
      [oldName]: { ...def, emoji: newEmoji },
    };
  }
  const result = { ...cats };
  delete result[oldName];
  result[newName] = { emoji: newEmoji, tags: def.tags };
  return result;
}
