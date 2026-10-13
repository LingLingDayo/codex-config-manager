import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../App.vue';
import { resetCodexConfigState } from '../composables/useCodexConfig';
import { resetPresetsState } from '../composables/usePresets';
import { resetSettingsState } from '../composables/useSettings';
import * as browserUtils from '../utils/browser';
import { GITHUB_REPO_URL, APP_VERSION } from '../constants/version';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('App.vue - 版本号展示与打开 GitHub 测试', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    resetCodexConfigState();
    resetPresetsState();
    resetSettingsState();
  });

  it('渲染右下角版本号元素，且文本匹配当前版本', () => {
    const wrapper = mount(App);
    const versionEl = wrapper.find('.app-version');

    expect(versionEl.exists()).toBe(true);
    expect(versionEl.text()).toBe(APP_VERSION);
    expect(versionEl.attributes('title')).toContain(APP_VERSION);
    expect(versionEl.attributes('title')).toContain('GitHub');
  });

  it('点击右下角版本号时应调用 openExternalUrl 打开项目 GitHub 地址', async () => {
    const openSpy = vi.spyOn(browserUtils, 'openExternalUrl').mockResolvedValue(true);

    const wrapper = mount(App);
    const versionEl = wrapper.find('.app-version');
    expect(versionEl.exists()).toBe(true);

    await versionEl.trigger('click');

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(GITHUB_REPO_URL);
  });

  it('在版本号元素上按下 Enter 键时也应触发打开 GitHub 地址', async () => {
    const openSpy = vi.spyOn(browserUtils, 'openExternalUrl').mockResolvedValue(true);

    const wrapper = mount(App);
    const versionEl = wrapper.find('.app-version');

    await versionEl.trigger('keydown.enter');

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(GITHUB_REPO_URL);
  });
});
