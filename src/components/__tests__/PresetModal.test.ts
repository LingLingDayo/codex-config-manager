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

  it('默认情况下不显示更多配置，点击切换按钮后展开显示', async () => {
    const wrapper = mount(PresetModal, {
      props: {
        visible: true,
        title: '编辑中转站配置',
        initialData: null,
      },
    });

    const toggleBtn = wrapper.find('.more-config-toggle');
    expect(toggleBtn.exists()).toBe(true);
    expect(wrapper.find('.more-config-fields').exists()).toBe(false);

    // 点击展开
    await toggleBtn.trigger('click');
    expect(wrapper.find('.more-config-fields').exists()).toBe(true);
    expect(wrapper.find('#modal-preset-model').exists()).toBe(true);
    expect(wrapper.find('#modal-preset-reasoning').exists()).toBe(true);
    expect(wrapper.find('#modal-preset-display-name').exists()).toBe(true);

    // 再次点击收起
    await toggleBtn.trigger('click');
    expect(wrapper.find('.more-config-fields').exists()).toBe(false);
  });

  it('当 initialData 包含更多配置时应显示已配置徽章并在展开后正确回填', async () => {
    const wrapper = mount(PresetModal, {
      props: {
        visible: true,
        title: '编辑中转站配置',
        initialData: {
          id: 'p1',
          name: '高强度推理配置',
          provider_url: 'https://api.openai.com/v1',
          key: 'sk-test',
          model: 'gpt-5.6-sol',
          model_reasoning_effort: 'high',
          model_display_name: '5.6 Sol',
        },
      },
    });

    // 验证初始状态下折叠，但展示“已配置”徽章
    expect(wrapper.find('.configured-badge').exists()).toBe(true);
    expect(wrapper.find('.configured-badge').text()).toBe('已配置');

    // 展开并验证回填值
    await wrapper.find('.more-config-toggle').trigger('click');
    const modelInput = wrapper.find<HTMLInputElement>('#modal-preset-model');
    const displayNameInput = wrapper.find<HTMLInputElement>('#modal-preset-display-name');

    expect(modelInput.element.value).toBe('gpt-5.6-sol');
    expect(displayNameInput.element.value).toBe('5.6 Sol');
  });

  it('提交表单时应完整保存包含更多配置的预设数据', async () => {
    const wrapper = mount(PresetModal, {
      props: {
        visible: true,
        title: '新增中转站配置',
        initialData: null,
      },
    });

    // 填写基础必填项
    await wrapper.find('#modal-preset-name').setValue('主力模型');
    await wrapper.find('#modal-preset-url').setValue('https://api.example.com/v1');
    await wrapper.find('#modal-preset-key').setValue('sk-abc123456');

    // 展开更多配置并填写
    await wrapper.find('.more-config-toggle').trigger('click');
    await wrapper.find('#modal-preset-model').setValue('gpt-5.6-turbo');
    await wrapper.find('#modal-preset-display-name').setValue('Turbo 5.6');

    // 触发提交
    await wrapper.find('form.modal-form').trigger('submit.prevent');

    const emitted = wrapper.emitted('save');
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toEqual({
      id: undefined,
      name: '主力模型',
      provider_url: 'https://api.example.com/v1',
      key: 'sk-abc123456',
      model: 'gpt-5.6-turbo',
      model_reasoning_effort: '',
      model_display_name: 'Turbo 5.6',
    });
  });
});
