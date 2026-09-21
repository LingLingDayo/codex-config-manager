import type { ModelAlias } from '../types/config';

export function cloneModelAliases(list?: ModelAlias[] | null): ModelAlias[] {
  return (list ?? []).map((item) => ({
    slug: item.slug ?? '',
    display_name: item.display_name ?? '',
  }));
}

/**
 * 规范化别名列表：去掉空 slug、别名为空时回退为 slug，重复 slug 保留最后一次
 */
export function normalizeModelAliases(list?: ModelAlias[] | null): ModelAlias[] {
  const result: ModelAlias[] = [];
  for (const item of list ?? []) {
    const slug = (item.slug || '').trim();
    if (!slug) continue;
    const trimmedName = (item.display_name || '').trim();
    const display_name = trimmedName || slug;
    const existing = result.findIndex((alias) => alias.slug === slug);
    if (existing >= 0) {
      result[existing] = { slug, display_name };
    } else {
      result.push({ slug, display_name });
    }
  }
  return result;
}

/**
 * 将旧版单个别名字段迁移为别名列表；若已有列表则以其为准
 */
export function migrateLegacyDisplayName(
  aliases?: ModelAlias[] | null,
  model?: string | null,
  displayName?: string | null
): ModelAlias[] {
  const normalized = normalizeModelAliases(aliases);
  if (normalized.length > 0) {
    return normalized;
  }
  const slug = (model || '').trim();
  const name = (displayName || '').trim();
  if (!slug && !name) {
    return [];
  }
  if (slug) {
    return [{ slug, display_name: name || slug }];
  }
  return [{ slug: name, display_name: name }];
}

/**
 * 将远端拉取到的模型合并进现有别名列表：已有 slug 保留自定义别名，新增项默认别名为模型名
 */
export function mergeFetchedModels(existing: ModelAlias[] | null | undefined, fetched: string[]): ModelAlias[] {
  const result = normalizeModelAliases(existing);
  const have = new Set(result.map((item) => item.slug));
  for (const raw of fetched) {
    const slug = (raw || '').trim();
    if (!slug || have.has(slug)) continue;
    result.push({ slug, display_name: slug });
    have.add(slug);
  }
  return result;
}

export function modelAliasesEqual(a?: ModelAlias[] | null, b?: ModelAlias[] | null): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  return left.every(
    (item, index) =>
      item.slug === right[index].slug && item.display_name === right[index].display_name
  );
}
