import type { Activity } from '../types';

/**
 * 示例配置（这个文件会被 git 跟踪，作为模板）
 *
 * 想自定义自己的学习内容？
 * 请修改同目录下的 `activities.local.ts` —— 那个文件不会被提交到 git。
 * 如果它不存在，执行 `npm install` 会自动从这里生成一份。
 *
 * 字段说明：
 *   id    —— 唯一标识，改了会导致已有记录对不上，建议定下就别动
 *   label —— 显示名称
 *   emoji —— 图标
 *   color —— 主色，从 src/constants.ts 的 COLOR_PALETTE 里挑一个更好看
 */
export const LOCAL_ACTIVITIES: Activity[] = [
  { id: 'code', label: '写代码', emoji: '💻', color: '#3B82F6' },
  { id: 'read', label: '看书', emoji: '📚', color: '#F59E0B' },
  { id: 'practice', label: '刷题', emoji: '🧩', color: '#8B5CF6' },
];
