import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Activity, LearningRecord } from './types';

const RECORDS_KEY = 'tally.records.v1';
const ACTIVITIES_KEY = 'tally.activities.v1';
const ACTIVITIES_SOURCE_KEY = 'tally.activities.source.v1';
const FEEDBACK_KEY = 'tally.feedback.level.v1';

function isValidRecord(value: unknown): value is LearningRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const noteOk = v.note === undefined || typeof v.note === 'string';
  return (
    typeof v.id === 'string' &&
    typeof v.at === 'number' &&
    typeof v.activityId === 'string' &&
    noteOk
  );
}

function isValidActivity(value: unknown): value is Activity {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    typeof v.emoji === 'string' &&
    typeof v.color === 'string'
  );
}

/* ---------------- 打卡记录 ---------------- */

/** 读取全部记录，失败时返回空数组（保证 App 永远能起来） */
export async function loadRecords(): Promise<LearningRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRecord).sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

export async function saveRecords(records: LearningRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // 写入失败不打断交互，下一次变更会重试
  }
}

/* ---------------- 自定义学习内容 ---------------- */

export async function loadActivities(): Promise<Activity[] | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVITIES_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isValidActivity);
  } catch {
    return null;
  }
}

export async function saveActivities(activities: Activity[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
  } catch {
    // 同上
  }
}

/**
 * 记录上次同步的「配置文件指纹」。
 * 用户在 activities.local.ts 里改了内容后重启 App，
 * 指纹对不上就会用新配置覆盖本地存储，从而让文件改动生效。
 */
export async function loadActivitiesSource(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVITIES_SOURCE_KEY);
  } catch {
    return null;
  }
}

export async function saveActivitiesSource(fingerprint: string): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVITIES_SOURCE_KEY, fingerprint);
  } catch {
    // 同上
  }
}

/** 清空全部打卡记录（保留自定义内容） */
export async function clearRecords(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECORDS_KEY);
  } catch {
    // 忽略
  }
}

export async function loadFeedbackLevel(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FEEDBACK_KEY);
  } catch {
    return null;
  }
}

export async function saveFeedbackLevel(value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(FEEDBACK_KEY, value);
  } catch {
    // 同上
  }
}
