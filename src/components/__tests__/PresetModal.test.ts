import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PresetModal from '../PresetModal.vue';
import { useSettings, resetSettingsState } from '../../composables/useSettings';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('PresetModal.vue component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetSettingsState();
  });

  it('visible 为 false 时不应渲染模态框', () => {
    const wrapper = mount(PresetModal, {
      props: {
        visible: false,
        title: '编辑中转站配置',
        initialData: null,
      },
    });

    expect(wrapper.find('.modal-backdrop').exists()).toBe(false);
  });

  it('show_provider_presets 为 true 时应渲染快捷标签', () => {
    const { settings } = useSettings();
    settings.value.show_provider_presets = true;

    const wrapper = mount(PresetModal, {
      props: {
        visible: true,
        title: '编辑中转站配置',
        initialData: null,
      },
    });

    expect(wrapper.find('.preset-chips').exists()).toBe(true);
    expect(wrapper.findAll('.chip').length).toBeGreaterThan(0);
  });

  it('show_provider_presets 为 false 时不应渲染快捷标签', () => {
    const { settings } = useSettings();
    settings.value.show_provider_presets = false;

    const wrapper = mount(PresetModal, {
      props: {
        visible: true,
        title: '编辑中转站配置',
        initialData: null,
      },
    });

    expect(wrapper.find('.preset-chips').exists()).toBe(false);
  });

  it('点击关闭按钮应触发 close 事件', async () => {
    const wrapper = mount(PresetModal, {
      props: {
        visible: true,
        title: '编辑中转站配置',
        initialData: null,
      },
    });

    await wrapper.find('.modal-close-btn').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('点击预设标签时应填充 URL', async () => {
    const { settings } = useSettings();
    settings.value.show_provider_presets = true;

    const wrapper = mount(PresetModal, {
      props: {
        visible: true,
        title: '编辑中转站配置',
        initialData: null,
      },
    });

    const chips = wrapper.findAll('.chip');
    // 点击 OpenAI 标签
    const openaiChip = chips.find((c) => c.text().includes('OpenAI'));
    expect(openaiChip).toBeDefined();
    await openaiChip!.trigger('click');

    const urlInput = wrapper.find<HTMLInputElement>('#modal-preset-url');
    expect(urlInput.element.value).toBe('https://api.openai.com/v1');
  });
});
