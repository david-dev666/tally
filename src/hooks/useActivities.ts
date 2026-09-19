import { useCallback, useEffect, useMemo, useState } from 'react';

import { LOCAL_ACTIVITIES } from '../config/activities.local';
import { loadActivities, loadActivitiesSource, saveActivities, saveActivitiesSource } from '../storage';
import type { Activity } from '../types';

export type ActivityDraft = Omit<Activity, 'id'>;

/** 配置文件内容的指纹，变了就说明用户改过本地配置 */
const SOURCE_FINGERPRINT = JSON.stringify(LOCAL_ACTIVITIES);

/**
 * 管理学习内容。
 * 优先级：App 内的修改（存在本机）> src/config/activities.local.ts 里的配置。
 * 一旦检测到配置文件被改动，就以文件为准重新覆盖。
 */
export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [stored, sourceMark] = await Promise.all([loadActivities(), loadActivitiesSource()]);
      if (!alive) return;

      const configChanged = sourceMark !== SOURCE_FINGERPRINT;
      if (configChanged || stored === null) {
        setActivities(LOCAL_ACTIVITIES);
        void saveActivitiesSource(SOURCE_FINGERPRINT);
      } else {
        setActivities(stored);
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ready) void saveActivities(activities);
  }, [activities, ready]);

  const addActivity = useCallback((draft: ActivityDraft) => {
    const id = `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setActivities((prev) => [...prev, { ...draft, id }]);
    return id;
  }, []);

  const updateActivity = useCallback((id: string, patch: Partial<ActivityDraft>) => {
    setActivities((prev) =>
      prev.map((activity) => (activity.id === id ? { ...activity, ...patch } : activity)),
    );
  }, []);

  const removeActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((activity) => activity.id !== id));
  }, []);

  /** 丢弃 App 内的修改，恢复成配置文件里的内容 */
  const resetToConfig = useCallback(() => {
    setActivities(LOCAL_ACTIVITIES);
    void saveActivitiesSource(SOURCE_FINGERPRINT);
  }, []);

  /** 调整顺序：direction 为 -1 上移，1 下移 */
  const moveActivity = useCallback((id: string, direction: -1 | 1) => {
    setActivities((prev) => {
      const index = prev.findIndex((activity) => activity.id === id);
      if (index < 0) return prev;

      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      next[index] = prev[target];
      next[target] = prev[index];
      return next;
    });
  }, []);

  /** 把某一项移动到指定位置（拖拽排序用） */
  const moveActivityTo = useCallback((from: number, to: number) => {
    setActivities((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  /** 导入备份时补齐缺失的内容，已存在的保持不变 */
  const mergeActivities = useCallback((incoming: Activity[]) => {
    setActivities((prev) => {
      const ids = new Set(prev.map((activity) => activity.id));
      const additions = incoming.filter((activity) => !ids.has(activity.id));
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, []);

  /** 按 id 快速查找 */
  const activityMap = useMemo(() => {
    const map: Record<string, Activity> = {};
    for (const activity of activities) map[activity.id] = activity;
    return map;
  }, [activities]);

  return {
    activities,
    activityMap,
    activitiesReady: ready,
    addActivity,
    updateActivity,
    removeActivity,
    moveActivity,
    moveActivityTo,
    resetToConfig,
    mergeActivities,
  };
}

export type ActivitiesStore = ReturnType<typeof useActivities>;
