import { invoke } from '@tauri-apps/api/core';

export function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
}

export function readLocalJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeLocalJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeLocalJson(key: string): void {
  localStorage.removeItem(key);
}

export async function invokeCommand<T>(command: string, args?: object): Promise<T> {
  if (args === undefined) {
    return invoke<T>(command);
  }
  return invoke<T>(command, args as Record<string, unknown>);
}
