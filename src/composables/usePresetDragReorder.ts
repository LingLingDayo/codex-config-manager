import { ref } from 'vue';

export interface UsePresetDragReorderOptions {
  getPresetsCount: () => number;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function usePresetDragReorder(options: UsePresetDragReorderOptions) {
  const draggedIndex = ref<number | null>(null);
  const dragOverIndex = ref<number | null>(null);
  const isDragging = ref<boolean>(false);
  let dragEndTimeout: ReturnType<typeof setTimeout> | null = null;

  const cleanupDragState = () => {
    draggedIndex.value = null;
    dragOverIndex.value = null;
    if (dragEndTimeout) {
      clearTimeout(dragEndTimeout);
    }
    dragEndTimeout = setTimeout(() => {
      isDragging.value = false;
    }, 100);
  };

  const onDragStart = (e: DragEvent, index: number) => {
    if (options.getPresetsCount() <= 1) return;
    draggedIndex.value = index;
    isDragging.value = true;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    }
  };

  const onDragOver = (e: DragEvent, index: number) => {
    if (draggedIndex.value === null) return;
    e.preventDefault();
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
    e.preventDefault();
    if (draggedIndex.value !== index) {
      dragOverIndex.value = index;
    }
  };

  const onDragLeave = (e: DragEvent, index: number) => {
    const currentTarget = e.currentTarget as HTMLElement | null;
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!currentTarget || !relatedTarget || !currentTarget.contains(relatedTarget)) {
      if (dragOverIndex.value === index) {
        dragOverIndex.value = null;
      }
    }
  };

  const onDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
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
    if (e.target === e.currentTarget && draggedIndex.value !== null) {
      const targetIndex = options.getPresetsCount() - 1;
      if (draggedIndex.value !== targetIndex) {
        options.onReorder(draggedIndex.value, targetIndex);
      }
      cleanupDragState();
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
    cleanupDragState,
    onDragStart,
    onDragOver,
    onDragEnter,
    onDragLeave,
    onDrop,
    onDragEnd,
    onListDrop,
    clearTimer,
  };
}
