import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { describe, it, expect } from 'vitest';
import { formatFileSize, getAllFiles, copyReleaseArtifacts } from '../copy-release.js';

describe('copy-release script', () => {
  describe('formatFileSize', () => {
    it('应正确格式化 0 字节', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('应正确格式化 KB 级别文件大小', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(2048)).toBe('2.00 KB');
    });

    it('应正确格式化 MB 级别文件大小', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.50 MB');
    });
  });

  describe('getAllFiles', () => {
    it('当目录不存在时应返回空数组', () => {
      const nonExistent = path.resolve(process.cwd(), '.temp/non-existent-dir-for-test');
      expect(getAllFiles(nonExistent)).toEqual([]);
    });
  });

  describe('copyReleaseArtifacts', () => {
    it('应正确筛选当前版本产物，并在存在同名文件时覆盖目标文件', () => {
      const testBaseDir = path.resolve(process.cwd(), `.temp/test-artifacts-${Date.now()}`);
      const mockBundleDir = path.join(testBaseDir, 'src-tauri/target/release/bundle');
      const mockNsisDir = path.join(mockBundleDir, 'nsis');
      const mockMsiDir = path.join(mockBundleDir, 'msi');
      const mockBinDir = path.join(testBaseDir, 'src-tauri/target/release');
      const mockTargetDir = path.join(testBaseDir, 'release');

      fs.mkdirSync(mockNsisDir, { recursive: true });
      fs.mkdirSync(mockMsiDir, { recursive: true });
      fs.mkdirSync(mockTargetDir, { recursive: true });

      // 准备测试文件：当前版本 1.1.0 与旧版本 1.0.0
      const currentSetupPath = path.join(mockNsisDir, 'Codex配置助手_1.1.0_x64-setup.exe');
      const oldSetupPath = path.join(mockNsisDir, 'Codex配置助手_1.0.0_x64-setup.exe');
      const currentMsiPath = path.join(mockMsiDir, 'Codex配置助手_1.1.0_x64_zh-CN.msi');
      const binPath = path.join(mockBinDir, 'codex-config-manager.exe');

      fs.writeFileSync(currentSetupPath, 'NEW_SETUP_CONTENT');
      fs.writeFileSync(oldSetupPath, 'OLD_SETUP_CONTENT');
      fs.writeFileSync(currentMsiPath, 'NEW_MSI_CONTENT');
      fs.writeFileSync(binPath, 'BINARY_CONTENT');

      // 在目标 release 目录中预先写入同名文件，用于验证覆盖逻辑
      const preExistingDest = path.join(mockTargetDir, 'Codex配置助手_1.1.0_x64-setup.exe');
      fs.writeFileSync(preExistingDest, 'OLD_CONTENT_THAT_SHOULD_BE_OVERWRITTEN');

      const result = copyReleaseArtifacts({
        rootDir: testBaseDir,
        targetDir: mockTargetDir,
        bundleDir: mockBundleDir,
        releaseBinDir: mockBinDir,
        version: '1.1.0',
      });

      expect(result.success).toBe(true);
      expect(result.copiedFiles.length).toBe(4);

      const copiedNames = result.copiedFiles.map((f) => f.name);
      expect(copiedNames).toContain('Codex配置助手_1.1.0_x64-setup.exe');
      expect(copiedNames).toContain('Codex配置助手_1.1.0_x64_zh-CN.msi');
      expect(copiedNames).toContain('codex-config-manager.exe');
      expect(copiedNames).toContain('Codex配置助手.exe');
      expect(copiedNames).not.toContain('Codex配置助手_1.0.0_x64-setup.exe');

      // 验证是否已执行覆盖
      const overwrittenContent = fs.readFileSync(preExistingDest, 'utf-8');
      expect(overwrittenContent).toBe('NEW_SETUP_CONTENT');

      // 验证中文命名便携版内容是否与原始二进制一致
      const chineseBinDest = path.join(mockTargetDir, 'Codex配置助手.exe');
      expect(fs.existsSync(chineseBinDest)).toBe(true);
      expect(fs.readFileSync(chineseBinDest, 'utf-8')).toBe('BINARY_CONTENT');
    });

    it('应支持自定义 productName 并生成对应命名的独立可执行文件', () => {
      const testBaseDir = path.resolve(process.cwd(), `.temp/test-custom-product-${Date.now()}`);
      const mockBinDir = path.join(testBaseDir, 'src-tauri/target/release');
      const mockTargetDir = path.join(testBaseDir, 'release');

      fs.mkdirSync(mockBinDir, { recursive: true });
      fs.mkdirSync(mockTargetDir, { recursive: true });

      const binPath = path.join(mockBinDir, 'codex-config-manager.exe');
      fs.writeFileSync(binPath, 'CUSTOM_BINARY_CONTENT');

      const result = copyReleaseArtifacts({
        rootDir: testBaseDir,
        targetDir: mockTargetDir,
        bundleDir: path.join(testBaseDir, 'empty-bundle'),
        releaseBinDir: mockBinDir,
        productName: '我的测试配置助手',
      });

      expect(result.success).toBe(true);
      const copiedNames = result.copiedFiles.map((f) => f.name);
      expect(copiedNames).toContain('codex-config-manager.exe');
      expect(copiedNames).toContain('我的测试配置助手.exe');

      const customBinDest = path.join(mockTargetDir, '我的测试配置助手.exe');
      expect(fs.existsSync(customBinDest)).toBe(true);
      expect(fs.readFileSync(customBinDest, 'utf-8')).toBe('CUSTOM_BINARY_CONTENT');
    });

    it('当某个目标文件被占用 (EBUSY) 时应捕获警告并继续复制其余产物', () => {
      const testBaseDir = path.resolve(process.cwd(), `.temp/test-ebusy-${Date.now()}`);
      const mockBinDir = path.join(testBaseDir, 'src-tauri/target/release');
      const mockTargetDir = path.join(testBaseDir, 'release');

      fs.mkdirSync(mockBinDir, { recursive: true });
      fs.mkdirSync(mockTargetDir, { recursive: true });

      const binPath = path.join(mockBinDir, 'codex-config-manager.exe');
      fs.writeFileSync(binPath, 'BINARY_FOR_EBUSY');

      const originalCopyFileSync = fs.copyFileSync;
      try {
        fs.copyFileSync = (src, dest) => {
          if (dest.endsWith('codex-config-manager.exe')) {
            const err = new Error('resource busy');
            err.code = 'EBUSY';
            throw err;
          }
          originalCopyFileSync(src, dest);
        };

        const result = copyReleaseArtifacts({
          rootDir: testBaseDir,
          targetDir: mockTargetDir,
          bundleDir: path.join(testBaseDir, 'empty-bundle'),
          releaseBinDir: mockBinDir,
          productName: 'Codex配置助手',
        });

        expect(result.success).toBe(true);
        expect(result.copiedFiles.map((f) => f.name)).toEqual(['Codex配置助手.exe']);
        expect(fs.existsSync(path.join(mockTargetDir, 'Codex配置助手.exe'))).toBe(true);
      } finally {
        fs.copyFileSync = originalCopyFileSync;
      }
    });

    it('当未找到任何候选产物时应返回 false', () => {
      const emptyBaseDir = path.resolve(process.cwd(), `.temp/test-empty-${Date.now()}`);
      fs.mkdirSync(emptyBaseDir, { recursive: true });

      const result = copyReleaseArtifacts({
        rootDir: emptyBaseDir,
        targetDir: path.join(emptyBaseDir, 'release'),
        bundleDir: path.join(emptyBaseDir, 'bundle'),
        releaseBinDir: path.join(emptyBaseDir, 'bin'),
        version: '1.1.0',
      });

      expect(result.success).toBe(false);
      expect(result.copiedFiles).toEqual([]);
    });
  });
});
