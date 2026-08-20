export interface CodexConfig {
  key: string;
  provider_url: string;
  is_enabled: boolean;
}

export interface PresetConfig {
  id: string;
  name: string;
  key: string;
  provider_url: string;
  updated_at?: number;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

export interface PresetFormData {
  id?: string;
  name: string;
  provider_url: string;
  key: string;
}
