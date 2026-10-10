import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CurrentConfigCard from '../CurrentConfigCard.vue';
import type { CodexConfig } from '../../types/config';

const mockConfig: CodexConfig = {
  key: 'sk-test-key-123456',
  provider_url: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  model_reasoning_effort: 'high',
  model_display_name: '4o 别名',
  model_aliases: [{ slug: 'gpt-4o', display_name: '4o 别名' }],
  is_enabled: true,
};

describe('CurrentConfigCard.vue component', () => {
  it('正确渲染保存配置按钮及其文案', () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
        isLaunching: false,
      },
    });

    const saveBtn = wrapper.find('button[type="submit"].btn-primary');
    expect(saveBtn.exists()).toBe(true);
    expect(saveBtn.text()).toContain('保存配置');
  });

  it('isLoading 为 true 时保存配置按钮显示保存中且处于禁用状态', () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: true,
        isLaunching: false,
      },
    });

    const saveBtn = wrapper.find('button[type="submit"].btn-primary');
    expect(saveBtn.attributes('disabled')).toBeDefined();
    expect(saveBtn.text()).toContain('保存中...');
  });

  it('点击启动按钮应触发 launch-app 事件，且具备指定 hover 提示', async () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
        isLaunching: false,
      },
    });

    const launchBtn = wrapper.find('.btn-launch');
    expect(launchBtn.exists()).toBe(true);
    expect(launchBtn.text()).toContain('启动 Codex');
    expect(launchBtn.attributes('title')).toBe('保存当前配置并启动 Codex/ChatGPT');

    await launchBtn.trigger('click');
    expect(wrapper.emitted('launch-app')).toBeTruthy();
    expect(wrapper.emitted('launch-app')?.[0]?.[0]).toEqual({
      key: mockConfig.key,
      providerUrl: mockConfig.provider_url,
      model: mockConfig.model,
      modelReasoningEffort: mockConfig.model_reasoning_effort,
      modelAliases: mockConfig.model_aliases,
    });
  });

  it('isLaunching 为 true 时启动按钮处于禁用状态且文案变为重启中', () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
        isLaunching: true,
      },
    });

    const launchBtn = wrapper.find('.btn-launch');
    expect(launchBtn.attributes('disabled')).toBeDefined();
    expect(launchBtn.text()).toContain('重启中...');
  });

  it('更多配置按钮仅为图标，且具备更多配置 hover 提示', async () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
      },
    });

    const moreBtn = wrapper.find('.btn-more');
    expect(moreBtn.exists()).toBe(true);
    expect(moreBtn.text()).toBe(''); // 纯图标无文字
    expect(moreBtn.attributes('title')).toBe('更多配置');
  });

  it('恢复默认按钮仅为图标，且具备恢复默认配置 hover 提示与触发 restore-default', async () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
      },
    });

    const restoreBtn = wrapper.find('.btn-restore');
    expect(restoreBtn.exists()).toBe(true);
    expect(restoreBtn.text()).toBe(''); // 纯图标无文字
    expect(restoreBtn.attributes('title')).toBe('恢复默认配置（清除中转配置，恢复后将变成使用账号登录）');

    await restoreBtn.trigger('click');
    expect(wrapper.emitted('restore-default')).toBeTruthy();
  });

  it('当输入配置匹配已保存的预设时，卡片头部的保存按钮呈现已保存高亮与填充状态', async () => {
    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
        presets: [
          {
            id: 'preset_1',
            name: '现有预设',
            provider_url: mockConfig.provider_url,
            key: mockConfig.key,
            updated_at: Date.now(),
          },
        ],
      },
    });

    const headerSaveBtn = wrapper.find('.card-header .btn-text-action');
    expect(headerSaveBtn.exists()).toBe(true);
    expect(headerSaveBtn.classes()).toContain('is-saved');

    // 修改 key 使其不匹配任何预设
    const keyInput = wrapper.find('#api-key');
    await keyInput.setValue('sk-different-key');

    expect(headerSaveBtn.classes()).not.toContain('is-saved');
  });

  it('当当前配置与匹配预设内容一致时文案为收藏配置，修改内容后文案变为更新配置', async () => {
    const matchingFullPreset = {
      id: 'preset_full',
      name: '完全匹配预设',
      provider_url: mockConfig.provider_url,
      key: mockConfig.key,
      model: mockConfig.model,
      model_reasoning_effort: mockConfig.model_reasoning_effort,
      model_aliases: mockConfig.model_aliases,
    };

    const wrapper = mount(CurrentConfigCard, {
      props: {
        config: mockConfig,
        isLoading: false,
        presets: [matchingFullPreset],
      },
    });

    const headerSaveBtn = wrapper.find('.card-header .btn-text-action');
    // 初始状态下全部内容完全一致，文案应为“收藏配置”
    expect(headerSaveBtn.text()).toContain('收藏配置');

    // 打开抽屉或修改 customModel
    const drawer = wrapper.findComponent({ name: 'ConfigDrawer' });
    expect(drawer.exists()).toBe(true);

    // 模拟在抽屉中修改模型为 o3-mini
    drawer.vm.$emit('update:modelValue', 'o3-mini');
    await wrapper.vm.$nextTick();

    // 修改后完整配置与预设不一致，文案应变为“更新配置”
    expect(headerSaveBtn.text()).toContain('更新配置');

    // 恢复为原有模型后，文案应恢复为“收藏配置”
    drawer.vm.$emit('update:modelValue', mockConfig.model);
    await wrapper.vm.$nextTick();

    expect(headerSaveBtn.text()).toContain('收藏配置');
  });
});
