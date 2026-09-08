import { describe, it, expect, beforeEach } from 'vitest';
import { useConfirm } from '../useConfirm';

describe('useConfirm composable', () => {
  const { confirmState, showConfirm, handleConfirm, handleCancel, resetConfirmState } =
    useConfirm();

  beforeEach(() => {
    resetConfirmState();
  });

  it('初始状态应为不可见', () => {
    expect(confirmState.value.visible).toBe(false);
  });

  it('传入完整配置项时应正确赋值', () => {
    showConfirm({
      title: '自定义标题',
      message: '测试消息内容',
      detail: '补充说明文本',
      type: 'danger',
      confirmText: '立刻删除',
      cancelText: '点错了',
      showCancel: true,
    });

    expect(confirmState.value.visible).toBe(true);
    expect(confirmState.value.title).toBe('自定义标题');
    expect(confirmState.value.message).toBe('测试消息内容');
    expect(confirmState.value.detail).toBe('补充说明文本');
    expect(confirmState.value.type).toBe('danger');
    expect(confirmState.value.confirmText).toBe('立刻删除');
    expect(confirmState.value.cancelText).toBe('点错了');
    expect(confirmState.value.showCancel).toBe(true);
  });

  it('传入纯字符串作为入参时，应赋给 message 并使用默认 warning 类型', () => {
    showConfirm('简单字符串确认');

    expect(confirmState.value.visible).toBe(true);
    expect(confirmState.value.message).toBe('简单字符串确认');
    expect(confirmState.value.type).toBe('warning');
    expect(confirmState.value.title).toBe('操作提示');
    expect(confirmState.value.confirmText).toBe('确定');
    expect(confirmState.value.cancelText).toBe('取消');
  });

  it('未提供标题与按钮文案时，各种类型应回退到对应预设默认文案', () => {
    showConfirm({ message: '危险操作', type: 'danger' });
    expect(confirmState.value.title).toBe('危险操作确认');
    expect(confirmState.value.confirmText).toBe('确认删除');

    showConfirm({ message: '信息操作', type: 'info' });
    expect(confirmState.value.title).toBe('提示信息');
    expect(confirmState.value.confirmText).toBe('确定');

    showConfirm({ message: '成功操作', type: 'success' });
    expect(confirmState.value.title).toBe('确认操作');
    expect(confirmState.value.confirmText).toBe('确定');
  });

  it('点击确认 handleConfirm 应 resolve true 并关闭弹窗', async () => {
    const promise = showConfirm({ message: '请确认' });
    expect(confirmState.value.visible).toBe(true);

    handleConfirm();
    const result = await promise;

    expect(result).toBe(true);
    expect(confirmState.value.visible).toBe(false);
  });

  it('点击取消 handleCancel 应 resolve false 并关闭弹窗', async () => {
    const promise = showConfirm({ message: '请确认' });
    expect(confirmState.value.visible).toBe(true);

    handleCancel();
    const result = await promise;

    expect(result).toBe(false);
    expect(confirmState.value.visible).toBe(false);
  });
});
