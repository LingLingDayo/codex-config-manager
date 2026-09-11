import fs from 'node:fs';
import path from 'node:path';

/**
 * 支持的提交类型定义及其规范说明
 */
export const COMMIT_TYPES = {
  feat: '新增功能特性 (feature)',
  fix: '修复缺陷/Bug (bug fix)',
  docs: '文档变更 (documentation)',
  style: '代码格式/排版变更 (不影响代码运行)',
  refactor: '代码重构 (既非新特性也非修 Bug)',
  perf: '性能优化 (performance)',
  test: '增加或重构测试用例',
  build: '影响构建系统或外部依赖的改动',
  ci: '针对 CI 配置文件和脚本的改动',
  chore: '杂务、构建工具与辅助脚本的变动',
  revert: '撤销先前的提交',
};

/**
 * 校验单条提交信息文本
 *
 * @param {string} rawMsg 提交信息原始内容
 * @returns {{ valid: boolean; reason?: string; firstLine?: string }}
 */
export function verifyCommit(rawMsg) {
  if (!rawMsg || typeof rawMsg !== 'string') {
    return { valid: false, reason: '提交信息不能为空' };
  }

  // 过滤掉注释行 (# 开头) 与纯空白行，获取第一条有效标题行
  const lines = rawMsg
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !line.trim().startsWith('#') && line.trim().length > 0);

  if (lines.length === 0) {
    return { valid: false, reason: '提交信息不能为空' };
  }

  const firstLine = lines[0].trim();

  // 自动放行常见的合并与恢复提交
  if (/^(Merge branch|Merge remote-tracking branch|Revert ")/i.test(firstLine)) {
    return { valid: true, firstLine };
  }

  // 正则规则：^(revert: )?(<types>)(\(<scope>\))?: <description>
  const typePattern = Object.keys(COMMIT_TYPES).join('|');
  const commitRegex = new RegExp(
    `^(revert: )?(${typePattern})(\\([a-zA-Z0-9_/-]+\\))?:\\s*(.+)$`
  );

  const match = firstLine.match(commitRegex);
  if (!match) {
    // 细分错误原因
    if (!firstLine.includes(':')) {
      return {
        valid: false,
        firstLine,
        reason: '提交信息缺少冒号 ":"，格式应为 "<类型>: <描述>"（注意冒号后需有空格）',
      };
    }

    const colonIndex = firstLine.indexOf(':');
    const prefix = firstLine.slice(0, colonIndex).trim();
    const content = firstLine.slice(colonIndex + 1).trim();

    // 检查前缀是否符合合法的类型或类型(scope)
    const prefixRegex = new RegExp(`^(revert: )?(${typePattern})(\\([a-zA-Z0-9_/-]+\\))?$`);
    if (prefixRegex.test(prefix)) {
      if (!content) {
        return {
          valid: false,
          firstLine,
          reason: '冒号后必须包含具体的提交描述说明，不可为空',
        };
      }
    }

    return {
      valid: false,
      firstLine,
      reason: `未知的提交类型 "${prefix}"，请使用合法的规范类型（如 feat / fix / refactor 等）`,
    };
  }

  return { valid: true, firstLine };
}

/**
 * 格式化输出失败帮助信息
 *
 * @param {string} firstLine 不合规的提交信息
 * @param {string} reason 失败原因
 * @returns {string}
 */
export function formatErrorMessage(firstLine, reason) {
  const reset = '\x1b[0m';
  const red = '\x1b[31m';
  const green = '\x1b[32m';
  const yellow = '\x1b[33m';
  const cyan = '\x1b[36m';
  const bold = '\x1b[1m';

  const typesList = Object.entries(COMMIT_TYPES)
    .map(([key, desc]) => `    ${cyan}${key.padEnd(10)}${reset} ${desc}`)
    .join('\n');

  return `
${red}${bold}============================================================${reset}
${red}${bold}❌ [Git Commit-Msg 校验失败] 提交信息格式不符合规范！${reset}
${red}${bold}============================================================${reset}

  ${yellow}${bold}当前提交信息：${reset}
    "${firstLine}"

  ${yellow}${bold}拦截原因：${reset}
    ${red}${reason}${reset}

  ${yellow}${bold}提交规范标准格式：${reset}
    ${green}${bold}<类型>: <提交描述>${reset}
    ${green}${bold}<类型>(<可选作用域>): <提交描述>${reset}

  ${yellow}${bold}支持的提交类型 (Type)：${reset}
${typesList}

  ${yellow}${bold}合格示例：${reset}
    ${green}feat: 启动前检测应用安装路径并引导前往设置配置${reset}
    ${green}fix: 修复启动路径类型推导错误并精简探测短路逻辑${reset}
    ${green}refactor: 移除更多配置抽屉多余头部彻底释放垂直空间${reset}
    ${green}test(settings): 补充安装路径选择组件边界条件测试${reset}
${red}${bold}============================================================${reset}
`;
}

// CLI 执行逻辑
const isCli =
  process.argv[1] &&
  (process.argv[1].endsWith('verify-commit.js') ||
    process.argv[1].endsWith('verify-commit.mjs'));

if (isCli) {
  const targetFile =
    process.argv[2] || path.resolve(process.cwd(), '.git/COMMIT_EDITMSG');

  if (!fs.existsSync(targetFile)) {
    console.error(`\x1b[31m[ERROR] 找不到提交信息文件: ${targetFile}\x1b[0m`);
    process.exit(1);
  }

  const rawMsg = fs.readFileSync(targetFile, 'utf-8');
  const result = verifyCommit(rawMsg);

  if (!result.valid) {
    console.error(formatErrorMessage(result.firstLine || rawMsg.trim(), result.reason));
    process.exit(1);
  }

  console.log(`\x1b[32m✔ [Commit-Msg] 提交信息格式验证通过: "${result.firstLine}"\x1b[0m`);
}
