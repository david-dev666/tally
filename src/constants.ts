/**
 * 默认的学习内容来自 src/config/activities.local.ts（个人配置，不进 git），
 * 仓库里跟踪的是同目录的 activities.example.ts 作为模板。
 */

/** 可选主色：12 个明度接近的色，保证混在一起也好看 */
export const COLOR_PALETTE = [
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#0EA5E9',
  '#64748B',
];

/** 可选图标 */
export const EMOJI_PRESETS = [
  '🛠️',
  '💻',
  '📱',
  '🎨',
  '📝',
  '📄',
  '📚',
  '📖',
  '🧠',
  '🤖',
  '🔬',
  '📊',
  '🎯',
  '🚀',
  '💡',
  '🧩',
  '✍️',
  '🎬',
  '🎵',
  '🌐',
  '⚙️',
  '📐',
  '🧪',
  '🏆',
];

/** 由主色派生浅色底（默认 12% 不透明度），省去手写 tint */
export function tintOf(color: string, alpha = '1F'): string {
  return `${color}${alpha}`;
}

