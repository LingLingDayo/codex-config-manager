const { invoke } = window.__TAURI__.core;

let apiKeyInput;
let providerUrlInput;
let statusBadge;
let statusDot;
let statusText;
let toastEl;
let toastTimeout;

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

// 更新状态角标
function fnUpdateStatusBadge(isEnabled) {
  if (isEnabled) {
    statusBadge.className = "status-indicator active";
    statusText.textContent = "API 已启用";
  } else {
    statusBadge.className = "status-indicator inactive";
    statusText.textContent = "未启用 API";
  }
}

// 从后端加载配置
async function loadConfig() {
  try {
    const config = await invoke("get_codex_config");
    apiKeyInput.value = config.key || "";
    let providerUrl = config.provider_url || "";
    const cleanUrl = providerUrl.trim().replace(/\/+$/, "");
    if (
      cleanUrl === "https://lingai.linglingdayo.top" ||
      cleanUrl === "https://lingai.linglingdayo.top/v1" ||
      cleanUrl.toLowerCase() === "lingai"
    ) {
      providerUrl = "LingAI";
    }
    providerUrlInput.value = providerUrl || "LingAI";
    fnUpdateStatusBadge(config.is_enabled);
  } catch (err) {
    showToast(`加载配置失败: ${err}`, "error");
    statusBadge.className = "status-indicator inactive";
    statusText.textContent = "加载失败";
  }
}

// 保存配置
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
    showToast("配置保存并启用成功！");
    fnUpdateStatusBadge(true);
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
    showToast("已成功恢复默认（已移除 API 登录）");
    fnUpdateStatusBadge(false);
  } catch (err) {
    showToast(`恢复默认失败: ${err}`, "error");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // 获取 DOM 元素
  apiKeyInput = document.querySelector("#api-key");
  providerUrlInput = document.querySelector("#provider-url");
  statusBadge = document.querySelector("#status-badge");
  statusDot = document.querySelector("#status-dot");
  statusText = document.querySelector("#status-text");
  toastEl = document.querySelector("#toast-message");

  const configForm = document.querySelector("#config-form");
  const restoreBtn = document.querySelector("#restore-btn");
  const toggleVisibilityBtn = document.querySelector("#toggle-key-visibility");

  // 绑定事件
  configForm.addEventListener("submit", saveConfig);
  restoreBtn.addEventListener("click", restoreDefault);

  // 监听提供商输入框的输入，如果输入的是特定 URL，直接显示成 LingAI
  providerUrlInput.addEventListener("input", () => {
    const val = providerUrlInput.value.trim().replace(/\/+$/, "");
    if (
      val === "https://lingai.linglingdayo.top" ||
      val === "https://lingai.linglingdayo.top/v1"
    ) {
      providerUrlInput.value = "LingAI";
    }
  });

  // 密码显示/隐藏切换
  toggleVisibilityBtn.addEventListener("click", () => {
    const type = apiKeyInput.getAttribute("type") === "password" ? "text" : "password";
    apiKeyInput.setAttribute("type", type);
    // 可选：改变眼睛图标的不透明度或样式
    toggleVisibilityBtn.style.color = type === "text" ? "var(--accent-blue)" : "var(--text-muted)";
  });

  // 载入配置
  loadConfig();
});
