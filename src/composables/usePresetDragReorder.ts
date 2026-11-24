import { ref } from 'vue';

export const DEFAULT_DRAG_THRESHOLD = 5;
const CLICK_SUPPRESS_DURATION_MS = 250;

export interface UsePresetDragReorderOptions {
  getPresetsCount: () => number;
  getListElement?: () => HTMLElement | null;
  onReorder: (fromIndex: number, toIndex: number) => void;
  dragThreshold?: number;
}

export function usePresetDragReorder(options: UsePresetDragReorderOptions) {
  const draggedIndex = ref<number | null>(null);
  const dragOverIndex = ref<number | null>(null);
  const isDragging = ref<boolean>(false);
  const isClickSuppressed = ref<boolean>(false);

  let pendingIndex: number | null = null;
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let dragEndTimeout: ReturnType<typeof setTimeout> | null = null;
  let isWindowListening = false;

  const clearTimer = () => {
    if (dragEndTimeout) {
      clearTimeout(dragEndTimeout);
      dragEndTimeout = null;
    }
  };

  const suppressClickTemporarily = () => {
    isClickSuppressed.value = true;
    clearTimer();
    dragEndTimeout = setTimeout(() => {
      isClickSuppressed.value = false;
      dragEndTimeout = null;
    }, CLICK_SUPPRESS_DURATION_MS);
  };

  const resetPendingState = () => {
    pendingIndex = null;
    activePointerId = null;
    startX = 0;
    startY = 0;
  };

  const resetDragVisualState = () => {
    draggedIndex.value = null;
    dragOverIndex.value = null;
    isDragging.value = false;
  };

  const resolveTargetIndex = (clientY: number): number | null => {
    const listEl = options.getListElement?.();
    if (!listEl) return null;

    const items = Array.from(listEl.querySelectorAll<HTMLElement>('.preset-item'));
    if (items.length === 0) return null;

    let closestIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    items.forEach((item, index) => {
      const rect = item.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const distance = Math.abs(clientY - centerY);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  };

  const handlePointerMove = (e: PointerEvent) => {
    const pointerId = e.pointerId ?? 0;
    if (activePointerId === null || pointerId !== activePointerId) return;

    if (!isDragging.value) {
      if (pendingIndex === null) return;
      const threshold = options.dragThreshold ?? DEFAULT_DRAG_THRESHOLD;
      const distance = Math.hypot(e.clientX - startX, e.clientY - startY);
      if (distance < threshold) return;

      clearTimer();
      draggedIndex.value = pendingIndex;
      isDragging.value = true;
      isClickSuppressed.value = true;
      if (typeof window !== 'undefined') {
        window.getSelection?.()?.removeAllRanges?.();
      }
    }

    const targetIndex = resolveTargetIndex(e.clientY);
    if (targetIndex !== null && targetIndex !== draggedIndex.value) {
      dragOverIndex.value = targetIndex;
    } else {
      dragOverIndex.value = null;
    }
  };

  const detachWindowListeners = () => {
    if (typeof window !== 'undefined' && isWindowListening) {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('keydown', handleWindowKeyDown);
      isWindowListening = false;
    }
  };

  const cancelDrag = () => {
    detachWindowListeners();
    const wasDragging = isDragging.value;
    resetPendingState();
    if (wasDragging) {
      resetDragVisualState();
      suppressClickTemporarily();
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    const pointerId = e.pointerId ?? 0;
    if (activePointerId === null || pointerId !== activePointerId) return;

    detachWindowListeners();
    const wasDragging = isDragging.value;
    const fromIndex = draggedIndex.value;
    const fallbackTargetIndex = dragOverIndex.value;
    resetPendingState();

    if (wasDragging && fromIndex !== null) {
      const resolvedTarget = resolveTargetIndex(e.clientY);
      const targetIndex = resolvedTarget ?? fallbackTargetIndex;
      if (targetIndex !== null && targetIndex !== fromIndex) {
        options.onReorder(fromIndex, targetIndex);
      }
      resetDragVisualState();
      suppressClickTemporarily();
    }
  };

  const handlePointerCancel = (e: PointerEvent) => {
    const pointerId = e.pointerId ?? 0;
    if (activePointerId === null || pointerId !== activePointerId) return;
    cancelDrag();
  };

  const handleWindowKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cancelDrag();
    }
  };

  const attachWindowListeners = () => {
    if (typeof window !== 'undefined' && !isWindowListening) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerCancel);
      window.addEventListener('keydown', handleWindowKeyDown);
      isWindowListening = true;
    }
  };

  const onPointerDown = (e: PointerEvent, index: number) => {
    if (options.getPresetsCount() <= 1) return;
    if (e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest?.('.preset-actions, button, a, input')) {
      return;
    }

    detachWindowListeners();
    pendingIndex = index;
    activePointerId = e.pointerId ?? 0;
    startX = e.clientX;
    startY = e.clientY;
    attachWindowListeners();
  };

  const onListClickCapture = (e: MouseEvent) => {
    if (isDragging.value || isClickSuppressed.value) {
      e.stopPropagation?.();
      e.preventDefault?.();
    }
  };

  const cleanup = () => {
    detachWindowListeners();
    resetPendingState();
    resetDragVisualState();
    clearTimer();
    isClickSuppressed.value = false;
  };

  return {
    draggedIndex,
    dragOverIndex,
    isDragging,
    isClickSuppressed,
    onPointerDown,
    onListClickCapture,
    cancelDrag,
    cleanup,
    clearTimer,
  };
}
