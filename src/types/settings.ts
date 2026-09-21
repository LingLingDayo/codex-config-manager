export interface AppSettings {
  /**
   * Codex / ChatGPT 可执行文件完整路径或应用包 AppID。
   * 留空时由系统自动识别默认安装位置。
   */
  codex_path: string;

  /**
   * 启动应用前是否先检测并终止已运行的实例，默认为 true。
   */
  launch_kill_previous: boolean;

  /**
   * 在中转站配置弹窗中是否显示模型提供商快捷预设标签，默认为 true。
   */
  show_provider_presets: boolean;
}

export interface LaunchResult {
  success: boolean;
  killed_previous: boolean;
  message: string;
  target: string;
}
