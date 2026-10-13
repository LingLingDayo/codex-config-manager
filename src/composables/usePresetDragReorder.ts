import { ref } from 'vue';

export interface UsePresetDragReorderOptions {
  getPresetsCount: () => number;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function usePresetDragReorder(options: UsePresetDragReorderOptions) {
  const draggedIndex = ref<number | null>(null);
  const dragOverIndex = ref<number | null>(null);
  const isDragging = ref<boolean>(false);
  const isClickSuppressed = ref<boolean>(false);
  let dragEndTimeout: ReturnType<typeof setTimeout> | null = null;

  const cleanupDragState = () => {
    draggedIndex.value = null;
    dragOverIndex.value = null;
    isClickSuppressed.value = true;
    if (dragEndTimeout) {
      clearTimeout(dragEndTimeout);
    }
    dragEndTimeout = setTimeout(() => {
      isDragging.value = false;
      isClickSuppressed.value = false;
      dragEndTimeout = null;
    }, 250);
  };

  const onDragStart = (e: DragEvent, index: number) => {
    if (options.getPresetsCount() <= 1) return;
    draggedIndex.value = index;
    isDragging.value = true;
    isClickSuppressed.value = true;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
      try {
        e.dataTransfer.setData('application/x-preset-index', String(index));
      } catch {
        // 兼容不支持自定义 MIME 的环境
      }
    }
  };

  const onDragOver = (e: DragEvent, index: number) => {
    if (draggedIndex.value === null) return;
    e.preventDefault?.();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (draggedIndex.value !== index) {
      dragOverIndex.value = index;
    } else {
      dragOverIndex.value = null;
    }
  };

  const onDragEnter = (e: DragEvent, index: number) => {
    if (draggedIndex.value === null) return;
    e.preventDefault?.();
    if (draggedIndex.value !== index) {
      dragOverIndex.value = index;
    }
  };

  const onDragLeave = (e: DragEvent, index: number) => {
    const currentTarget = e.currentTarget as HTMLElement | null;
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    // 仅当真正离开当前项且未进入当前项的子元素时，才可能重置
    if (currentTarget && relatedTarget && !currentTarget.contains(relatedTarget)) {
      if (dragOverIndex.value === index) {
        dragOverIndex.value = null;
      }
    }
  };

  const onDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault?.();
    e.stopPropagation?.();
    const fromIndex = draggedIndex.value;
    if (fromIndex !== null && fromIndex !== targetIndex) {
      options.onReorder(fromIndex, targetIndex);
    }
    cleanupDragState();
  };

  const onDragEnd = () => {
    cleanupDragState();
  };

  const onListDrop = (e: DragEvent) => {
    e.preventDefault?.();
    if (e.target === e.currentTarget && draggedIndex.value !== null) {
      const targetIndex = options.getPresetsCount() - 1;
      if (draggedIndex.value !== targetIndex) {
        options.onReorder(draggedIndex.value, targetIndex);
      }
      cleanupDragState();
    }
  };

  const onListClickCapture = (e: MouseEvent) => {
    if (isDragging.value || isClickSuppressed.value) {
      e.stopPropagation?.();
      e.preventDefault?.();
    }
  };

  const clearTimer = () => {
    if (dragEndTimeout) {
      clearTimeout(dragEndTimeout);
      dragEndTimeout = null;
    }
  };

  return {
    draggedIndex,
    dragOverIndex,
    isDragging,
    isClickSuppressed,
    cleanupDragState,
    onDragStart,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    onDragEnd,
    onListDrop,
    onListClickCapture,
    clearTimer,
  };
}
