# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-20

### ✨ Features
- ⚡ **当前生效配置管理**：支持实时展示与保存 Codex API Key、中转地址（Provider URL）与启用状态。
- 📑 **多中转站预设管理**：支持自定义增删改查多个中转服务商预设，并支持一键应用覆写。
- 🔄 **一键重置**：支持快速恢复 Codex 官方默认配置并重置鉴权信息。
- 🛡️ **环境隔离**：区分开发与生产环境配置路径（`config.toml` 与 `config_dev.toml`），保障本地环境安全。
- 🎨 **现代化 UI 设计**：基于 Vue 3 + Sass 构建的高质感卡片布局与平滑动画反馈。

### 🔧 Improvements
- 优化前端组件模块化与组合式函数状态管理架构。
- 完善 Rust 端配置文件读写安全性与异常错误提示。

---

## [0.1.0] - 2026-08-10

### 🚀 Initial Release
- 项目原型初始化与基础框架搭建。
