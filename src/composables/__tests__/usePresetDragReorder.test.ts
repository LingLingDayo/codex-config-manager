import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePresetDragReorder } from '../usePresetDragReorder';

describe('usePresetDragReorder composable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockDataTransfer = () => ({
    effectAllowed: '',
    dropEffect: '',
    setData: vi.fn(),
    getData: vi.fn(),
  });

  it('初始状态应全为空或 false', () => {
    const onReorder = vi.fn();
    const { draggedIndex, dragOverIndex, isDragging } = usePresetDragReorder({
      getPresetsCount: () => 3,
      onReorder,
    });

    expect(draggedIndex.value).toBeNull();
    expect(dragOverIndex.value).toBeNull();
    expect(isDragging.value).toBe(false);
  });

  it('当预设总数 <= 1 时，无法启动拖拽', () => {
    const onReorder = vi.fn();
    const { draggedIndex, isDragging, onDragStart } = usePresetDragReorder({
      getPresetsCount: () => 1,
      onReorder,
    });

    const mockEvent = {
      dataTransfer: createMockDataTransfer(),
    } as unknown as DragEvent;

    onDragStart(mockEvent, 0);

    expect(draggedIndex.value).toBeNull();
    expect(isDragging.value).toBe(false);
  });

  it('当预设总数 > 1 时，拖拽开始应记录 draggedIndex 并设置 dataTransfer', () => {
    const onReorder = vi.fn();
    const { draggedIndex, isDragging, onDragStart } = usePresetDragReorder({
      getPresetsCount: () => 3,
      onReorder,
    });

    const dataTransfer = createMockDataTransfer();
    const mockEvent = { dataTransfer } as unknown as DragEvent;

    onDragStart(mockEvent, 1);

    expect(draggedIndex.value).toBe(1);
    expect(isDragging.value).toBe(true);
    expect(dataTransfer.effectAllowed).toBe('move');
    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '1');
  });

  it('onDragOver 与 onDragEnter 应正确更新 dragOverIndex', () => {
    const onReorder = vi.fn();
    const { dragOverIndex, onDragStart, onDragOver, onDragEnter } = usePresetDragReorder({
      getPresetsCount: () => 3,
      onReorder,
    });

    const dataTransfer = createMockDataTransfer();
    const startEvent = { dataTransfer } as unknown as DragEvent;
    onDragStart(startEvent, 0);

    const overEvent = {
      preventDefault: vi.fn(),
      dataTransfer: createMockDataTransfer(),
    } as unknown as DragEvent;

    onDragOver(overEvent, 2);
    expect(dragOverIndex.value).toBe(2);

    onDragEnter(overEvent, 1);
    expect(dragOverIndex.value).toBe(1);

    // 拖到自己上面时不应标记 dragOver
    onDragOver(overEvent, 0);
    expect(dragOverIndex.value).toBeNull();
  });

  it('onDrop 应触发 onReorder 并清理状态', () => {
    const onReorder = vi.fn();
    const { draggedIndex, dragOverIndex, isDragging, onDragStart, onDrop } = usePresetDragReorder({
      getPresetsCount: () => 3,
      onReorder,
    });

    onDragStart({ dataTransfer: createMockDataTransfer() } as unknown as DragEvent, 0);
    expect(isDragging.value).toBe(true);

    const dropEvent = { preventDefault: vi.fn() } as unknown as DragEvent;
    onDrop(dropEvent, 2);

    expect(onReorder).toHaveBeenCalledWith(0, 2);
    expect(draggedIndex.value).toBeNull();
    expect(dragOverIndex.value).toBeNull();

    // 经过 250ms 延迟后 isDragging 变为 false
    vi.advanceTimersByTime(250);
    expect(isDragging.value).toBe(false);
  });

  it('onListDrop 在拖拽至容器空白处时应将目标移至末尾', () => {
    const onReorder = vi.fn();
    const { onDragStart, onListDrop } = usePresetDragReorder({
      getPresetsCount: () => 4,
      onReorder,
    });

    onDragStart({ dataTransfer: createMockDataTransfer() } as unknown as DragEvent, 1);

    const containerEl = document.createElement('div');
    const listDropEvent = {
      target: containerEl,
      currentTarget: containerEl,
      preventDefault: vi.fn(),
    } as unknown as DragEvent;

    onListDrop(listDropEvent);
    expect(onReorder).toHaveBeenCalledWith(1, 3);
  });

  it('在拖拽中或拖拽刚结束时 onListClickCapture 应拦截点击事件', () => {
    const onReorder = vi.fn();
    const { isDragging, isClickSuppressed, onDragStart, onDrop, onListClickCapture } = usePresetDragReorder({
      getPresetsCount: () => 3,
      onReorder,
    });

    const clickEvent = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    } as unknown as MouseEvent;

    // 初始状态下不拦截
    onListClickCapture(clickEvent);
    expect(clickEvent.stopPropagation).not.toHaveBeenCalled();

    // 拖拽开始后拦截
    onDragStart({ dataTransfer: createMockDataTransfer() } as unknown as DragEvent, 0);
    expect(isDragging.value).toBe(true);
    onListClickCapture(clickEvent);
    expect(clickEvent.stopPropagation).toHaveBeenCalled();
    expect(clickEvent.preventDefault).toHaveBeenCalled();

    // 放置后处于 isClickSuppressed 缓冲期依然拦截
    const dropEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as DragEvent;
    onDrop(dropEvent, 1);
    expect(isClickSuppressed.value).toBe(true);

    const postDropClickEvent = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    } as unknown as MouseEvent;
    onListClickCapture(postDropClickEvent);
    expect(postDropClickEvent.stopPropagation).toHaveBeenCalled();

    // 250ms 后缓冲期结束，不再拦截
    vi.advanceTimersByTime(250);
    expect(isClickSuppressed.value).toBe(false);

    const normalClickEvent = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    } as unknown as MouseEvent;
    onListClickCapture(normalClickEvent);
    expect(normalClickEvent.stopPropagation).not.toHaveBeenCalled();
  });
});
