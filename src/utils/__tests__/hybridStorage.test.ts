import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import {
  isTauriEnv,
  readLocalJson,
  writeLocalJson,
  removeLocalJson,
  invokeCommand,
} from '../hybridStorage';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('hybridStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    delete (window as any).__TAURI_INTERNALS__;
  });

  it('isTauriEnv 应依据 window.__TAURI_INTERNALS__ 判断', () => {
    expect(isTauriEnv()).toBe(false);
    (window as any).__TAURI_INTERNALS__ = {};
    expect(isTauriEnv()).toBe(true);
  });

  it('writeLocalJson / readLocalJson 应完成 JSON 往返', () => {
    writeLocalJson('demo_key', { a: 1, b: 'x' });
    expect(readLocalJson<{ a: number; b: string }>('demo_key')).toEqual({ a: 1, b: 'x' });
  });

  it('readLocalJson 在缺失或非法 JSON 时应返回 null', () => {
    expect(readLocalJson('missing')).toBeNull();
    localStorage.setItem('broken', '{not-json');
    expect(readLocalJson('broken')).toBeNull();
  });

  it('removeLocalJson 应删除对应键', () => {
    writeLocalJson('demo_key', { ok: true });
    removeLocalJson('demo_key');
    expect(readLocalJson('demo_key')).toBeNull();
  });

  it('invokeCommand 应透传至 Tauri invoke', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValueOnce({ ok: true });
    const result = await invokeCommand<{ ok: boolean }>('ping', { n: 1 });
    expect(result).toEqual({ ok: true });
    expect(mockedInvoke).toHaveBeenCalledWith('ping', { n: 1 });
  });

  it('invokeCommand 无参数时不应传入第二实参', async () => {
    const mockedInvoke = vi.mocked(invoke);
    mockedInvoke.mockResolvedValueOnce({ ok: true });
    await invokeCommand('ping');
    expect(mockedInvoke).toHaveBeenCalledWith('ping');
    expect(mockedInvoke.mock.calls[0]).toHaveLength(1);
  });
});
