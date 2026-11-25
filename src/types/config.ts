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
  model_context_window?: number | null;
  model_auto_compact_token_limit?: number | null;
}

/** saveConfig 的可选模型配置载荷，未提供的字段不会写入 config.toml */
export interface SaveConfigPayload {
  model?: string;
  modelReasoningEffort?: string;
  modelDisplayName?: string;
  modelAliases?: ModelAlias[];
  modelContextWindow?: number | null;
  modelAutoCompactTokenLimit?: number | null;
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
  model_context_window?: number | null;
  model_auto_compact_token_limit?: number | null;
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
  model_context_window?: number | null;
  model_auto_compact_token_limit?: number | null;
}

export interface ModelReasoningSpec {
  default_level: string;
  supported_levels: string[];
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

export const CONTEXT_WINDOW_OPTIONS = [
  { label: '128k', value: '128000', description: '128,000 tokens' },
  { label: '200k', value: '200000', description: '200,000 tokens' },
  { label: '272k', value: '272000', description: '272,000 tokens' },
  { label: '400k', value: '400000', description: '400,000 tokens' },
  { label: '500k', value: '500000', description: '500,000 tokens' },
  { label: '1M', value: '1000000', description: '1,000,000 tokens' },
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

