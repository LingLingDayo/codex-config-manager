import { ref } from 'vue';
import type { ToastType } from '../types/config';

const message = ref<string>('');
const type = ref<ToastType>('success');
const visible = ref<boolean>(false);
let timer: ReturnType<typeof setTimeout> | null = null;

export function useToast() {
  const showToast = (msg: string, toastType: ToastType = 'success', duration = 2500) => {
    if (timer) {
      clearTimeout(timer);
    }
    message.value = msg;
    type.value = toastType;
    visible.value = true;

    timer = setTimeout(() => {
      visible.value = false;
    }, duration);
  };

  const hideToast = () => {
    if (timer) {
      clearTimeout(timer);
    }
    visible.value = false;
  };

  return {
    message,
    type,
    visible,
    showToast,
    hideToast,
  };
}
