import { useCallback, useEffect, useState } from 'react';

import { loadTodayOrder, saveTodayOrder } from '../storage';

/**
 * 「今天」页里两个区块的上下顺序。
 *
 * 记录按钮占的垂直空间不小，有人习惯先看今天记了什么再决定打哪张卡，
 * 所以把顺序做成可配置的。默认沿用原本的「按钮在前」。
 */
export type TodayOrder = 'actions-first' | 'detail-first';

export const TODAY_ORDERS: TodayOrder[] = ['actions-first', 'detail-first'];

export const TODAY_ORDER_LABELS: Record<TodayOrder, string> = {
  'actions-first': '记录按钮在前',
  'detail-first': '今日明细在前',
};

function isOrder(value: unknown): value is TodayOrder {
  return value === 'actions-first' || value === 'detail-first';
}

/** 管理「今天」页区块顺序：读取、持久化 */
export function useTodayOrder() {
  const [todayOrder, setOrder] = useState<TodayOrder>('actions-first');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadTodayOrder().then((stored) => {
      if (!alive) return;
      if (isOrder(stored)) setOrder(stored);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const changeOrder = useCallback((next: TodayOrder) => {
    setOrder(next);
    void saveTodayOrder(next);
  }, []);

  return { todayOrder, changeOrder, todayOrderReady: ready };
}
