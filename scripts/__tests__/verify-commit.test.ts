import { describe, it, expect } from 'vitest';
import { verifyCommit, formatErrorMessage, COMMIT_TYPES } from '../verify-commit.js';

describe('verifyCommit', () => {
  it('应成功放行标准格式的常规提交', () => {
    expect(verifyCommit('feat: 启动前检测应用安装路径并引导前往设置配置').valid).toBe(true);
    expect(verifyCommit('fix: 修复启动路径类型推导错误并精简探测短路逻辑').valid).toBe(true);
    expect(verifyCommit('docs: 精简README目录结构聚焦高层模块划分').valid).toBe(true);
    expect(verifyCommit('refactor: 移除更多配置抽屉多余头部彻底释放垂直空间').valid).toBe(true);
    expect(verifyCommit('test: 修复环境探测测试以兼容CI干净运行环境').valid).toBe(true);
    expect(verifyCommit('chore: 更新依赖项与构建脚本').valid).toBe(true);
  });

  it('应成功放行包含作用域 (scope) 的提交', () => {
    expect(verifyCommit('feat(settings): 新增通用下拉选择输入组件').valid).toBe(true);
    expect(verifyCommit('fix(core/config): 修复空路径序列化异常').valid).toBe(true);
    expect(verifyCommit('test(unit): 补充边界情况断言').valid).toBe(true);
  });

  it('应成功放行 revert 开头的提交及 Git 默认的合并提交', () => {
    expect(verifyCommit('revert: feat: 回滚前序特性提交').valid).toBe(true);
    expect(verifyCommit('Merge branch \'main\' into dev').valid).toBe(true);
    expect(verifyCommit('Merge remote-tracking branch \'origin/main\'').valid).toBe(true);
    expect(verifyCommit('Revert "fix: 临时问题修补"').valid).toBe(true);
  });

  it('应能正确过滤 Git 注释行并提取首行实际内容', () => {
    const multiLineWithComments = `
# Please enter the commit message for your changes.
# Lines starting with '#' will be ignored.

feat: 规范思考强度选项列表顺序并补齐悬停说明

详细说明：
- 按照推荐度重新排布列表项
- 添加描述字段
`;
    const res = verifyCommit(multiLineWithComments);
    expect(res.valid).toBe(true);
    expect(res.firstLine).toBe('feat: 规范思考强度选项列表顺序并补齐悬停说明');
  });

  it('应拦截不合法的提交类型', () => {
    const res = verifyCommit('unknown: 这是一个非法类型的提交');
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('未知的提交类型 "unknown"');
  });

  it('应拦截缺少冒号的提交', () => {
    const res = verifyCommit('feat 新增某些功能');
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('提交信息缺少冒号');
  });

  it('应拦截冒号后缺少描述的提交', () => {
    const res = verifyCommit('feat:   ');
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('不可为空');
  });

  it('应拦截空或纯注释的提交信息', () => {
    expect(verifyCommit('').valid).toBe(false);
    expect(verifyCommit('   \n\n  ').valid).toBe(false);
    expect(verifyCommit('# 只有注释行').valid).toBe(false);
    // @ts-expect-error 测试异常入参
    expect(verifyCommit(null).valid).toBe(false);
  });

  it('formatErrorMessage 应能生成包含错误原因及类型的格式化提示', () => {
    const errorMsg = formatErrorMessage('bad commit', '测试失败原因');
    expect(errorMsg).toContain('❌ [Git Commit-Msg 校验失败]');
    expect(errorMsg).toContain('bad commit');
    expect(errorMsg).toContain('测试失败原因');
    expect(errorMsg).toContain('feat:');
  });

  it('COMMIT_TYPES 应包含所有核心提交类型', () => {
    expect(Object.keys(COMMIT_TYPES)).toEqual([
      'feat',
      'fix',
      'docs',
      'style',
      'refactor',
      'perf',
      'test',
      'build',
      'ci',
      'chore',
      'revert',
    ]);
  });
});
