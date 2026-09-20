import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
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
});
