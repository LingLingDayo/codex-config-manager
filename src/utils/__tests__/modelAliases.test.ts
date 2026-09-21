import { describe, it, expect } from 'vitest';
import {
  cloneModelAliases,
  mergeFetchedModels,
  migrateLegacyDisplayName,
  modelAliasesEqual,
  normalizeModelAliases,
} from '../modelAliases';

describe('modelAliases utility', () => {
  it('normalizeModelAliases 去掉空 slug 并以最后一次覆盖重复项', () => {
    const result = normalizeModelAliases([
      { slug: ' gpt-5.6-sol ', display_name: '' },
      { slug: '', display_name: 'ignored' },
      { slug: 'glm-5.3', display_name: 'GLM' },
      { slug: 'gpt-5.6-sol', display_name: '5.6 Sol' },
    ]);

    expect(result).toEqual([
      { slug: 'gpt-5.6-sol', display_name: '5.6 Sol' },
      { slug: 'glm-5.3', display_name: 'GLM' },
    ]);
  });

  it('migrateLegacyDisplayName 在已有列表时保持原值', () => {
    const existing = [{ slug: 'glm-5.3', display_name: 'GLM 5.3' }];
    expect(migrateLegacyDisplayName(existing, 'gpt-5.6-sol', '5.6 Sol')).toEqual(existing);
  });

  it('migrateLegacyDisplayName 将旧版单个别名迁入列表', () => {
    expect(migrateLegacyDisplayName([], 'gpt-5.6-sol', '5.6 Sol')).toEqual([
      { slug: 'gpt-5.6-sol', display_name: '5.6 Sol' },
    ]);
    expect(migrateLegacyDisplayName(undefined, 'gpt-5.6-sol', '')).toEqual([
      { slug: 'gpt-5.6-sol', display_name: 'gpt-5.6-sol' },
    ]);
  });

  it('mergeFetchedModels 保留已有别名并追加新模型', () => {
    const merged = mergeFetchedModels(
      [{ slug: 'gpt-5.6-sol', display_name: '5.6 Sol' }],
      ['gpt-5.6-sol', 'glm-5.3']
    );
    expect(merged).toEqual([
      { slug: 'gpt-5.6-sol', display_name: '5.6 Sol' },
      { slug: 'glm-5.3', display_name: 'glm-5.3' },
    ]);
  });

  it('cloneModelAliases 与 modelAliasesEqual 按值比较', () => {
    const source = [{ slug: 'a', display_name: 'A' }];
    const cloned = cloneModelAliases(source);
    cloned[0].display_name = 'B';
    expect(source[0].display_name).toBe('A');
    expect(modelAliasesEqual(source, [{ slug: 'a', display_name: 'A' }])).toBe(true);
    expect(modelAliasesEqual(source, cloned)).toBe(false);
  });
});
