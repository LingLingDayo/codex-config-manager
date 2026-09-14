import { spawn } from 'node:child_process';
import process from 'node:process';
import { copyReleaseArtifacts } from './copy-release.js';

const isWindows = process.platform === 'win32';
const rawArgs = process.argv.slice(2);

// 使用 npx 执行项目内 @tauri-apps/cli
const cmd = isWindows ? 'npx.cmd' : 'npx';
const child = spawn(cmd, ['tauri', ...rawArgs], {
  stdio: 'inherit',
  shell: isWindows,
});

child.on('close', (code) => {
  // 当执行 build 命令成功退出时，自动将构建产物复制到 release 目录
  if (code === 0 && rawArgs.includes('build')) {
    try {
      copyReleaseArtifacts();
    } catch (err) {
      console.error('❌ 复制构建产物至 release 目录失败:', err);
    }
  }
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('❌ 执行 tauri 进程异常:', err);
  process.exit(1);
});
