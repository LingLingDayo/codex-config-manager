import { invokeCommand, isTauriEnv } from './hybridStorage';

/**
 * 在系统默认浏览器中打开外部链接
 * 优先使用 Tauri opener 插件在外部浏览器中开启，降级模式下使用 window.open
 *
 * @param url 需要打开的目标 URL 地址
 * @returns 是否成功发起打开请求
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  const targetUrl = url?.trim();
  if (!targetUrl) {
    return false;
  }

  if (isTauriEnv()) {
    try {
      await invokeCommand('plugin:opener|open_url', { url: targetUrl });
      return true;
    } catch (err) {
      console.warn('通过 Tauri opener 打开链接失败，尝试降级为 window.open:', err);
    }
  }

  try {
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return true;
    }
  } catch (err) {
    console.error('打开外部链接失败:', err);
  }

  return false;
}
