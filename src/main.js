const { invoke } = window.__TAURI__.core;

// DOM 元素引用
let apiKeyInput;
let providerUrlInput;
let statusBadge;
let statusDot;
let statusText;
let toastEl;
let toastTimeout;
let presetListEl;
let presetCountBadge;
let emptyStateEl;

// 弹窗元素引用
let presetModalBackdrop;
let presetForm;
let modalTitle;
let modalPresetId;
let modalPresetName;
let modalPresetUrl;
let modalPresetKey;
let modalToggleKeyBtn;

// 内存状态
let currentConfig = {
  key: "",
  provider_url: "LingAI",
  is_enabled: false,
};
let presets = [];

// 辅助函数：显示提示消息
function showToast(message, type = "success") {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  
  // 触发动画
  toastEl.classList.remove("hidden");
  
  toastTimeout = setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2500);
}

// 辅助函数：URL 标准化处理
function normalizeUrl(url) {
  if (!url) return "";
  const trimmed = url.trim().replace(/\/+$/, "");
  if (
    trimmed === "https://lingai.linglingdayo.top" ||
    trimmed === "https://lingai.linglingdayo.top/v1" ||
    trimmed.toLowerCase() === "lingai"
  ) {
    return "LingAI";
  }
  return trimmed;
}

// 辅助函数：Key 脱敏显示
function maskKey(key) {
  if (!key) return "未设置 Key";
  if (key.length <= 8) return "••••••••";
  const start = key.slice(0, 4);
  const end = key.slice(-4);
  return `${start}••••${end}`;
}

// 更新状态角标
function fnUpdateStatusBadge(isEnabled) {
  currentConfig.is_enabled = isEnabled;
  if (isEnabled) {
    statusBadge.className = "status-indicator active";
    statusText.textContent = "API 已启用";
  } else {
    statusBadge.className = "status-indicator inactive";
    statusText.textContent = "未启用 API";
  }
}

// 从后端加载当前生效配置
async function loadConfig() {
  try {
    const config = await invoke("get_codex_config");
    currentConfig.key = config.key || "";
    let providerUrl = config.provider_url || "";
    providerUrl = normalizeUrl(providerUrl) || "LingAI";
    currentConfig.provider_url = providerUrl;
    currentConfig.is_enabled = config.is_enabled;

    apiKeyInput.value = currentConfig.key;
    providerUrlInput.value = currentConfig.provider_url;
    fnUpdateStatusBadge(config.is_enabled);

    // 更新预设列表中活跃项高亮
    renderPresetList();
  } catch (err) {
    showToast(`加载配置失败: ${err}`, "error");
    statusBadge.className = "status-indicator inactive";
    statusText.textContent = "加载失败";
  }
}

// 加载预设列表
async function loadPresets() {
  try {
    // 优先从 Rust 后端读取
    let backendPresets = await invoke("get_presets");
    if (backendPresets && Array.isArray(backendPresets) && backendPresets.length > 0) {
      presets = backendPresets;
    } else {
      // 降级从 localStorage 读取
      const localData = localStorage.getItem("codex_presets");
      if (localData) {
        presets = JSON.parse(localData);
        // 同步回后端
        await invoke("save_presets", { presets }).catch(() => {});
      } else {
        presets = [];
      }
    }
  } catch (e) {
    console.warn("从后端读取预设失败，尝试从本地缓存读取", e);
    const localData = localStorage.getItem("codex_presets");
    if (localData) {
      try {
        presets = JSON.parse(localData);
      } catch (err) {
        presets = [];
      }
    }
  }
  renderPresetList();
}

// 保存预设列表至持久化存储
async function persistPresets(newPresets) {
  presets = newPresets;
  localStorage.setItem("codex_presets", JSON.stringify(presets));
  try {
    await invoke("save_presets", { presets });
  } catch (e) {
    console.error("保存预设到后端失败:", e);
  }
  renderPresetList();
}

// 检查某项预设是否为当前正在生效的配置
function isPresetActive(preset) {
  if (!currentConfig.is_enabled) return false;
  if (!currentConfig.key || !preset.key) return false;
  return (
    preset.key.trim() === currentConfig.key.trim() &&
    normalizeUrl(preset.provider_url) === normalizeUrl(currentConfig.provider_url)
  );
}

// 渲染预设列表
function renderPresetList() {
  presetCountBadge.textContent = presets.length;

  if (presets.length === 0) {
    presetListEl.innerHTML = "";
    presetListEl.classList.add("hidden");
    emptyStateEl.classList.remove("hidden");
    return;
  }

  emptyStateEl.classList.add("hidden");
  presetListEl.classList.remove("hidden");
  presetListEl.innerHTML = "";

  presets.forEach((preset) => {
    const active = isPresetActive(preset);
    const card = document.createElement("div");
    card.className = `preset-card ${active ? "is-active" : ""}`;
    card.dataset.id = preset.id;

    card.innerHTML = `
      <div class="preset-card-top">
        <div class="preset-name-wrap">
          <span class="preset-name" title="${escapeHtml(preset.name)}">${escapeHtml(preset.name)}</span>
          ${
            active
              ? `<span class="active-tag"><span class="active-tag-dot"></span>生效中</span>`
              : ""
          }
        </div>
        <button type="button" class="btn-apply-preset" title="${active ? "当前已生效" : "一键切换至此配置并生效"}">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          <span>${active ? "当前使用中" : "立即使用"}</span>
        </button>
      </div>

      <div class="preset-card-body">
        <span class="preset-url-tag" title="${escapeHtml(preset.provider_url)}">${escapeHtml(normalizeUrl(preset.provider_url))}</span>
        <span class="preset-key-preview" title="点击右侧按钮复制完整 Key">${maskKey(preset.key)}</span>
        <button type="button" class="btn-copy-key" title="复制 API Key">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
        </button>
      </div>

      <div class="preset-card-footer">
        <span style="font-size: 0.7rem; color: var(--text-dim);">
          ${preset.updated_at ? new Date(preset.updated_at).toLocaleDateString() : ""}
        </span>
        <div class="preset-actions-right">
          <button type="button" class="btn-icon-action btn-edit" title="编辑此配置">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
          </button>
          <button type="button" class="btn-icon-action btn-delete" title="删除此配置">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;

    // 绑定卡片内按钮事件
    const applyBtn = card.querySelector(".btn-apply-preset");
    if (!active) {
      applyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        applyPreset(preset);
      });
    }

    const copyBtn = card.querySelector(".btn-copy-key");
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyToClipboard(preset.key, "API Key 已复制到剪贴板");
    });

    const editBtn = card.querySelector(".btn-edit");
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openPresetModal(preset);
    });

    const deleteBtn = card.querySelector(".btn-delete");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deletePreset(preset);
    });

    // 允许双击卡片快速使用
    card.addEventListener("dblclick", () => {
      if (!isPresetActive(preset)) {
        applyPreset(preset);
      }
    });

    presetListEl.appendChild(card);
  });
}

// 快捷使用配置项 (Quick Apply)
async function applyPreset(preset) {
  apiKeyInput.value = preset.key;
  providerUrlInput.value = normalizeUrl(preset.provider_url);

  try {
    await invoke("save_codex_config", {
      key: preset.key.trim(),
      providerUrl: preset.provider_url.trim(),
    });

    currentConfig.key = preset.key.trim();
    currentConfig.provider_url = normalizeUrl(preset.provider_url);
    currentConfig.is_enabled = true;
    fnUpdateStatusBadge(true);

    renderPresetList();
    showToast(`已快捷切换至「${preset.name}」并生效！`);
  } catch (err) {
    showToast(`快捷切换失败: ${err}`, "error");
  }
}

// 删除预设
async function deletePreset(preset) {
  const confirmed = window.confirm(`确定要删除配置预设「${preset.name}」吗？`);
  if (!confirmed) return;

  const newPresets = presets.filter((p) => p.id !== preset.id);
  await persistPresets(newPresets);
  showToast(`已删除预设「${preset.name}」`);
}

// 打开预设弹窗（新增或编辑）
function openPresetModal(preset = null) {
  if (preset) {
    modalTitle.textContent = "编辑中转站配置";
    modalPresetId.value = preset.id;
    modalPresetName.value = preset.name;
    modalPresetUrl.value = preset.provider_url;
    modalPresetKey.value = preset.key;
  } else {
    modalTitle.textContent = "新增中转站配置";
    modalPresetId.value = "";
    modalPresetName.value = "";
    modalPresetUrl.value = "LingAI";
    modalPresetKey.value = "";
  }

  // 重置 Key 输入框为 password 类型
  modalPresetKey.setAttribute("type", "password");
  modalToggleKeyBtn.style.color = "var(--text-muted)";

  presetModalBackdrop.classList.remove("hidden");
  modalPresetName.focus();
}

// 关闭弹窗
function closePresetModal() {
  presetModalBackdrop.classList.add("hidden");
  presetForm.reset();
}

// 另存当前配置为预设
function saveCurrentAsPreset() {
  const key = apiKeyInput.value.trim();
  const providerUrl = providerUrlInput.value.trim();

  if (!key) {
    showToast("请先在上方输入 API Key", "error");
    apiKeyInput.focus();
    return;
  }

  openPresetModal();
  modalPresetUrl.value = providerUrl || "LingAI";
  modalPresetKey.value = key;
  modalPresetName.value = providerUrl === "LingAI" ? "LingAI 常用配置" : "中转站配置";
  modalPresetName.select();
}

// 复制到剪贴板
function copyToClipboard(text, successMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => showToast(successMsg),
      () => showToast("复制失败，请手动选择复制", "error")
    );
  } else {
    // 降级使用 textarea 复制
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(successMsg);
    } catch (e) {
      showToast("复制失败", "error");
    }
    document.body.removeChild(ta);
  }
}

// 辅助函数：HTML 转义
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 保存当前表单配置 (Save Config)
async function saveConfig(e) {
  e.preventDefault();
  const key = apiKeyInput.value.trim();
  const providerUrl = providerUrlInput.value.trim();

  if (!key || !providerUrl) {
    showToast("Key 和模型提供商不能为空", "error");
    return;
  }

  try {
    await invoke("save_codex_config", { key, providerUrl });
    currentConfig.key = key;
    currentConfig.provider_url = normalizeUrl(providerUrl);
    currentConfig.is_enabled = true;
    showToast("配置保存并启用成功！");
    fnUpdateStatusBadge(true);
    renderPresetList();
  } catch (err) {
    showToast(`保存失败: ${err}`, "error");
  }
}

// 恢复默认
async function restoreDefault() {
  try {
    await invoke("restore_codex_default");
    apiKeyInput.value = "";
    providerUrlInput.value = "LingAI";
    currentConfig.key = "";
    currentConfig.provider_url = "LingAI";
    currentConfig.is_enabled = false;
    showToast("已成功恢复默认（已移除 API 登录）");
    fnUpdateStatusBadge(false);
    renderPresetList();
  } catch (err) {
    showToast(`恢复默认失败: ${err}`, "error");
  }
}

// DOM 加载完成后初始化
window.addEventListener("DOMContentLoaded", () => {
  // DOM 元素绑定
  apiKeyInput = document.querySelector("#api-key");
  providerUrlInput = document.querySelector("#provider-url");
  statusBadge = document.querySelector("#status-badge");
  statusDot = document.querySelector("#status-dot");
  statusText = document.querySelector("#status-text");
  toastEl = document.querySelector("#toast-message");
  presetListEl = document.querySelector("#preset-list");
  presetCountBadge = document.querySelector("#preset-count-badge");
  emptyStateEl = document.querySelector("#empty-state");

  presetModalBackdrop = document.querySelector("#preset-modal-backdrop");
  presetForm = document.querySelector("#preset-form");
  modalTitle = document.querySelector("#modal-title");
  modalPresetId = document.querySelector("#modal-preset-id");
  modalPresetName = document.querySelector("#modal-preset-name");
  modalPresetUrl = document.querySelector("#modal-preset-url");
  modalPresetKey = document.querySelector("#modal-preset-key");
  modalToggleKeyBtn = document.querySelector("#modal-toggle-key");

  const configForm = document.querySelector("#config-form");
  const restoreBtn = document.querySelector("#restore-btn");
  const toggleVisibilityBtn = document.querySelector("#toggle-key-visibility");
  const saveAsPresetBtn = document.querySelector("#save-as-preset-btn");
  const addPresetBtn = document.querySelector("#add-preset-btn");
  const emptyAddBtn = document.querySelector("#empty-add-btn");
  const modalCloseBtn = document.querySelector("#modal-close-btn");
  const modalCancelBtn = document.querySelector("#modal-cancel-btn");

  // 主表单事件绑定
  configForm.addEventListener("submit", saveConfig);
  restoreBtn.addEventListener("click", restoreDefault);
  saveAsPresetBtn.addEventListener("click", saveCurrentAsPreset);

  // 主输入框密码显隐切换
  toggleVisibilityBtn.addEventListener("click", () => {
    const type = apiKeyInput.getAttribute("type") === "password" ? "text" : "password";
    apiKeyInput.setAttribute("type", type);
    toggleVisibilityBtn.style.color = type === "text" ? "var(--accent-blue)" : "var(--text-muted)";
  });

  // 主提供商输入框自动映射
  providerUrlInput.addEventListener("input", () => {
    const val = providerUrlInput.value.trim().replace(/\/+$/, "");
    if (
      val === "https://lingai.linglingdayo.top" ||
      val === "https://lingai.linglingdayo.top/v1"
    ) {
      providerUrlInput.value = "LingAI";
    }
  });

  // 预设管理事件
  addPresetBtn.addEventListener("click", () => openPresetModal());
  emptyAddBtn.addEventListener("click", () => openPresetModal());
  modalCloseBtn.addEventListener("click", closePresetModal);
  modalCancelBtn.addEventListener("click", closePresetModal);

  // 弹窗内密码显隐切换
  modalToggleKeyBtn.addEventListener("click", () => {
    const type = modalPresetKey.getAttribute("type") === "password" ? "text" : "password";
    modalPresetKey.setAttribute("type", type);
    modalToggleKeyBtn.style.color = type === "text" ? "var(--accent-blue)" : "var(--text-muted)";
  });

  // 弹窗内快捷芯片点击填入
  const chips = document.querySelectorAll(".preset-chips .chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      modalPresetUrl.value = chip.getAttribute("data-url");
    });
  });

  // 模态弹窗表单提交
  presetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = modalPresetId.value;
    const name = modalPresetName.value.trim();
    const providerUrl = modalPresetUrl.value.trim();
    const key = modalPresetKey.value.trim();

    if (!name || !providerUrl || !key) {
      showToast("请填写完整的配置信息", "error");
      return;
    }

    let newPresets = [...presets];
    if (id) {
      // 编辑更新
      newPresets = newPresets.map((p) =>
        p.id === id
          ? {
              ...p,
              name,
              provider_url: providerUrl,
              key,
              updated_at: Date.now(),
            }
          : p
      );
      showToast(`配置「${name}」已更新！`);
    } else {
      // 新增
      const newPreset = {
        id: "preset_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        name,
        provider_url: providerUrl,
        key,
        updated_at: Date.now(),
      };
      newPresets.unshift(newPreset);
      showToast(`已添加新配置「${name}」！`);
    }

    await persistPresets(newPresets);
    closePresetModal();
  });

  // 点击遮罩层空白处关闭弹窗
  presetModalBackdrop.addEventListener("click", (e) => {
    if (e.target === presetModalBackdrop) {
      closePresetModal();
    }
  });

  // ESC 键关闭弹窗
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !presetModalBackdrop.classList.contains("hidden")) {
      closePresetModal();
    }
  });

  // 初始化加载数据
  loadConfig();
  loadPresets();
});
