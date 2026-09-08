import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useCodexConfig } from '../useCodexConfig';
import type { CodexConfig } from '../../types/config';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('useCodexConfig composable', () => {
  const mockedInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // 默认模拟非 Tauri 环境
    delete (window as any).__TAURI_INTERNALS__;
  });

  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
  });

  describe('loadConfig', () => {
    it('在非 Tauri (浏览器) 环境下应从 localStorage 读取配置', async () => {
      const localData: CodexConfig = {
        key: 'sk-browser-123',
        provider_url: 'https://api.openai.com/v1',
        is_enabled: true,
        model: 'gpt-4o',
      };
      localStorage.setItem('codex_current_config', JSON.stringify(localData));

      const { currentConfig, loadConfig } = useCodexConfig();
      await loadConfig();

      expect(currentConfig.key).toBe('sk-browser-123');
      expect(currentConfig.provider_url).toBe('https://api.openai.com/v1');
      expect(currentConfig.is_enabled).toBe(true);
      expect(currentConfig.model).toBe('gpt-4o');
    });

    it('在 Tauri 环境下应优先从 invoke(get_codex_config) 加载配置', async () => {
      (window as any).__TAURI_INTERNALS__ = {};
      const backendConfig: CodexConfig = {
        key: 'sk-tauri-key',
        provider_url: 'https://api.deepseek.com',
        is_enabled: true,
        model: 'deepseek-chat',
      };
      mockedInvoke.mockResolvedValueOnce(backendConfig);

      const { currentConfig, loadConfig } = useCodexConfig();
      await loadConfig();

      expect(mockedInvoke).toHaveBeenCalledWith('get_codex_config');
      expect(currentConfig.key).toBe('sk-tauri-key');
      expect(currentConfig.provider_url).toBe('https://api.deepseek.com');
      expect(currentConfig.model).toBe('deepseek-chat');
    });
  });

  describe('saveConfig', () => {
    it('缺少 key 或 providerUrl 时应返回 false 并阻止保存', async () => {
      const { saveConfig } = useCodexConfig();
      const result = await saveConfig('', 'https://api.openai.com');
      expect(result).toBe(false);

      const result2 = await saveConfig('sk-key', '');
      expect(result2).toBe(false);
    });

    it('合法参数下应成功更新配置并持久化到本地与 Tauri 后端', async () => {
      (window as any).__TAURI_INTERNALS__ = {};
      mockedInvoke.mockResolvedValueOnce(undefined);

      const { currentConfig, saveConfig } = useCodexConfig();
      const success = await saveConfig('sk-valid-key', 'https://api.openai.com/v1', 'gpt-4o');

      expect(success).toBe(true);
      expect(mockedInvoke).toHaveBeenCalledWith('save_codex_config', {
        key: 'sk-valid-key',
        providerUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      });
      expect(currentConfig.key).toBe('sk-valid-key');
      expect(currentConfig.is_enabled).toBe(true);
      expect(currentConfig.model).toBe('gpt-4o');
      expect(localStorage.getItem('codex_current_config')).toBeTruthy();
    });
  });

  describe('saveModel', () => {
    it('应能正确保存自定义模型名称', async () => {
      (window as any).__TAURI_INTERNALS__ = {};
      mockedInvoke.mockResolvedValueOnce(undefined);

      const { currentConfig, saveModel } = useCodexConfig();
      const success = await saveModel('claude-3-5-sonnet-20241022');

      expect(success).toBe(true);
      expect(mockedInvoke).toHaveBeenCalledWith('save_codex_model', {
        model: 'claude-3-5-sonnet-20241022',
      });
      expect(currentConfig.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('当传入空模型名时应能清空模型设置', async () => {
      (window as any).__TAURI_INTERNALS__ = {};
      mockedInvoke.mockResolvedValueOnce(undefined);

      const { currentConfig, saveModel } = useCodexConfig();
      const success = await saveModel('   ');

      expect(success).toBe(true);
      expect(currentConfig.model).toBe('');
      expect(mockedInvoke).toHaveBeenCalledWith('save_codex_model', { model: '' });
    });
  });

  describe('restoreDefault', () => {
    it('恢复默认应清空当前配置并调用后端与清理缓存', async () => {
      (window as any).__TAURI_INTERNALS__ = {};
      mockedInvoke.mockResolvedValueOnce(undefined);

      const { currentConfig, restoreDefault } = useCodexConfig();
      currentConfig.key = 'existing-key';
      currentConfig.is_enabled = true;
      localStorage.setItem('codex_current_config', 'something');

      const success = await restoreDefault();

      expect(success).toBe(true);
      expect(mockedInvoke).toHaveBeenCalledWith('restore_codex_default');
      expect(currentConfig.key).toBe('');
      expect(currentConfig.is_enabled).toBe(false);
      expect(localStorage.getItem('codex_current_config')).toBeNull();
    });
  });
});
