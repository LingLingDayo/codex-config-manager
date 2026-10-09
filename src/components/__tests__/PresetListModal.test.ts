import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { Lightbulb } from '@lucide/vue';
import PresetListModal from '../PresetListModal.vue';
import type { CodexConfig } from '../../types/config';

const mockCurrentConfig: CodexConfig = {
  key: 'sk-test-123',
  provider_url: 'https://api.openai.com/v1',
  is_enabled: true,
};

describe('PresetListModal.vue component', () => {
  it('弹窗标题应正确显示为「配置列表」', () => {
    const wrapper = mount(PresetListModal, {
      props: {
        visible: true,
        presets: [],
        currentConfig: mockCurrentConfig,
      },
    });

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

    const closeBtn = wrapper.find('.btn-close');
    expect(closeBtn.exists()).toBe(true);
    await closeBtn.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('底部提示栏应正确渲染说明文案与提示图标', () => {
    const wrapper = mount(PresetListModal, {
      props: {
        visible: true,
        presets: [],
        currentConfig: mockCurrentConfig,
      },
    });

    const footerTip = wrapper.find('.footer-tip');
    expect(footerTip.exists()).toBe(true);
    expect(footerTip.text()).toContain('点击任意配置项即可立即切换并生效');
    expect(footerTip.find('.tip-icon').exists()).toBe(true);
    expect(wrapper.findComponent(Lightbulb).exists()).toBe(true);
  });

  it('存在多个预设时应渲染拖动手柄并支持拖拽重排', async () => {
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

    const items = wrapper.findAll('.preset-item');
    expect(items).toHaveLength(2);
    expect(items[0].attributes('draggable')).toBe('true');

    const dragHandles = wrapper.findAll('.drag-handle');
    expect(dragHandles).toHaveLength(2);

    // 模拟从 index 0 拖拽并放置在 index 1
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      getData: vi.fn(),
    };

    await items[0].trigger('dragstart', { dataTransfer });
    await items[1].trigger('dragover', { dataTransfer });
    expect(items[1].classes()).toContain('is-drag-over');

    await items[1].trigger('drop', { dataTransfer });

    expect(wrapper.emitted('reorder-presets')).toBeTruthy();
    expect(wrapper.emitted('reorder-presets')?.[0]).toEqual([0, 1]);
  });

  it('仅有 1 个预设时不显示拖拽手柄且不可拖拽', () => {
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

    const items = wrapper.findAll('.preset-item');
    expect(items).toHaveLength(1);
    expect(items[0].attributes('draggable')).toBe('false');
    expect(wrapper.find('.drag-handle').exists()).toBe(false);
  });
});

