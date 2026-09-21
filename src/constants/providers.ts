import { DEFAULT_STATION_NAME, DEFAULT_STATION_URL } from '../utils/format';

export interface ProviderPreset {
  label: string;
  url: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  { label: DEFAULT_STATION_NAME, url: DEFAULT_STATION_URL },
  { label: 'OpenAI', url: 'https://api.openai.com/v1' },
  { label: 'DeepSeek', url: 'https://api.deepseek.com/v1' },
  { label: 'Moonshot', url: 'https://api.moonshot.cn/v1' },
  { label: '智谱 GLM', url: 'https://open.bigmodel.cn/api/paas/v4' },
];
