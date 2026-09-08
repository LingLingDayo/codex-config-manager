import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast } from '../useToast';

describe('useToast composable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const { hideToast } = useToast();
    hideToast();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始状态或 hideToast 后 visible 应该为 false', () => {
    const { visible } = useToast();
    expect(visible.value).toBe(false);
  });

  it('调用 showToast 应更新消息内容、默认类型并显示 toast', () => {
    const { showToast, message, type, visible } = useToast();
    showToast('操作成功');

    expect(message.value).toBe('操作成功');
    expect(type.value).toBe('success');
    expect(visible.value).toBe(true);
  });

  it('支持自定义 toast 类型及展示时长', () => {
    const { showToast, message, type, visible } = useToast();
    showToast('网络异常', 'error', 1500);

    expect(message.value).toBe('网络异常');
    expect(type.value).toBe('error');
    expect(visible.value).toBe(true);

    // 还没到 1500ms
    vi.advanceTimersByTime(1000);
    expect(visible.value).toBe(true);

    // 达到 1500ms 后自动关闭
    vi.advanceTimersByTime(500);
    expect(visible.value).toBe(false);
  });

  it('连续调用 showToast 时应清除上一轮计时器并重置时长', () => {
    const { showToast, message, visible } = useToast();
    showToast('第一条消息', 'info', 2000);

    vi.advanceTimersByTime(1500);
    expect(visible.value).toBe(true);

    // 重新触发第二条消息
    showToast('第二条消息', 'success', 2000);
    expect(message.value).toBe('第二条消息');

    // 经过 1000ms（此时距离第一条已过去 2500ms，但第二条还剩 1000ms）
    vi.advanceTimersByTime(1000);
    expect(visible.value).toBe(true);

    // 再经过 1000ms，第二条结束
    vi.advanceTimersByTime(1000);
    expect(visible.value).toBe(false);
  });

  it('调用 hideToast 应能立即隐藏提示', () => {
    const { showToast, hideToast, visible } = useToast();
    showToast('即将被关闭');
    expect(visible.value).toBe(true);

    hideToast();
    expect(visible.value).toBe(false);
  });
});
