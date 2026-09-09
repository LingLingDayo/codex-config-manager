import { describe, it, expect } from 'vitest';
import { extractChangelog } from '../extract-changelog.js';

describe('extractChangelog', () => {
  const sampleChangelog = `# 更新日志 (Changelog)

本项目的所有显著变更都将记录在此文件中。

---

## [Unreleased]
- 正在开发的一些草稿特性

---

## [1.0.0] - 2026-09-09

✨ Features
feat: 支持快捷启动与重启Codex客户端及进程生命周期调度
feat: 主卡片操作栏集成启动Codex按钮并支持自动保存当前配置

⚡ Perf & Refactor
refactor: 拆分生效配置卡片为头部与操作栏子组件

🔧 Fixes
fix: 修复进程检测命令行传参转义与单实例退出竞态

---

## [0.2.0] - 2026-09-08

✨ Features
feat: 支持多中转站配置预设管理与一键快捷切换

---

## 0.1.0 (2026-08-20)

✨ Features
feat: 初始化项目工程与基础配置管理框架

---

[1.0.0]: https://github.com/example/releases/tag/v1.0.0
[0.2.0]: https://github.com/example/releases/tag/v0.2.0
`;

  it('应该能准确通过带 v 前缀的 tag 提取版本日志', () => {
    const result = extractChangelog(sampleChangelog, 'v1.0.0');
    expect(result).toContain('feat: 支持快捷启动与重启Codex客户端及进程生命周期调度');
    expect(result).toContain('refactor: 拆分生效配置卡片为头部与操作栏子组件');
    expect(result).toContain('fix: 修复进程检测命令行传参转义与单实例退出竞态');
    expect(result).not.toContain('## [1.0.0]');
    expect(result).not.toContain('feat: 支持多中转站配置预设管理与一键快捷切换');
    expect(result).not.toContain('https://github.com');
  });

  it('应该能兼容不带 v 前缀的纯版本号', () => {
    const result = extractChangelog(sampleChangelog, '1.0.0');
    expect(result).toContain('feat: 支持快捷启动与重启Codex客户端及进程生命周期调度');
    expect(result).not.toContain('feat: 支持多中转站配置预设管理');
  });

  it('应该能支持 refs/tags/v* 格式的 Git 引用传参', () => {
    const result = extractChangelog(sampleChangelog, 'refs/tags/v0.2.0');
    expect(result).toContain('feat: 支持多中转站配置预设管理与一键快捷切换');
    expect(result).not.toContain('feat: 初始化项目工程与基础配置管理框架');
  });

  it('应该能支持非括号包裹的标题版本 (如 0.1.0)', () => {
    const result = extractChangelog(sampleChangelog, 'v0.1.0');
    expect(result).toContain('feat: 初始化项目工程与基础配置管理框架');
  });

  it('在未指定 tag 时应跳过 Unreleased 并自动选取第一个已发布版本', () => {
    const result = extractChangelog(sampleChangelog, '');
    expect(result).toContain('feat: 支持快捷启动与重启Codex客户端及进程生命周期调度');
    expect(result).not.toContain('正在开发的一些草稿特性');
  });

  it('当指定了不存在的 tag 时应返回友好的提示说明而不是静默展示旧版本', () => {
    const result = extractChangelog(sampleChangelog, 'v9.9.9');
    expect(result).toContain('9.9.9');
    expect(result).toContain('CHANGELOG.md 中暂未记录该版本的详细说明');
    expect(result).not.toContain('feat: 支持快捷启动与重启Codex客户端及进程生命周期调度');
  });

  it('输入空或非法文本时应能安全降级返回', () => {
    expect(extractChangelog('', 'v1.0.0')).toBe('No changelog content available.');
    // @ts-expect-error 测试非法入参防御
    expect(extractChangelog(null, 'v1.0.0')).toBe('No changelog content available.');
  });
});
