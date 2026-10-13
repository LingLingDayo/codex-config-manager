/**
 * 应用程序版本号常数
 * 在 Vite 构建时由 package.json 的 version 自动注入
 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v1.2.0';

/**
 * 项目 GitHub 主页仓库地址
 */
export const GITHUB_REPO_URL = 'https://github.com/LingLingDayo/codex-config-manager';

