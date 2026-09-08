import { ref } from 'vue';
import type { ConfirmOptions, ConfirmState, ConfirmType } from '../types/config';

const defaultState: ConfirmState = {
  visible: false,
  title: '',
  message: '',
  detail: '',
  type: 'warning',
  confirmText: '确定',
  cancelText: '取消',
  showCancel: true,
};

const confirmState = ref<ConfirmState>({ ...defaultState });

export const getDefaultTitle = (type: ConfirmType): string => {
  switch (type) {
    case 'danger':
      return '危险操作确认';
    case 'warning':
      return '操作提示';
    case 'info':
      return '提示信息';
    case 'success':
      return '确认操作';
    default:
      return '提示';
  }
};

export const getDefaultConfirmText = (type: ConfirmType): string => {
  switch (type) {
    case 'danger':
      return '确认删除';
    default:
      return '确定';
  }
};

export function useConfirm() {
  /**
   * 弹出二次确认弹窗，返回用户是否点击了确认
   */
  const showConfirm = (options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts: ConfirmOptions =
        typeof options === 'string' ? { message: options } : options;
      const resolvedType: ConfirmType = opts.type || 'warning';

      confirmState.value = {
        visible: true,
        title: opts.title ?? getDefaultTitle(resolvedType),
        message: opts.message,
        detail: opts.detail ?? '',
        type: resolvedType,
        confirmText: opts.confirmText ?? getDefaultConfirmText(resolvedType),
        cancelText: opts.cancelText ?? '取消',
        showCancel: opts.showCancel !== false,
        resolve,
      };
    });
  };

  /**
   * 用户点击确认
   */
  const handleConfirm = () => {
    const prevResolve = confirmState.value.resolve;
    confirmState.value.visible = false;
    confirmState.value.resolve = undefined;
    prevResolve?.(true);
  };

  /**
   * 用户点击取消或关闭
   */
  const handleCancel = () => {
    const prevResolve = confirmState.value.resolve;
    confirmState.value.visible = false;
    confirmState.value.resolve = undefined;
    prevResolve?.(false);
  };

  /**
   * 重置状态（主要用于测试）
   */
  const resetConfirmState = () => {
    if (confirmState.value.resolve) {
      confirmState.value.resolve(false);
    }
    confirmState.value = { ...defaultState };
  };

  return {
    confirmState,
    showConfirm,
    confirm: showConfirm,
    handleConfirm,
    handleCancel,
    resetConfirmState,
  };
}
