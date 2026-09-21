import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dayKey } from '../utils/date';

/** 轮询间隔：每分钟检查一次是否跨天，代价可以忽略 */
const CHECK_INTERVAL = 60 * 1000;

/**
 * 当前「今天」的日期键（如 `2026-09-21`），跨天时自动更新。
 *
 * 为什么需要它：`Date.now()` 只在组件重新渲染的那一刻才会被重新求值。如果 App
 * 一直挂在后台、过了午夜再打开，或者干脆开着过夜，没有任何状态变化触发渲染，
 * 「今天」页就会一直停在昨天 —— 明细、日期、连续天数全是旧值。
 *
 * 这里用两条路兜住：
 *   · App 回到前台时立刻校准 —— 覆盖绝大多数场景（晚上放后台，第二天打开）
 *   · 每分钟轮询一次 —— 覆盖 App 一直开着过夜的情况
 *
 * 返回值只在真正跨天时变化，所以拿它当 useMemo 的依赖不会造成多余重算。
 */
export function useTodayKey(): string {
  const [key, setKey] = useState(() => dayKey(Date.now()));

  useEffect(() => {
    const sync = () => {
      const next = dayKey(Date.now());
      setKey((prev) => (prev === next ? prev : next));
    };

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });

    const timer = setInterval(sync, CHECK_INTERVAL);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, []);

  return key;
}
