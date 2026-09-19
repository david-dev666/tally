import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { ActivityEditor } from '../components/ActivityEditor';
import { SortableList } from '../components/SortableList';
import { tintOf } from '../constants';
import type { ActivitiesStore, ActivityDraft } from '../hooks/useActivities';
import type { RecordsStore } from '../hooks/useRecords';
import { useTheme } from '../hooks/useTheme';
import { font, radius, space, type ThemeColors } from '../theme';
import type { Activity } from '../types';
import { exportBackup, pickBackup } from '../utils/backup';
import {
  FEEDBACK_LEVEL_HINTS,
  FEEDBACK_LEVEL_LABELS,
  FEEDBACK_LEVELS,
  tapFeedback,
  type FeedbackLevel,
} from '../utils/feedback';

/** 学习内容列表的固定行高，拖拽排序要靠它换算落点 */
const ACTIVITY_ROW_HEIGHT = 62;

interface SettingsScreenProps {
  records: RecordsStore;
  activities: ActivitiesStore;
  feedbackLevel: FeedbackLevel;
  onChangeFeedbackLevel: (level: FeedbackLevel) => void;
}

export function SettingsScreen({
  records,
  activities,
  feedbackLevel,
  onChangeFeedbackLevel,
}: SettingsScreenProps) {
  const { colors, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);
  /** 正在拖动排序：期间锁住外层滚动，并放开列表的裁剪 */
  const [sorting, setSorting] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setEditorVisible(true);
  };

  const openEdit = (activity: Activity) => {
    setEditing(activity);
    setEditorVisible(true);
  };

  const closeEditor = () => setEditorVisible(false);

  const handleSubmit = (draft: ActivityDraft) => {
    if (editing) activities.updateActivity(editing.id, draft);
    else activities.addActivity(draft);
    closeEditor();
  };

  const handleDelete = () => {
    if (!editing) return;
    const current = editing;
    const affected = records.records.filter((r) => r.activityId === current.id).length;

    const doDelete = () => {
      activities.removeActivity(current.id);
      records.removeRecordsByActivity(current.id);
      closeEditor();
    };

    if (affected > 0) {
      Alert.alert(
        `删除「${current.label}」`,
        `这项内容已经有 ${affected} 条打卡记录，删除后会一并清除，确定吗？`,
        [
          { text: '取消', style: 'cancel' },
          { text: '删除', style: 'destructive', onPress: doDelete },
        ],
      );
    } else {
      doDelete();
    }
  };

  const handleReset = () => {
    Alert.alert(
      '恢复配置文件内容',
      '将丢弃在 App 里做的所有修改，学习内容恢复成 src/config/activities.local.ts 里的配置。打卡记录不受影响。',
      [
        { text: '取消', style: 'cancel' },
        { text: '恢复', style: 'destructive', onPress: () => activities.resetToConfig() },
      ],
    );
  };

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await exportBackup(activities.activities, records.records);
      tapFeedback();
    } catch (error) {
      Alert.alert('导出失败', error instanceof Error ? error.message : '请稍后再试');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const payload = await pickBackup();
      if (!payload) return; // 用户取消了选择

      const existing = new Set(records.records.map((r) => r.id));
      const newRecords = payload.records.filter((r) => !existing.has(r.id)).length;
      const existingActivities = new Set(activities.activities.map((a) => a.id));
      const newActivities = payload.activities.filter((a) => !existingActivities.has(a.id)).length;

      Alert.alert(
        '确认导入',
        `备份里有 ${payload.records.length} 条记录、${payload.activities.length} 项学习内容。\n\n` +
          `导入采用合并方式：新增 ${newRecords} 条记录、${newActivities} 项内容，已有的不会重复也不会被覆盖。`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '导入',
            onPress: () => {
              activities.mergeActivities(payload.activities);
              records.mergeRecords(payload.records);
              tapFeedback();
              Alert.alert('导入完成', `新增 ${newRecords} 条记录、${newActivities} 项学习内容。`);
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('导入失败', error instanceof Error ? error.message : '文件可能已损坏或格式不对');
    } finally {
      setBusy(false);
    }
  };

  const handleClearAll = () => {
    if (records.totalCount === 0) return;
    Alert.alert(
      '清空所有打卡记录',
      `将删除全部 ${records.totalCount} 条记录。你自定义的学习内容不受影响，但此操作无法撤销。`,
      [
        { text: '取消', style: 'cancel' },
        { text: '清空', style: 'destructive', onPress: () => records.clearAllRecords() },
      ],
    );
  };

  const list = activities.activities;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        scrollEnabled={!sorting}
      >
        <Text style={styles.title}>设置</Text>

        <Text style={styles.sectionTitle}>震动</Text>
        <View style={styles.list}>
          {FEEDBACK_LEVELS.map((item, index) => (
            <Pressable
              key={item}
              onPress={() => onChangeFeedbackLevel(item)}
              style={({ pressed }) => [
                styles.row,
                index > 0 && styles.divider,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.rowTexts}>
                <Text style={styles.rowLabel}>{FEEDBACK_LEVEL_LABELS[item]}</Text>
                <Text style={styles.rowHint}>{FEEDBACK_LEVEL_HINTS[item]}</Text>
              </View>
              {feedbackLevel === item ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, styles.sectionSpaced]}>数据</Text>
        <View style={styles.list}>
          <Pressable
            onPress={handleExport}
            disabled={busy}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowTexts}>
              <Text style={styles.rowLabel}>导出备份</Text>
              <Text style={styles.rowHint}>
                {records.totalCount} 条记录 · {list.length} 项学习内容
              </Text>
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <Pressable
            onPress={handleImport}
            disabled={busy}
            style={({ pressed }) => [styles.row, styles.divider, pressed && styles.pressed]}
          >
            <View style={styles.rowTexts}>
              <Text style={styles.rowLabel}>从备份恢复</Text>
              <Text style={styles.rowHint}>选择之前导出的 JSON 文件</Text>
            </View>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
          <View style={[styles.row, styles.divider]}>
            <Text style={styles.rowLabel}>累计记录</Text>
            <Text style={styles.rowValue}>{records.totalCount} 条</Text>
          </View>
          <View style={[styles.row, styles.divider]}>
            <Text style={styles.rowLabel}>有记录的天数</Text>
            <Text style={styles.rowValue}>{records.activeDays} 天</Text>
          </View>
        </View>

        <Pressable
          onPress={handleClearAll}
          style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
        >
          <Text style={styles.dangerText}>清空所有打卡记录</Text>
        </Pressable>

        <View style={[styles.sectionHeaderRow, styles.sectionSpaced]}>
          <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>我的学习内容</Text>
          <Pressable
            onPress={openAdd}
            hitSlop={8}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          >
            <Text style={styles.addText}>+ 添加</Text>
          </Pressable>
        </View>
        <Text style={styles.sectionHint}>
          默认内容来自 src/config/activities.local.ts（不会提交到 git）。在这里做的修改只保存在本机，
          会覆盖该文件里的值。长按条目可拖动调整顺序。
        </Text>

        {list.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>还没有内容，点右上角「+ 添加」</Text>
          </View>
        ) : (
          <View style={[styles.list, sorting && styles.listReordering]}>
            <SortableList
              items={list}
              keyExtractor={(activity) => activity.id}
              rowHeight={ACTIVITY_ROW_HEIGHT}
              backgroundColor={colors.card}
              onDraggingChange={setSorting}
              onReorder={(from, to) => {
                activities.moveActivityTo(from, to);
                tapFeedback();
              }}
              renderItem={(activity, index, dragging) => (
                <View style={[styles.itemRow, index > 0 && styles.divider, dragging && styles.itemDragging]}>
                  <View style={styles.grip}>
                    <View style={styles.gripLine} />
                    <View style={styles.gripLine} />
                  </View>
                  <View style={[styles.itemIcon, { backgroundColor: tintOf(activity.color) }]}>
                    <Text style={styles.itemEmoji}>{activity.emoji}</Text>
                  </View>
                  <Pressable
                    onPress={() => openEdit(activity)}
                    style={({ pressed }) => [styles.itemMain, pressed && styles.pressed]}
                  >
                    <Text style={styles.itemLabel} numberOfLines={1}>
                      {activity.label}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openEdit(activity)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.itemEdit}>编辑 ›</Text>
                  </Pressable>
                </View>
              )}
            />
          </View>
        )}

        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
        >
          <Text style={styles.resetText}>恢复为配置文件中的内容</Text>
        </Pressable>

        <Text style={styles.footnote}>
          打卡数据全部保存在本机，卸载 App 会一并清除 —— 建议定期「导出备份」存到网盘或发给自己。
          学习内容的默认值放在配置文件里，你的个人配置不会被提交到代码仓库。
        </Text>
      </ScrollView>

      <ActivityEditor
        visible={editorVisible}
        editing={editing}
        onClose={closeEditor}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors, shadow: ViewStyle) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xxl },

    title: {
      fontFamily: font.bold,
      fontSize: 34,
      color: colors.text,
      letterSpacing: -1.2,
      marginBottom: space.xl,
    },

    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    sectionTitleInline: { marginBottom: 0 },
    sectionTitle: {
      fontFamily: font.semibold,
      fontSize: 12.5,
      color: colors.textSub,
      marginLeft: 2,
      marginBottom: space.md,
      letterSpacing: -0.1,
    },
    sectionSpaced: { marginTop: space.xl + space.xs, marginBottom: 4 },
    sectionHint: {
      fontFamily: font.regular,
      fontSize: 11.5,
      color: colors.textMuted,
      marginLeft: 2,
      marginBottom: space.md,
      lineHeight: 17,
    },
    addBtn: { paddingHorizontal: 4 },
    addText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.text },

    list: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...shadow,
    },
    /** 拖拽期间放开裁剪，让被拖起来的行能压到相邻卡片上 */
    listReordering: { overflow: 'visible' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      minHeight: 50,
      paddingHorizontal: space.lg,
    },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    pressed: { opacity: 0.55 },
    rowTexts: { flex: 1 },
    rowLabel: { fontFamily: font.regular, fontSize: 15, color: colors.text },
    rowHint: {
      fontFamily: font.regular,
      fontSize: 11.5,
      color: colors.textMuted,
      marginTop: 3,
    },
    rowValue: {
      fontFamily: font.regular,
      fontSize: 14,
      color: colors.textSub,
      fontVariant: ['tabular-nums'],
    },
    rowArrow: { fontFamily: font.regular, fontSize: 18, color: colors.textMuted },
    check: { fontFamily: font.semibold, fontSize: 15, color: colors.accent },

    /* ---- 可拖拽的学习内容条目 ---- */
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      height: ACTIVITY_ROW_HEIGHT,
      paddingHorizontal: space.lg,
    },
    itemDragging: { opacity: 0.95 },
    grip: { width: 16, gap: 4, marginRight: space.sm },
    gripLine: { height: 2, borderRadius: 1, backgroundColor: colors.textMuted, opacity: 0.5 },
    itemIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: space.md,
    },
    itemEmoji: { fontSize: 18, lineHeight: 24 },
    itemMain: { flex: 1, paddingVertical: 4 },
    itemLabel: { fontFamily: font.regular, fontSize: 15, color: colors.text },
    editBtn: { paddingLeft: 8 },
    itemEdit: { fontFamily: font.regular, fontSize: 12.5, color: colors.textMuted },

    resetBtn: { marginTop: space.md, paddingVertical: 12, alignItems: 'center' },
    resetText: { fontFamily: font.regular, fontSize: 13, color: colors.textSub },

    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      paddingVertical: space.xxl,
      alignItems: 'center',
      ...shadow,
    },
    emptyText: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },

    dangerBtn: {
      marginTop: space.md,
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      paddingVertical: 15,
      alignItems: 'center',
      ...shadow,
    },
    dangerText: { fontFamily: font.medium, fontSize: 14.5, color: colors.danger },

    footnote: {
      fontFamily: font.regular,
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 17,
      marginTop: space.xl,
      marginHorizontal: 2,
    },
  });
}
