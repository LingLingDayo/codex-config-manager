import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { usePresets, DEFAULT_PRESETS } from '../usePresets';
import { useConfirm } from '../useConfirm';
import { DEFAULT_STATION_URL } from '../../utils/format';
import type { CodexConfig, PresetConfig } from '../../types/config';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../useConfirm', () => {
  const showConfirm = vi.fn();
  return {
    useConfirm: () => ({
      showConfirm,
      confirm: showConfirm,
    }),
  };
});


describe('usePresets composable', () => {
  const mockedInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('loadPresets', () => {
    it('成功从后端获取预设时，应正确赋值并完成 URL 规范化', async () => {
      const backendData: PresetConfig[] = [
        {
          id: 'p1',
          name: '测试站',
          provider_url: 'lingai', // 默认站点别名
          key: 'sk-123456',
        },
        {
          id: 'p2',
          name: '自定义站',
          provider_url: 'https://api.openai.com',
          key: 'sk-openai',
        },
      ];
      mockedInvoke.mockResolvedValueOnce(backendData);

      const { presets, loadPresets, isPresetsLoading } = usePresets();
      const loadPromise = loadPresets();
      expect(isPresetsLoading.value).toBe(true);

      await loadPromise;
      expect(isPresetsLoading.value).toBe(false);
      expect(presets.value).toHaveLength(2);
      // 验证 lingai 是否被规范化为 DEFAULT_STATION_URL
      expect(presets.value[0].provider_url).toBe(DEFAULT_STATION_URL);
      expect(presets.value[1].provider_url).toBe('https://api.openai.com');
    });

    it('后端调用异常时，应降级从 localStorage 加载预设', async () => {
      mockedInvoke.mockRejectedValueOnce(new Error('Backend error'));
      const localPresets: PresetConfig[] = [
        {
          id: 'local_1',
          name: '本地缓存配置',
          provider_url: 'https://cached.example.com',
          key: 'sk-cached',
        },
      ];
      localStorage.setItem('codex_presets', JSON.stringify(localPresets));

      const { presets, loadPresets } = usePresets();
      await loadPresets();

      expect(presets.value).toHaveLength(1);
      expect(presets.value[0].id).toBe('local_1');
    });

    it('后端与 localStorage 均为空时，应回退至 DEFAULT_PRESETS 并持久化', async () => {
      mockedInvoke.mockResolvedValueOnce(null);

      const { presets, loadPresets } = usePresets();
      await loadPresets();

      expect(presets.value).toEqual(DEFAULT_PRESETS);
      expect(localStorage.getItem('codex_presets')).toBeTruthy();
      expect(mockedInvoke).toHaveBeenCalledWith('save_presets', { presets: DEFAULT_PRESETS });
    });
  });

  describe('saveOrUpdatePreset', () => {
    it('输入字段有空时应校验失败并返回 false', async () => {
      const { saveOrUpdatePreset } = usePresets();
      const result = await saveOrUpdatePreset({
        name: '   ',
        provider_url: 'https://example.com',
        key: 'sk-xxx',
      });
      expect(result).toBe(false);
    });

    it('新增预设时应生成唯一 ID，加入列表头部并持久化', async () => {
      mockedInvoke.mockResolvedValue(undefined);
      const { presets, saveOrUpdatePreset } = usePresets();
      presets.value = [];

      const success = await saveOrUpdatePreset({
        name: '新增预设',
        provider_url: 'https://api.example.com',
        key: 'sk-new-123456',
      });

      expect(success).toBe(true);
      expect(presets.value).toHaveLength(1);
      expect(presets.value[0].name).toBe('新增预设');
      expect(presets.value[0].id).toMatch(/^preset_/);
      expect(mockedInvoke).toHaveBeenCalledWith('save_presets', { presets: presets.value });
    });

    it('编辑已有预设时应更新对应预设的数据', async () => {
      mockedInvoke.mockResolvedValue(undefined);
      const { presets, saveOrUpdatePreset } = usePresets();
      presets.value = [
        {
          id: 'preset_old',
          name: '旧名称',
          provider_url: 'https://old.example.com',
          key: 'sk-old',
        },
      ];

      const success = await saveOrUpdatePreset({
        id: 'preset_old',
        name: '新名称',
        provider_url: 'https://new.example.com',
        key: 'sk-new',
      });

      expect(success).toBe(true);
      expect(presets.value[0].name).toBe('新名称');
      expect(presets.value[0].provider_url).toBe('https://new.example.com');
      expect(presets.value[0].key).toBe('sk-new');
    });
  });

  describe('deletePreset', () => {
    it('用户取消确认时应返回 false 且不删除', async () => {
      const { showConfirm } = useConfirm();
      vi.mocked(showConfirm).mockResolvedValueOnce(false);
      const { presets, deletePreset } = usePresets();
      const target: PresetConfig = {
        id: 'p1',
        name: '待删除',
        provider_url: 'https://example.com',
        key: 'key',
      };
      presets.value = [target];

      const res = await deletePreset(target);
      expect(res).toBe(false);
      expect(presets.value).toHaveLength(1);
      expect(showConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'danger',
          title: '删除配置预设',
        })
      );
    });

    it('用户确认删除后应从列表中移除并持久化', async () => {
      const { showConfirm } = useConfirm();
      vi.mocked(showConfirm).mockResolvedValueOnce(true);
      mockedInvoke.mockResolvedValue(undefined);
      const { presets, deletePreset } = usePresets();
      const target: PresetConfig = {
        id: 'p1',
        name: '待删除',
        provider_url: 'https://example.com',
        key: 'key',
      };
      presets.value = [target];

      const res = await deletePreset(target);
      expect(res).toBe(true);
      expect(presets.value).toHaveLength(0);
      expect(mockedInvoke).toHaveBeenCalledWith('save_presets', { presets: [] });
    });
  });

  describe('isPresetActive', () => {
    const { isPresetActive } = usePresets();

    const samplePreset: PresetConfig = {
      id: 'p1',
      name: '测试站',
      provider_url: 'https://api.example.com/v1/',
      key: 'sk-secret-123',
    };

    it('当当前配置未启用时返回 false', () => {
      const config: CodexConfig = {
        key: 'sk-secret-123',
        provider_url: 'https://api.example.com/v1',
        is_enabled: false,
      };
      expect(isPresetActive(samplePreset, config)).toBe(false);
    });

    it('当 Key 或 URL 不匹配时返回 false', () => {
      const wrongKeyConfig: CodexConfig = {
        key: 'sk-other',
        provider_url: 'https://api.example.com/v1',
        is_enabled: true,
      };
      expect(isPresetActive(samplePreset, wrongKeyConfig)).toBe(false);

      const wrongUrlConfig: CodexConfig = {
        key: 'sk-secret-123',
        provider_url: 'https://api.other.com',
        is_enabled: true,
      };
      expect(isPresetActive(samplePreset, wrongUrlConfig)).toBe(false);
    });

    it('当 key 与归一化后的 url 均匹配且配置已启用时返回 true', () => {
      const activeConfig: CodexConfig = {
        key: 'sk-secret-123',
        provider_url: 'https://api.example.com/v1',
        is_enabled: true,
      };
      expect(isPresetActive(samplePreset, activeConfig)).toBe(true);
    });
  });
});
