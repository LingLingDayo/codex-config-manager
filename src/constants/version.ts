/**
 * 应用程序版本号常数
 * 在 Vite 构建时由 package.json 的 version 自动注入
 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v1.0.0';
