import { spawn } from 'node:child_process';
import process from 'node:process';

/**
 * 运行 vue-tsc 检查代码中是否存在未使用的变量、未使用的导入或类型错误
 */
export function runUnusedCheck() {
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'npx.cmd' : 'npx';

  console.log('\x1b[36mℹ 正在检查代码质量与未使用的变量...\x1b[0m');

  const child = spawn(cmd, ['vue-tsc', '--noEmit'], {
    stdio: 'inherit',
    shell: isWindows,
  });

  child.on('close', (code) => {
    const reset = '\x1b[0m';
    const red = '\x1b[31m';
    const green = '\x1b[32m';
    const bold = '\x1b[1m';
    const yellow = '\x1b[33m';

    if (code !== 0) {
      console.error(`
${red}${bold}============================================================${reset}
${red}${bold}❌ [代码检查未通过] 检测到未使用的变量、导入或类型错误！${reset}
${red}${bold}============================================================${reset}

  ${yellow}${bold}规范要求：${reset}
    项目工程化规范严格禁止残留未使用的变量与未使用的导入！
    请根据上方 TypeScript/Vue-TSC 报告的具体文件与行号，
    将未使用的变量/参数/导入彻底清理或移除后，方可再次提交。

${red}${bold}============================================================${reset}
`);
      process.exit(code || 1);
    } else {
      console.log(`\x1b[32m✔ [代码检查通过] 无未使用的变量与类型错误，准备就绪。\x1b[0m`);
      process.exit(0);
    }
  });

  child.on('error', (err) => {
    console.error(`\x1b[31m[ERROR] 启动 vue-tsc 失败: ${err.message}\x1b[0m`);
    process.exit(1);
  });
}

// CLI 执行入口
const isCli =
  process.argv[1] &&
  (process.argv[1].endsWith('verify-unused.js') ||
    process.argv[1].endsWith('verify-unused.mjs'));

if (isCli) {
  runUnusedCheck();
}
