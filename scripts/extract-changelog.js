import fs from 'node:fs';
import path from 'node:path';

/**
 * 从 CHANGELOG.md 中提取指定版本（或最新版本）的发布日志
 *
 * @param {string} changelogContent CHANGELOG.md 的完整文本
 * @param {string} [targetTag=''] 触发的 tag 名称，例如 "v1.0.0" 或 "1.0.0"
 * @returns {string} 提取出的 Release Notes Markdown 内容
 */
export function extractChangelog(changelogContent, targetTag = '') {
  if (!changelogContent || typeof changelogContent !== 'string') {
    return 'No changelog content available.';
  }

  // 统一换行符为 \n
  const content = changelogContent.replace(/\r\n/g, '\n');
  const lines = content.split('\n');

  // 匹配所有二级标题 (## ...)
  const sections = [];
  const headingRegex = /^##\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(headingRegex);
    if (match) {
      sections.push({
        lineIndex: i,
        rawHeader: lines[i],
        title: match[1].trim(),
      });
    }
  }

  if (sections.length === 0) {
    return content.trim();
  }

  let selectedIndex = -1;

  // 如果指定了 tag，优先精确或模糊匹配该版本
  if (targetTag) {
    const cleanTag = targetTag.replace(/^v/i, '').trim();
    // 匹配如 "## [1.0.0]", "## [v1.0.0]", "## 1.0.0 - 2026-08-20", "## [1.0.0] - 2026-08-20"
    const versionRegex = new RegExp(`(^|\\[|v)${cleanTag.replace(/\./g, '\\.')}(\\]|\\s|$|-)`, 'i');

    for (let i = 0; i < sections.length; i++) {
      if (versionRegex.test(sections[i].title)) {
        selectedIndex = i;
        break;
      }
    }
  }

  // 如果没有找到匹配的 tag，提取第一个非空的有效版本块
  if (selectedIndex === -1) {
    // 默认选取第一个版本
    selectedIndex = 0;
  }

  const startLine = sections[selectedIndex].lineIndex;
  const endLine = selectedIndex + 1 < sections.length
    ? sections[selectedIndex + 1].lineIndex
    : lines.length;

  // 提取对应区块内容（排除标题行）
  const sectionLines = lines.slice(startLine + 1, endLine);

  // 过滤末尾可能存在的 Markdown 链接引用定义，如 `[1.0.0]: https://...`
  let filteredLines = sectionLines.filter(line => !/^\[.*?\]:\s*https?:\/\//.test(line));

  // 移除尾部多余的分隔线（如 `---`, `***` 等）及空白行
  while (filteredLines.length > 0) {
    const last = filteredLines[filteredLines.length - 1].trim();
    if (last === '' || /^(-{3,}|\*{3,}|_{3,})$/.test(last)) {
      filteredLines.pop();
    } else {
      break;
    }
  }

  const result = filteredLines.join('\n').trim();
  return result || 'No release notes provided for this version.';
}

// CLI 执行入口
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('extract-changelog.js') ||
  process.argv[1].endsWith('extract-changelog.mjs')
);

if (isDirectRun) {
  const changelogPath = process.argv[2] || 'CHANGELOG.md';
  const outputPath = process.argv[3] || 'RELEASE_NOTES.md';
  const targetTag = process.argv[4] || process.env.GITHUB_REF_NAME || '';

  const fullChangelogPath = path.resolve(process.cwd(), changelogPath);
  let notes = 'No changelog found.';

  if (fs.existsSync(fullChangelogPath)) {
    const rawContent = fs.readFileSync(fullChangelogPath, 'utf-8');
    notes = extractChangelog(rawContent, targetTag);
  } else {
    console.warn(`[WARN] Changelog file not found at ${fullChangelogPath}`);
  }

  // 输出到文件
  const fullOutputPath = path.resolve(process.cwd(), outputPath);
  fs.writeFileSync(fullOutputPath, notes, 'utf-8');
  console.log(`[INFO] Extracted changelog successfully written to: ${outputPath}`);
  console.log(`\n--- Release Notes Preview ---\n${notes}\n----------------------------\n`);

  // 如果在 GitHub Actions 环境中，写入 GITHUB_OUTPUT
  if (process.env.GITHUB_OUTPUT) {
    const delimiter = `EOF_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `changelog<<${delimiter}\n${notes}\n${delimiter}\n`
    );
    console.log('[INFO] Exported "changelog" output to GITHUB_OUTPUT');
  }
}
