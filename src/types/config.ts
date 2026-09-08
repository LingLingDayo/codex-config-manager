export interface CodexConfig {
  key: string;
  provider_url: string;
  is_enabled: boolean;
  model?: string;
}

export interface PresetConfig {
  id: string;
  name: string;
  key: string;
  provider_url: string;
  model?: string;
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
  model?: string;
}

export type ConfirmType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title?: string;
  message: string;
  detail?: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export interface ConfirmState extends ConfirmOptions {
  visible: boolean;
  resolve?: (value: boolean) => void;
}

