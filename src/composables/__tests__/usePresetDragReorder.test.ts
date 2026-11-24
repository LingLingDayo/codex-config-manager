import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePresetDragReorder } from '../usePresetDragReorder';

function createListContainer(itemRects: Array<{ top: number; height: number }>): HTMLElement {
  const container = document.createElement('div');
  container.className = 'preset-list';
  itemRects.forEach(({ top, height }) => {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.getBoundingClientRect = () =>
      ({
        top,
        bottom: top + height,
        height,
        left: 0,
        right: 400,
        width: 400,
        x: 0,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect;
    container.appendChild(item);
  });
  return container;
}

function createPointerEvent(
  type: string,
  options: {
    clientX?: number;
    clientY?: number;
    button?: number;
    pointerId?: number;
    target?: HTMLElement;
  } = {}
): PointerEvent {
  const event = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
    button: options.button ?? 0,
    pointerId: options.pointerId ?? 1,
  });
  if (options.target) {
    Object.defineProperty(event, 'target', { value: options.target });
  }
  return event;
}

describe('usePresetDragReorder composable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初始状态应全为空或 false', () => {
    const onReorder = vi.fn();
    const { draggedIndex, dragOverIndex, isDragging, isClickSuppressed } = usePresetDragReorder({
      getPresetsCount: () => 3,
      onReorder,
    });

    expect(draggedIndex.value).toBeNull();
    expect(dragOverIndex.value).toBeNull();
    expect(isDragging.value).toBe(false);
    expect(isClickSuppressed.value).toBe(false);
  });

  it('当预设总数 <= 1 时，无法启动拖拽', () => {
    const onReorder = vi.fn();
    const listEl = createListContainer([{ top: 0, height: 50 }]);
    const { draggedIndex, isDragging, onPointerDown, cleanup } = usePresetDragReorder({
      getPresetsCount: () => 1,
      getListElement: () => listEl,
      onReorder,
    });

    onPointerDown(createPointerEvent('pointerdown', { clientX: 50, clientY: 25 }), 0);
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 50, clientY: 80 }));

    expect(draggedIndex.value).toBeNull();
    expect(isDragging.value).toBe(false);
    cleanup();
  });

  it('非左键或点击右侧操作按钮区域时应忽略拖拽', () => {
    const onReorder = vi.fn();
    const listEl = createListContainer([
      { top: 0, height: 50 },
      { top: 56, height: 50 },
    ]);
    const actionsEl = document.createElement('div');
    actionsEl.className = 'preset-actions';
    const actionBtn = document.createElement('button');
    actionsEl.appendChild(actionBtn);
    listEl.firstElementChild?.appendChild(actionsEl);

    const { isDragging, onPointerDown, cleanup } = usePresetDragReorder({
      getPresetsCount: () => 2,
      getListElement: () => listEl,
      onReorder,
    });

    onPointerDown(createPointerEvent('pointerdown', { clientX: 50, clientY: 25, button: 2 }), 0);
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 50, clientY: 80 }));
    expect(isDragging.value).toBe(false);

    onPointerDown(
      createPointerEvent('pointerdown', { clientX: 350, clientY: 25, target: actionBtn }),
      0
    );
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 350, clientY: 80 }));
    expect(isDragging.value).toBe(false);
    cleanup();
  });

  it('移动距离小于阈值时不应触发拖拽且不拦截点击', () => {
    const onReorder = vi.fn();
    const listEl = createListContainer([
      { top: 0, height: 50 },
      { top: 56, height: 50 },
    ]);
    const { draggedIndex, isDragging, isClickSuppressed, onPointerDown, cleanup } =
      usePresetDragReorder({
        getPresetsCount: () => 2,
        getListElement: () => listEl,
        onReorder,
      });

    onPointerDown(createPointerEvent('pointerdown', { clientX: 100, clientY: 25 }), 0);
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 102, clientY: 28 }));

    expect(isDragging.value).toBe(false);
    expect(draggedIndex.value).toBeNull();

    window.dispatchEvent(createPointerEvent('pointerup', { clientX: 102, clientY: 28 }));

    expect(onReorder).not.toHaveBeenCalled();
    expect(isClickSuppressed.value).toBe(false);
    cleanup();
  });

  it('达到拖拽阈值后应按垂直中点实时更新 dragOverIndex，松手触发 onReorder', () => {
    const onReorder = vi.fn();
    const listEl = createListContainer([
      { top: 0, height: 50 },   // center 25
      { top: 56, height: 50 },  // center 81
      { top: 112, height: 50 }, // center 137
    ]);

    const { draggedIndex, dragOverIndex, isDragging, onPointerDown, cleanup } =
      usePresetDragReorder({
        getPresetsCount: () => 3,
        getListElement: () => listEl,
        onReorder,
      });

    onPointerDown(createPointerEvent('pointerdown', { clientX: 100, clientY: 25 }), 0);

    // 向下移动到第 2 项与第 3 项的间隙靠第 3 项侧
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 100, clientY: 110 }));
    expect(isDragging.value).toBe(true);
    expect(draggedIndex.value).toBe(0);
    expect(dragOverIndex.value).toBe(2);

    // 拖回第 2 项中点
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 100, clientY: 81 }));
    expect(dragOverIndex.value).toBe(1);

    // 拖回自身时 dragOverIndex 为 null
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 100, clientY: 20 }));
    expect(dragOverIndex.value).toBeNull();

    // 拖至列表底部外侧应命中最后一项并触发重排
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 100, clientY: 220 }));
    expect(dragOverIndex.value).toBe(2);

    window.dispatchEvent(createPointerEvent('pointerup', { clientX: 100, clientY: 220 }));

    expect(onReorder).toHaveBeenCalledWith(0, 2);
    expect(draggedIndex.value).toBeNull();
    expect(dragOverIndex.value).toBeNull();
    expect(isDragging.value).toBe(false);
    cleanup();
  });

  it('拖拽松手后在缓冲期内应通过 onListClickCapture 拦截点击事件', () => {
    const onReorder = vi.fn();
    const listEl = createListContainer([
      { top: 0, height: 50 },
      { top: 56, height: 50 },
    ]);

    const { isDragging, isClickSuppressed, onPointerDown, onListClickCapture, cleanup } =
      usePresetDragReorder({
        getPresetsCount: () => 2,
        getListElement: () => listEl,
        onReorder,
      });

    const initialClick = { stopPropagation: vi.fn(), preventDefault: vi.fn() } as unknown as MouseEvent;
    onListClickCapture(initialClick);
    expect(initialClick.stopPropagation).not.toHaveBeenCalled();

    onPointerDown(createPointerEvent('pointerdown', { clientX: 100, clientY: 25 }), 0);
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 100, clientY: 85 }));
    expect(isDragging.value).toBe(true);

    const draggingClick = { stopPropagation: vi.fn(), preventDefault: vi.fn() } as unknown as MouseEvent;
    onListClickCapture(draggingClick);
    expect(draggingClick.stopPropagation).toHaveBeenCalled();
    expect(draggingClick.preventDefault).toHaveBeenCalled();

    window.dispatchEvent(createPointerEvent('pointerup', { clientX: 100, clientY: 85 }));
    expect(isDragging.value).toBe(false);
    expect(isClickSuppressed.value).toBe(true);

    const postDropClick = { stopPropagation: vi.fn(), preventDefault: vi.fn() } as unknown as MouseEvent;
    onListClickCapture(postDropClick);
    expect(postDropClick.stopPropagation).toHaveBeenCalled();

    vi.advanceTimersByTime(250);
    expect(isClickSuppressed.value).toBe(false);

    const normalClick = { stopPropagation: vi.fn(), preventDefault: vi.fn() } as unknown as MouseEvent;
    onListClickCapture(normalClick);
    expect(normalClick.stopPropagation).not.toHaveBeenCalled();
    cleanup();
  });

  it('pointercancel 或按下 Escape 键应取消拖拽而不触发 onReorder', () => {
    const onReorder = vi.fn();
    const listEl = createListContainer([
      { top: 0, height: 50 },
      { top: 56, height: 50 },
    ]);

    const { draggedIndex, dragOverIndex, isDragging, onPointerDown, cleanup } =
      usePresetDragReorder({
        getPresetsCount: () => 2,
        getListElement: () => listEl,
        onReorder,
      });

    // 通过 Escape 取消
    onPointerDown(createPointerEvent('pointerdown', { clientX: 100, clientY: 25 }), 0);
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 100, clientY: 80 }));
    expect(isDragging.value).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onReorder).not.toHaveBeenCalled();
    expect(isDragging.value).toBe(false);
    expect(draggedIndex.value).toBeNull();
    expect(dragOverIndex.value).toBeNull();

    // 通过 pointercancel 取消
    onPointerDown(createPointerEvent('pointerdown', { clientX: 100, clientY: 25 }), 0);
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 100, clientY: 80 }));
    expect(isDragging.value).toBe(true);

    window.dispatchEvent(createPointerEvent('pointercancel', { clientX: 100, clientY: 80 }));
    expect(onReorder).not.toHaveBeenCalled();
    expect(isDragging.value).toBe(false);
    cleanup();
  });
});
