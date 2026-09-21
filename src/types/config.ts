export interface ModelAlias {
  slug: string;
  display_name: string;
}

export interface CodexConfig {
  key: string;
  provider_url: string;
  is_enabled: boolean;
  model?: string;
  model_reasoning_effort?: string;
  model_display_name?: string;
  model_aliases?: ModelAlias[];
}

/** saveConfig 的可选模型配置载荷，未提供的字段不会写入 config.toml */
export interface SaveConfigPayload {
  model?: string;
  modelReasoningEffort?: string;
  modelDisplayName?: string;
  modelAliases?: ModelAlias[];
}

/** 主配置卡片提交给编排层的表单快照 */
export interface ConfigFormPayload extends SaveConfigPayload {
  key: string;
  providerUrl: string;
}

export interface PresetConfig {
  id: string;
  name: string;
  key: string;
  provider_url: string;
  model?: string;
  model_reasoning_effort?: string;
  model_display_name?: string;
  model_aliases?: ModelAlias[];
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
  model_reasoning_effort?: string;
  model_display_name?: string;
  model_aliases?: ModelAlias[];
}

export const REASONING_EFFORT_OPTIONS = [
  { label: 'none', value: 'none', description: '不思考' },
  { label: 'minimal', value: 'minimal', description: '极低思考强度' },
  { label: 'low', value: 'low', description: '低思考强度 (快速响应)' },
  { label: 'medium', value: 'medium', description: '中等思考强度 (推荐平衡)' },
  { label: 'high', value: 'high', description: '高思考强度 (深入推理)' },
  { label: 'xhigh', value: 'xhigh', description: '极高思考强度 (超长推理)' },
  { label: 'max', value: 'max', description: '最大思考强度 (极限推理)' },
  { label: 'ultra', value: 'ultra', description: '极致思考强度 (自动委派)' },
];

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

