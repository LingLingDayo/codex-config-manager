# Codex 配置助手 (Codex Config Manager)

<p align="center">
  <b>基于 Tauri 2 + Vue 3 + TypeScript 构建的轻量级 Codex 本地配置管理与快速中转切换工具</b>
</p>

---

## 📖 项目简介

**Codex 配置助手** 是一款专为 Codex 用户打造的桌面客户端工具，旨在简化本地 `~/.codex/config.toml` 与 `~/.codex/auth.json` 配置的管理流程。通过直观的图形化界面，用户可以轻松切换不同的 API Key、自定义模型中转服务商（Provider URL），并支持多套中转站预设方案的快速保存与一键应用。

---

## ✨ 核心特性

- ⚡ **当前生效配置管理**：实时读取并展示当前生效的 API Key、中转地址与启用状态，支持一键修改与保存生效。
- 📑 **多中转站预设方案**：支持增、删、改、查多个中转站配置，支持一键快捷切换与覆写当前生效配置。
- 🔄 **一键恢复官方默认**：提供便捷的重置入口，一键恢复 Codex 官方默认配置并移除自定义 API 鉴权。
- 🛡️ **开发与生产环境隔离**：开发调试模式下自动读写 `config_dev.toml` 与 `auth_dev.json`，避免影响本地生产配置。
- 🚀 **轻量高效体验**：采用 Tauri 2 架构配合 Vue 3 + TypeScript + SCSS，体积小巧、内存占用低、毫秒级响应。

---

## 🛠️ 技术栈

- **桌面端内核**：[Tauri 2](https://v2.tauri.app/) (Rust)
- **前端框架**：[Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **开发语言**：TypeScript / Rust
- **构建工具**：[Vite](https://vitejs.dev/)
- **样式处理**：Sass (SCSS)

---

## 🚀 快速上手

### 1. 环境准备

在开始之前，请确保本地已安装以下环境：

- [Node.js](https://nodejs.org/) (建议 `v18+` 或 `v20+`)
- [Rust](https://www.rust-lang.org/) 环境 (可通过 `rustup` 安装)
- 操作系统对应的 [Tauri 前置依赖](https://v2.tauri.app/start/prerequisites/)

### 2. 安装依赖

```bash
npm install
```

### 3. 本地开发

启动 Tauri 桌面端开发环境（会自动启动前端 Vite 服务并唤起应用窗口）：

```bash
npm run tauri dev
```

如仅需进行纯前端界面调试：

```bash
npm run dev
```

### 4. 项目打包

构建对应平台的生产环境安装包与可执行文件：

```bash
npm run tauri build
```

打包生成的文件通常位于 `src-tauri/target/release/bundle/` 目录下。

---

## 📂 目录结构

```text
codex-config-manager/
├── src/                      # 前端源码
│   ├── assets/               # 静态资源
│   ├── components/           # Vue 业务组件
│   │   ├── AppHeader.vue     # 顶部状态与标题
│   │   ├── CurrentConfigCard.vue # 当前配置卡片
│   │   ├── PresetListCard.vue    # 预设列表管理
│   │   ├── PresetModal.vue       # 预设编辑/新增弹窗
│   │   └── ToastMessage.vue      # 轻提示组件
│   ├── composables/          # 组合式函数 (业务逻辑封装)
│   ├── styles/               # 全局样式与 SCSS 变量
│   ├── types/                # TypeScript 类型定义
│   ├── utils/                # 通用工具函数
│   ├── App.vue               # 根组件
│   └── main.ts               # 前端入口文件
├── src-tauri/                # Tauri / Rust 后端源码
│   ├── src/
│   │   ├── lib.rs            # 配置读写核心逻辑与 IPC 命令
│   │   └── main.rs           # Tauri 入口
│   ├── capabilities/         # 权限配置
│   ├── tauri.conf.json       # Tauri 配置文件
│   └── Cargo.toml            # Rust 依赖声明
├── package.json
└── vite.config.ts
```

---

## 📄 配置文件机制说明

本工具会自动定位并管理当前系统用户主目录下的 `.codex` 配置文件夹：

- **生产模式**：读写 `~/.codex/config.toml` 与 `~/.codex/auth.json`
- **开发模式**：读写 `~/.codex/config_dev.toml` 与 `~/.codex/auth_dev.json`
- **预设存储**：中转站预设列表持久化保存在 `~/.codex/presets.json`（开发模式为 `presets_dev.json`）
