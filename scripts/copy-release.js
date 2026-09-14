import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * 格式化文件字节大小为可读字符串 (B / KB / MB / GB)
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

/**
 * 递归收集指定目录下的所有文件路径
 *
 * @param {string} dir
 * @returns {string[]}
 */
export function getAllFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 将构建完成的桌面端程序与安装包自动复制到 release 目录（同名文件直接覆盖）
 *
 * @param {object} [options]
 * @param {string} [options.rootDir] 项目根目录
 * @param {string} [options.targetDir] 输出的目标 release 目录
 * @param {string} [options.bundleDir] Tauri 打包输出目录
 * @param {string} [options.releaseBinDir] Tauri 编译生成二进制所在目录
 * @param {string} [options.version] 指定匹配的目标版本号（默认读取 package.json）
 * @returns {{ success: boolean, copiedFiles: Array<{ name: string, src: string, dest: string, size: number }> }}
 */
export function copyReleaseArtifacts(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const targetDir = options.targetDir || path.resolve(rootDir, 'release');

  // 读取项目版本号
  let version = options.version;
  if (!version) {
    try {
      const pkgPath = path.resolve(rootDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        version = pkg.version;
      }
    } catch {
      version = '';
    }
  }

  const bundleDir = options.bundleDir || path.resolve(rootDir, 'src-tauri/target/release/bundle');
  const releaseBinDir = options.releaseBinDir || path.resolve(rootDir, 'src-tauri/target/release');

  // 确保 release 目录存在
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const candidateFileMap = new Map();

  // 1. 扫描 bundle 目录下当前版本的安装包（NSIS / MSI / DMG / AppImage 等）
  if (fs.existsSync(bundleDir)) {
    const allBundleFiles = getAllFiles(bundleDir);
    const validExtensions = new Set(['.exe', '.msi', '.deb', '.appimage', '.dmg', '.pkg', '.zip', '.tar.gz']);

    for (const filePath of allBundleFiles) {
      const ext = path.extname(filePath).toLowerCase();
      const filename = path.basename(filePath);

      if (validExtensions.has(ext)) {
        // 如果能获取到版本号，则严格筛选包含当前版本号的安装包，避免复制旧版本残留
        if (version) {
          if (filename.includes(version)) {
            candidateFileMap.set(filename, filePath);
          }
        } else {
          candidateFileMap.set(filename, filePath);
        }
      }
    }
  }

  // 2. 检查 target/release 目录下的可执行文件
  const possibleBinaries = [
    'codex-config-manager.exe',
    'codex-config-manager',
    'Codex配置助手.exe',
  ];

  for (const binName of possibleBinaries) {
    const binPath = path.join(releaseBinDir, binName);
    if (fs.existsSync(binPath) && fs.statSync(binPath).isFile()) {
      candidateFileMap.set(binName, binPath);
      break;
    }
  }

  if (candidateFileMap.size === 0) {
    console.warn(`\x1b[33m⚠ [发布归档] 未在 build 产物目录中找到版本 ${version || '当前'} 的程序文件。\x1b[0m`);
    return { success: false, copiedFiles: [] };
  }

  console.log(`\x1b[36m📦 正在将构建产物复制到 release 目录 (目标路径: ${targetDir})...\x1b[0m`);

  const copiedFiles = [];

  for (const [filename, srcPath] of candidateFileMap.entries()) {
    const destPath = path.join(targetDir, filename);

    // 复制文件（已有同名文件时直接覆盖）
    fs.copyFileSync(srcPath, destPath);

    const stats = fs.statSync(destPath);
    copiedFiles.push({
      name: filename,
      src: srcPath,
      dest: destPath,
      size: stats.size,
    });

    console.log(`  \x1b[32m✔ 已覆盖/复制: ${filename} (${formatFileSize(stats.size)})\x1b[0m`);
  }

  console.log(`\x1b[32m✨ [发布归档完成] 成功归档 ${copiedFiles.length} 个构建产物至 release 目录！\x1b[0m\n`);

  return { success: true, copiedFiles };
}

// 支持直接通过 node scripts/copy-release.js 运行
const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFilePath === invokedFilePath) {
  copyReleaseArtifacts();
}
