import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { useAppWorkflow } from '../useAppWorkflow';
import { resetCodexConfigState } from '../useCodexConfig';
import { resetPresetsState, usePresets } from '../usePresets';
import { resetSettingsState } from '../useSettings';
import { useConfirm } from '../useConfirm';
import { useToast } from '../useToast';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('useAppWorkflow', () => {
  const mockedInvoke = vi.mocked(invoke);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetCodexConfigState();
    resetPresetsState();
    resetSettingsState();
    useConfirm().resetConfirmState();
  });

  it('未检测到安装路径时启动应引导前往设置', async () => {
    mockedInvoke.mockImplementation(async (cmd) => {
      if (cmd === 'get_app_settings') {
        return { codex_path: '', launch_kill_previous: true, show_provider_presets: true };
      }
      if (cmd === 'detect_codex_path') {
        return null;
      }
      return null;
    });

    const workflow = useAppWorkflow();
    await workflow.bootstrap();

    const { message, type } = useToast();
    const { confirmState } = useConfirm();

    void workflow.handleLaunchApp({
      key: 'sk-test',
      providerUrl: 'https://api.test.com/v1',
    });
    await new Promise((r) => setTimeout(r, 20));

    expect(message.value).toContain('未检测到 Codex 安装路径');
    expect(type.value).toBe('warning');
    expect(confirmState.value.visible).toBe(true);
    expect(confirmState.value.confirmText).toBe('前往设置');
    expect(mockedInvoke).not.toHaveBeenCalledWith('launch_codex_app');
  });

  it('已配置路径时启动应静默保存并拉起应用', async () => {
    mockedInvoke.mockImplementation(async (cmd) => {
      if (cmd === 'get_app_settings') {
        return {
          codex_path: 'C:\\Program Files\\ChatGPT\\ChatGPT.exe',
          launch_kill_previous: true,
          show_provider_presets: true,
        };
      }
      if (cmd === 'save_codex_config') {
        return undefined;
      }
      if (cmd === 'launch_codex_app') {
        return {
          success: true,
          killed_previous: false,
          message: '已成功启动 ChatGPT',
          target: 'ChatGPT.exe',
        };
      }
      return null;
    });

    (window as any).__TAURI_INTERNALS__ = {};
    const workflow = useAppWorkflow();
    await workflow.bootstrap();

    await workflow.handleLaunchApp({
      key: 'sk-test',
      providerUrl: 'https://api.test.com/v1',
      model: 'gpt-5.6-sol',
    });

    expect(mockedInvoke).toHaveBeenCalledWith('save_codex_config', expect.objectContaining({
      key: 'sk-test',
      providerUrl: 'https://api.test.com/v1',
      model: 'gpt-5.6-sol',
    }));
    expect(mockedInvoke).toHaveBeenCalledWith('launch_codex_app');
    delete (window as any).__TAURI_INTERNALS__;
  });

  it('收藏配置缺少 Key 时应拒绝并提示', async () => {
    const workflow = useAppWorkflow();
    const { message, type } = useToast();

    workflow.handleSaveAsPreset({
      key: '   ',
      providerUrl: 'https://api.test.com/v1',
    });

    expect(type.value).toBe('error');
    expect(message.value).toContain('请先在上方输入 API Key');
    expect(workflow.isModalVisible.value).toBe(false);
  });

  it('收藏已存在的配置应打开编辑弹窗并回填预设', async () => {
    const { presets } = usePresets();
    presets.value = [
      {
        id: 'preset_exist',
        name: '已有配置',
        key: 'sk-exist',
        provider_url: 'https://api.test.com/v1',
        model: 'old-model',
      },
    ];

    const workflow = useAppWorkflow();
    workflow.handleSaveAsPreset({
      key: 'sk-exist',
      providerUrl: 'https://api.test.com/v1',
      model: 'new-model',
    });

    expect(workflow.isModalVisible.value).toBe(true);
    expect(workflow.modalTitle.value).toBe('编辑配置');
    expect(workflow.modalInitialData.value).toMatchObject({
      id: 'preset_exist',
      name: '已有配置',
      model: 'new-model',
    });
  });
});
