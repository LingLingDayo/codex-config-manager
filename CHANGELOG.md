---

## [0.2.0] - 2026-09-08

✨ Features
feat: 支持多中转站配置预设管理与一键快捷切换
feat: 支持通过环境变量配置默认中转站标识与真实地址
feat: 默认预设支持展示完整中转站地址并兼容标识识别
feat: 支持当前配置更多设置抽屉与自定义模型配置
feat: 移除默认URL占位并在预设中新增LingAI选项
feat: 在主窗口右下角展示轻量风格的版本号标记

⚡ Perf & Refactor
refactor: 前端重构为Vue 3与TypeScript及Sass模块化架构
refactor: 拆分后端lib.rs为模型与命令等多模块工程架构
refactor: 将预设列表收纳至快捷入口并简化交互布局
refactor: 将预设列表更名为配置库并移除数量徽标展示
refactor: 调整配置列表与保存配置文案并精简操作按钮
refactor: 移除抽屉自动聚焦并精简标题与提示属性

🌈 UI & Style
style: 调整主窗口为横向紧凑比例并消除底部留白
style: 移除设置抽屉顶部指示条并调整整体内边距
style: 优化模型标签说明文案与各配置项行高间距
style: 更新主操作按钮文案为使用配置并采用箭头图标
style: 调整当前配置卡片布局并将APIKey项移至BaseURL下方
style: 移除交互元素悬浮时的位移动画与重阴影效果

🔧 Fixes
fix: 修复配置保存与恢复默认的多项边界处理缺陷
fix: 修复Vite配置文件与TSConfig输入匹配问题

---

## [0.1.0] - 2026-08-20

✨ Features
feat: 初始化项目工程与基础配置管理框架

---
