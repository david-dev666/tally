import * as Haptics from 'expo-haptics';

export type FeedbackLevel = 'off' | 'light' | 'standard' | 'strong';

export const FEEDBACK_LEVELS: FeedbackLevel[] = ['off', 'light', 'standard', 'strong'];

export const FEEDBACK_LEVEL_LABELS: Record<FeedbackLevel, string> = {
  off: '关闭',
  light: '轻柔',
  standard: '标准',
  strong: '强烈',
};

export const FEEDBACK_LEVEL_HINTS: Record<FeedbackLevel, string> = {
  off: '完全不震动',
  light: '所有操作统一用最轻的力度',
  standard: '按场景分级，记满 5 次有特殊反馈',
  strong: '所有操作统一用最重的力度',
};

/**
 * 全局档位。放在模块作用域而不是 React 状态里，
 * 这样任意组件调用下面这些函数时都能拿到最新值，无需逐层传参。
 */
let level: FeedbackLevel = 'standard';

export function setFeedbackLevel(next: FeedbackLevel) {
  level = next;
}

/** 震动在 Web 或部分设备上不可用，统一吞掉异常 */
function safe(run: () => Promise<void>) {
  try {
    run().catch(() => {});
  } catch {
    // 忽略
  }
}

function buzz(style: Haptics.ImpactFeedbackStyle) {
  safe(() => Haptics.impactAsync(style));
}

function notify(type: Haptics.NotificationFeedbackType) {
  safe(() => Haptics.notificationAsync(type));
}

/**
 * 普通操作：先按场景给一个「标准档」下的力度，
 * 再根据全局档位换算 —— 轻柔档一律降到最轻，强烈档一律升到最重。
 */
function impact(preset: 'light' | 'medium' | 'heavy') {
  if (level === 'off') return;
  if (level === 'light') return buzz(Haptics.ImpactFeedbackStyle.Light);
  if (level === 'strong') return buzz(Haptics.ImpactFeedbackStyle.Heavy);

  if (preset === 'heavy') return buzz(Haptics.ImpactFeedbackStyle.Heavy);
  if (preset === 'medium') return buzz(Haptics.ImpactFeedbackStyle.Medium);
  return buzz(Haptics.ImpactFeedbackStyle.Light);
}

/** 有「语义」的操作（删除警示、凑满一组）用提示型震动 */
function alert(type: Haptics.NotificationFeedbackType) {
  if (level === 'off') return;
  if (level === 'light') return buzz(Haptics.ImpactFeedbackStyle.Light);
  notify(type);
}

/**
 * 打卡反馈：当天累计越多，手感越「重」。
 * 注意 Android 没有 iOS 那样精细的马达，Light 档多数机型几乎感觉不到，
 * 所以最低档也从 Medium 起步。
 *
 * @param countAfter 记录完成后的当天总次数
 */
export function recordFeedback(countAfter: number) {
  // 每凑满一组 tally marks（5 次）给一个不一样的「成功」提示
  if (countAfter > 0 && countAfter % 5 === 0) {
    alert(Haptics.NotificationFeedbackType.Success);
    return;
  }
  impact(countAfter >= 3 ? 'heavy' : 'medium');
}

/** 删除某条记录：双重警示震动，明显区别于其它操作 */
export function removeFeedback() {
  alert(Haptics.NotificationFeedbackType.Warning);
}

/** 解锁：提示「已进入可删除状态」 */
export function unlockFeedback() {
  impact('medium');
}

/** 锁定：轻轻一下，表示收工 */
export function lockFeedback() {
  impact('light');
}

/** 长按唤起输入框 */
export function expandFeedback() {
  impact('medium');
}

/** 长按把条目「拿起来」，进入拖拽排序 */
export function reorderStartFeedback() {
  impact('medium');
}

/** 轻触类操作的通用反馈 */
export function tapFeedback() {
  impact('light');
}
