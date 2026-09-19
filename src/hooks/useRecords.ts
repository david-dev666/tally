import { useCallback, useEffect, useMemo, useState } from 'react';

import { loadRecords, saveRecords } from '../storage';
import type { LearningRecord } from '../types';
import { dayKey, startOfDay, startOfWeek } from '../utils/date';

export interface DayGroup {
  key: string;
  records: LearningRecord[];
  counts: Record<string, number>;
  total: number;
}

function countByActivity(records: LearningRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const record of records) {
    counts[record.activityId] = (counts[record.activityId] ?? 0) + 1;
  }
  return counts;
}

/** 从今天（或昨天）往前数，连续有记录的天数 */
function computeStreak(records: LearningRecord[]): number {
  if (records.length === 0) return 0;
  const days = new Set(records.map((r) => dayKey(r.at)));
  const cursor = new Date();

  if (!days.has(dayKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor.getTime()))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 全局记录状态：加载、新增、删除，以及各种派生统计 */
export function useRecords() {
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [recordsReady, setRecordsReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadRecords().then((list) => {
      if (!alive) return;
      setRecords(list);
      setRecordsReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 任何变更后写回本地，简单直接（数据量小，无需去抖）
  useEffect(() => {
    if (recordsReady) void saveRecords(records);
  }, [records, recordsReady]);

  const addRecord = useCallback((activityId: string, note?: string) => {
    const now = Date.now();
    const trimmed = note?.trim();
    setRecords((prev) => [
      {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        activityId,
        at: now,
        ...(trimmed ? { note: trimmed } : null),
      },
      ...prev,
    ]);
  }, []);

  const removeRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((record) => record.id !== id));
  }, []);

  /** 删除某类学习内容的全部记录（删除类型时连带清理） */
  const removeRecordsByActivity = useCallback((activityId: string) => {
    setRecords((prev) => prev.filter((record) => record.activityId !== activityId));
  }, []);

  const clearAllRecords = useCallback(() => {
    setRecords([]);
  }, []);

  /** 合并导入的记录，按 id 去重，不会覆盖已有数据 */
  const mergeRecords = useCallback((incoming: LearningRecord[]) => {
    setRecords((prev) => {
      const seen = new Set(prev.map((record) => record.id));
      const merged = [...prev];
      for (const record of incoming) {
        if (!seen.has(record.id)) {
          merged.push(record);
          seen.add(record.id);
        }
      }
      return merged.sort((a, b) => b.at - a.at);
    });
  }, []);

  /** 每类内容最近用过的备注，用于长按输入时的快捷选择 */
  const recentNotesByActivity = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const record of records) {
      if (!record.note) continue;
      const list = map[record.activityId] ?? (map[record.activityId] = []);
      if (list.length < 4 && !list.includes(record.note)) list.push(record.note);
    }
    return map;
  }, [records]);

  const todayRecords = useMemo(
    () => records.filter((record) => record.at >= startOfDay(Date.now())),
    [records],
  );

  const todayCounts = useMemo(() => countByActivity(todayRecords), [todayRecords]);

  /** 每类学习内容最近一次的记录时间，用于按钮副标题 */
  const lastAtByActivity = useMemo(() => {
    const map: Record<string, number> = {};
    for (const record of records) {
      const current = map[record.activityId];
      if (current === undefined || record.at > current) {
        map[record.activityId] = record.at;
      }
    }
    return map;
  }, [records]);

  const weekCount = useMemo(() => {
    const from = startOfWeek(Date.now());
    return records.filter((record) => record.at >= from).length;
  }, [records]);

  const streak = useMemo(() => computeStreak(records), [records]);

  const activeDays = useMemo(() => new Set(records.map((r) => dayKey(r.at))).size, [records]);

  /** 按天分组，最新的在前 */
  const dayGroups = useMemo<DayGroup[]>(() => {
    const buckets = new Map<string, LearningRecord[]>();
    for (const record of records) {
      const key = dayKey(record.at);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(record);
      else buckets.set(key, [record]);
    }

    return [...buckets.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, items]) => ({
        key,
        records: items,
        counts: countByActivity(items),
        total: items.length,
      }));
  }, [records]);

  return {
    recordsReady,
    records,
    addRecord,
    removeRecord,
    removeRecordsByActivity,
    clearAllRecords,
    mergeRecords,
    recentNotesByActivity,
    todayRecords,
    todayCounts,
    lastAtByActivity,
    weekCount,
    streak,
    activeDays,
    totalCount: records.length,
    dayGroups,
  };
}

export type RecordsStore = ReturnType<typeof useRecords>;
