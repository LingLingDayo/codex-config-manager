import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openExternalUrl } from '../browser';
import * as hybridStorage from '../hybridStorage';

describe('browser utility - openExternalUrl', () => {
  const originalOpen = window.open;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it('传入空字符串或非法值时应直接返回 false 且不触发任何调用', async () => {
    const invokeSpy = vi.spyOn(hybridStorage, 'invokeCommand');
    const openSpy = vi.fn();
    window.open = openSpy;

    const res1 = await openExternalUrl('');
    const res2 = await openExternalUrl('   ');

    expect(res1).toBe(false);
    expect(res2).toBe(false);
    expect(invokeSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('在 Tauri 环境下应通过 invokeCommand 调用 plugin:opener|open_url', async () => {
    vi.spyOn(hybridStorage, 'isTauriEnv').mockReturnValue(true);
    const invokeSpy = vi.spyOn(hybridStorage, 'invokeCommand').mockResolvedValue(undefined);
    const openSpy = vi.fn();
    window.open = openSpy;

    const result = await openExternalUrl('https://github.com/LingLingDayo/codex-config-manager');

    expect(result).toBe(true);
    expect(invokeSpy).toHaveBeenCalledWith('plugin:opener|open_url', {
      url: 'https://github.com/LingLingDayo/codex-config-manager',
    });
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('在 Tauri 环境下调用失败时应降级至 window.open', async () => {
    vi.spyOn(hybridStorage, 'isTauriEnv').mockReturnValue(true);
    vi.spyOn(hybridStorage, 'invokeCommand').mockRejectedValue(new Error('Tauri error'));
    const openSpy = vi.fn();
    window.open = openSpy;

    const result = await openExternalUrl('https://github.com/LingLingDayo/codex-config-manager');

    expect(result).toBe(true);
    expect(openSpy).toHaveBeenCalledWith(
      'https://github.com/LingLingDayo/codex-config-manager',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('在非 Tauri 环境下直接使用 window.open 打开链接', async () => {
    vi.spyOn(hybridStorage, 'isTauriEnv').mockReturnValue(false);
    const invokeSpy = vi.spyOn(hybridStorage, 'invokeCommand');
    const openSpy = vi.fn();
    window.open = openSpy;

    const result = await openExternalUrl('https://github.com/LingLingDayo/codex-config-manager');

    expect(result).toBe(true);
    expect(invokeSpy).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(
      'https://github.com/LingLingDayo/codex-config-manager',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('在 window.open 抛出异常时应捕获并安全返回 false', async () => {
    vi.spyOn(hybridStorage, 'isTauriEnv').mockReturnValue(false);
    window.open = vi.fn(() => {
      throw new Error('Blocked popup');
    });

    const result = await openExternalUrl('https://github.com/LingLingDayo/codex-config-manager');

    expect(result).toBe(false);
  });
});
