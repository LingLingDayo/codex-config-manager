import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { Lightbulb } from '@lucide/vue';
import PresetListModal from '../PresetListModal.vue';
import type { CodexConfig } from '../../types/config';

const mockCurrentConfig: CodexConfig = {
  key: 'sk-test-123',
  provider_url: 'https://api.openai.com/v1',
  is_enabled: true,
};

function mockItemRect(el: Element, top: number, height = 50) {
  (el as HTMLElement).getBoundingClientRect = () =>
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
}

describe('PresetListModal.vue component', () => {
  const wrappers: Array<ReturnType<typeof mount>> = [];

  afterEach(() => {
    wrappers.forEach((w) => w.unmount());
    wrappers.length = 0;
  });

  it('弹窗标题应正确显示为「配置列表」', () => {
    const wrapper = mount(PresetListModal, {
      props: {
        visible: true,
        presets: [],
        currentConfig: mockCurrentConfig,
      },
    });
    wrappers.push(wrapper);

    const title = wrapper.find('.modal-header h3');
    expect(title.exists()).toBe(true);
    expect(title.text()).toBe('配置列表');
  });

  it('点击关闭按钮或按 ESC 键触发 close 事件', async () => {
    const wrapper = mount(PresetListModal, {
      props: {
        visible: true,
        presets: [],
        currentConfig: mockCurrentConfig,
      },
    });
    wrappers.push(wrapper);

    const closeBtn = wrapper.find('.btn-close');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('底部提示栏应正确渲染说明文案与提示图标', () => {
    const wrapper = mount(PresetListModal, {
      props: {
        visible: true,
        presets: [],
        currentConfig: mockCurrentConfig,
      },
    });
    wrappers.push(wrapper);

    const footerTip = wrapper.find('.footer-tip');
    expect(footerTip.exists()).toBe(true);
    expect(footerTip.text()).toContain('点击任意配置项即可立即切换并生效');
    expect(footerTip.find('.tip-icon').exists()).toBe(true);
    expect(wrapper.findComponent(Lightbulb).exists()).toBe(true);
  });

  it('存在多个预设时整项卡片支持指针拖拽重排且松手后不误触切换', async () => {
    const mockPresets = [
      { id: 'p1', name: '预设 1', provider_url: 'https://p1.com', key: 'k1' },
      { id: 'p2', name: '预设 2', provider_url: 'https://p2.com', key: 'k2' },
    ];

    const wrapper = mount(PresetListModal, {
      props: {
        visible: true,
        presets: mockPresets,
        currentConfig: mockCurrentConfig,
      },
    });
    wrappers.push(wrapper);

    const items = wrapper.findAll('.preset-item');
    expect(items).toHaveLength(2);
    expect(items[0].attributes('data-draggable')).toBe('true');
    expect(items[1].attributes('data-draggable')).toBe('true');
    expect(items[0].attributes('draggable')).toBe('false');

    mockItemRect(items[0].element, 100, 50);
    mockItemRect(items[1].element, 156, 50);

    items[0].element.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 100,
        clientY: 125,
        button: 0,
        pointerId: 1,
      })
    );

    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 100,
        clientY: 180,
        pointerId: 1,
      })
    );
    await wrapper.vm.$nextTick();

    expect(items[0].classes()).toContain('is-dragging');
    expect(items[1].classes()).toContain('is-drag-over');

    window.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        clientX: 100,
        clientY: 180,
        pointerId: 1,
      })
    );
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('reorder-presets')).toBeTruthy();
    expect(wrapper.emitted('reorder-presets')?.[0]).toEqual([0, 1]);

    // 拖拽放置后立即点击目标项，绝不应误触发 apply-preset 事件
    await items[1].trigger('click');
    expect(wrapper.emitted('apply-preset')).toBeFalsy();
  });

  it('拖拽过程中按 ESC 仅取消拖拽而不关闭弹窗', async () => {
    const mockPresets = [
      { id: 'p1', name: '预设 1', provider_url: 'https://p1.com', key: 'k1' },
      { id: 'p2', name: '预设 2', provider_url: 'https://p2.com', key: 'k2' },
    ];

    const wrapper = mount(PresetListModal, {
      props: {
        visible: true,
        presets: mockPresets,
        currentConfig: mockCurrentConfig,
      },
    });
    wrappers.push(wrapper);

    const items = wrapper.findAll('.preset-item');
    mockItemRect(items[0].element, 100, 50);
    mockItemRect(items[1].element, 156, 50);

    items[0].element.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: 100,
        clientY: 125,
        button: 0,
        pointerId: 1,
      })
    );
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 100,
        clientY: 180,
        pointerId: 1,
      })
    );
    await wrapper.vm.$nextTick();
    expect(items[0].classes()).toContain('is-dragging');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.vm.$nextTick();

    expect(items[0].classes()).not.toContain('is-dragging');
    expect(wrapper.emitted('reorder-presets')).toBeFalsy();
    expect(wrapper.emitted('close')).toBeFalsy();
  });

  it('仅有 1 个预设时卡片不可拖拽', () => {
    const singlePreset = [
      { id: 'p1', name: '单个预设', provider_url: 'https://p1.com', key: 'k1' },
    ];

    const wrapper = mount(PresetListModal, {
      props: {
        visible: true,
        presets: singlePreset,
        currentConfig: mockCurrentConfig,
      },
    });
    wrappers.push(wrapper);

    const items = wrapper.findAll('.preset-item');
    expect(items).toHaveLength(1);
    expect(items[0].attributes('data-draggable')).toBe('false');
    expect(items[0].attributes('draggable')).toBe('false');
  });
});
