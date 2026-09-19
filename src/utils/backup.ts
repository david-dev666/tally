import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Activity, LearningRecord } from '../types';
import { dayKey } from './date';

export interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  activities: Activity[];
  records: LearningRecord[];
}

const APP_TAG = 'tally';
const BACKUP_VERSION = 1;

function buildPayload(
  activities: Activity[],
  records: LearningRecord[],
): BackupPayload {
  return {
    app: APP_TAG,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    activities,
    records,
  };
}

function isPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.records) && Array.isArray(v.activities);
}

/**
 * 导出成 JSON 文件并唤起系统分享面板。
 * 分享面板里可以选「保存到文件」「发送给微信」等，用户自己决定去哪。
 */
export async function exportBackup(
  activities: Activity[],
  records: LearningRecord[],
): Promise<string> {
  const json = JSON.stringify(buildPayload(activities, records), null, 2);
  const file = new File(Paths.cache, `tally-backup-${dayKey(Date.now())}.json`);

  file.create({ overwrite: true });
  file.write(json);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: '导出 tally 备份',
      UTI: 'public.json',
    });
  }

  return file.uri;
}

/** 让用户挑一个备份文件并解析，取消则返回 null */
export async function pickBackup(): Promise<BackupPayload | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets.length) return null;

  const text = await new File(result.assets[0].uri).text();
  const parsed: unknown = JSON.parse(text);

  if (!isPayload(parsed)) {
    throw new Error('这个文件不是 tally 的备份');
  }
  return parsed;
}
