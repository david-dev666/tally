const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 本地时区下的 YYYY-MM-DD，用作「天」的分组键 */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 相对今天偏移若干天的 dayKey（-1 即昨天） */
export function dayKeyOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dayKey(d.getTime());
}

/** 当天 00:00 的时间戳 */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 本周一 00:00 的时间戳 */
export function startOfWeek(ts: number): number {
  const d = new Date(ts);
  const offset = (d.getDay() + 6) % 7; // 周一为一周起点
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 14:32 */
export function formatClock(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 9 月 19 日 周六 */
export function formatFullDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${WEEKDAYS[d.getDay()]}`;
}

/** 把 dayKey 转成「今天 / 昨天 / 9 月 17 日 周三」 */
export function formatDayKeyLabel(key: string): string {
  if (key === dayKeyOffset(0)) return '今天';
  if (key === dayKeyOffset(-1)) return '昨天';
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${m} 月 ${d} 日 ${WEEKDAYS[date.getDay()]}`;
}

/** 距离上次记录多久：今天显示时刻，昨天带「昨天」，更早显示日期 */
export function formatLastSeen(ts: number): string {
  const key = dayKey(ts);
  if (key === dayKeyOffset(0)) return `上次 ${formatClock(ts)}`;
  if (key === dayKeyOffset(-1)) return `昨天 ${formatClock(ts)}`;
  return formatDayKeyLabel(key);
}
