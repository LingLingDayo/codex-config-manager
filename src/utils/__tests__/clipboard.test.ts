import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard } from '../clipboard';

describe('copyToClipboard', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it('当输入文本为空时直接返回 false', async () => {
    const result = await copyToClipboard('');
    expect(result).toBe(false);
  });

  it('在 navigator.clipboard.writeText 可用且成功时应返回 true', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard('test-content');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('test-content');
  });

  it('在 navigator.clipboard 失败时应降级使用 execCommand', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    // 模拟 document.execCommand
    const execCommandMock = vi.fn().mockReturnValue(true);
    document.execCommand = execCommandMock;

    const result = await copyToClipboard('fallback-content');
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('在降级复制模式也失败时应捕获异常并返回 false', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    document.execCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand failure');
    });

    const result = await copyToClipboard('fail-content');
    expect(result).toBe(false);
  });
});
