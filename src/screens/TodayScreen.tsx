import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';

import { ActionButton } from '../components/ActionButton';
import type { ActivitiesStore } from '../hooks/useActivities';
import type { RecordsStore } from '../hooks/useRecords';
import { useTheme } from '../hooks/useTheme';
import type { TodayOrder } from '../hooks/useTodayOrder';
import { font, radius, space, type ThemeColors } from '../theme';
import type { Activity, LearningRecord } from '../types';
import { formatClock, formatFullDate } from '../utils/date';
import {
  lockFeedback,
  recordFeedback,
  removeFeedback,
  unlockFeedback,
} from '../utils/feedback';

type Styles = ReturnType<typeof createStyles>;

interface RecordRowProps {
  record: LearningRecord;
  activity?: Activity;
  isFirst: boolean;
  /** 只有解锁后才显示 ✕ */
  unlocked: boolean;
  styles: Styles;
  colors: ThemeColors;
  onRemove: (id: string) => void;
}

/**
 * 单条记录。
 * 删除时把自己这一行的高度收拢到 0，下方记录随之自然向上补位。
 */
function RecordRow({
  record,
  activity,
  isFirst,
  unlocked,
  styles,
  colors,
  onRemove,
}: RecordRowProps) {
  const collapse = useRef(new Animated.Value(0)).current;
  const measured = useRef(0);
  const [ready, setReady] = useState(false);

  const handleLayout = (event: LayoutChangeEvent) => {
    const h = event.nativeEvent.layout.height;
    if (!ready && h > 0) {
      measured.current = h;
      setReady(true);
    }
  };

  const startCollapse = () => {
    removeFeedback();
    Animated.timing(collapse, {
      toValue: 1,
      duration: 280,
      useNativeDriver: false, // height 动画只能用 JS driver
    }).start(({ finished }) => {
      if (finished) onRemove(record.id);
    });
  };

  const animatedStyle = ready
    ? {
        height: collapse.interpolate({
          inputRange: [0, 1],
          outputRange: [measured.current, 0],
        }),
        opacity: collapse.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [1, 0.5, 0],
        }),
      }
    : undefined;

  return (
    <Animated.View onLayout={handleLayout} style={[styles.rowWrap, animatedStyle]}>
      <View style={[styles.row, !isFirst && styles.rowDivider]}>
        <View style={[styles.dot, { backgroundColor: activity?.color ?? colors.textMuted }]} />
        <Text style={styles.time}>{formatClock(record.at)}</Text>
        <Text style={styles.rowLabel} numberOfLines={1}>
          {activity ? `${activity.emoji} ${activity.label}` : '已删除的内容'}
          {record.note ? <Text style={styles.rowNote}>{` · ${record.note}`}</Text> : null}
        </Text>
        {unlocked ? (
          <Pressable
            onPress={startCollapse}
            hitSlop={8}
            style={({ pressed }) => [styles.deleteBtn, pressed && styles.deletePressed]}
          >
            <Text style={styles.deleteText}>删除</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

interface TodayScreenProps {
  records: RecordsStore;
  activities: ActivitiesStore;
  /** 记录按钮区与今日明细区的上下顺序 */
  order: TodayOrder;
  onGoToSettings: () => void;
}

export function TodayScreen({ records, activities, order, onGoToSettings }: TodayScreenProps) {
  const { colors, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);

  /** 明细默认是锁定的，长按标题右侧解锁后才允许删除，避免误触 */
  const [unlocked, setUnlocked] = useState(false);

  const total = records.todayRecords.length;
  const list = activities.activities;

  const distribution = useMemo(
    () => list.filter((activity) => (records.todayCounts[activity.id] ?? 0) > 0),
    [list, records.todayCounts],
  );

  const handleRecord = (id: string, note?: string) => {
    // 先按「记录后」的次数决定震动强度：越记越有分量
    recordFeedback(records.todayRecords.length + 1);
    records.addRecord(id, note);
  };

  const handleUnlock = () => {
    unlockFeedback();
    setUnlocked(true);
  };

  const handleLock = () => {
    lockFeedback();
    setUnlocked(false);
  };

  if (list.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyEmoji}>🧩</Text>
        <Text style={styles.emptyTitle}>还没有学习内容</Text>
        <Text style={styles.emptyHint}>去「设置」里添加，或修改配置文件</Text>
        <Pressable
          style={({ pressed }) => [styles.emptyBtn, pressed && styles.pressed]}
          onPress={onGoToSettings}
        >
          <Text style={styles.emptyBtnText}>去设置</Text>
        </Pressable>
      </View>
    );
  }

  /** 记录按钮区 */
  const actionsBlock = (
    <View style={styles.block}>
      <Text style={styles.sectionTitle}>点一下记一笔 · 长按写备注</Text>
      {list.map((activity) => (
        <ActionButton
          key={activity.id}
          activity={activity}
          count={records.todayCounts[activity.id] ?? 0}
          lastAt={records.lastAtByActivity[activity.id]}
          onRecord={(note) => handleRecord(activity.id, note)}
        />
      ))}
    </View>
  );

  /** 今日明细区（含顶部的解锁按钮） */
  const detailBlock = (
    <View style={styles.block}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>今日明细</Text>
        {records.todayRecords.length > 0 ? (
          <Pressable
            onPress={unlocked ? handleLock : handleUnlock}
            style={({ pressed }) => [
              styles.lockBtn,
              unlocked && styles.lockBtnOn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.lockBtnText, unlocked && styles.lockBtnTextOn]}>
              {unlocked ? '锁定' : '解锁'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {records.todayRecords.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>还没有记录，点上面的按钮开始吧</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {records.todayRecords.map((record, index) => (
            <RecordRow
              key={record.id}
              record={record}
              activity={activities.activityMap[record.activityId]}
              isFirst={index === 0}
              unlocked={unlocked}
              styles={styles}
              colors={colors}
              onRemove={records.removeRecord}
            />
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>今天</Text>
          <Text style={styles.date}>{formatFullDate(Date.now())}</Text>
        </View>
        {records.streak > 0 ? (
          <View style={styles.streak}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakText}>连续 {records.streak} 天</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryTop}>
          <Text style={styles.summaryLabel}>今日已记录</Text>
          <View style={styles.summaryCountRow}>
            <Text style={styles.summaryCount}>{total}</Text>
            <Text style={styles.summaryUnit}>次</Text>
          </View>
        </View>

        <View style={styles.bar}>
          {total === 0 ? (
            <View style={styles.barEmpty} />
          ) : (
            distribution.map((activity) => (
              <View
                key={activity.id}
                style={[
                  styles.barSeg,
                  {
                    flex: records.todayCounts[activity.id] ?? 0,
                    backgroundColor: activity.color,
                  },
                ]}
              />
            ))
          )}
        </View>

        <Text style={styles.summaryFoot}>本周累计 {records.weekCount} 次</Text>
      </View>

      {order === 'detail-first' ? (
        <>
          {detailBlock}
          {actionsBlock}
        </>
      ) : (
        <>
          {actionsBlock}
          {detailBlock}
        </>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors, shadow: ViewStyle) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: space.lg, paddingBottom: space.xxl },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.sm,
      marginBottom: space.lg,
    },
    title: {
      fontFamily: font.bold,
      fontSize: 34,
      color: colors.text,
      letterSpacing: -1.2,
    },
    date: {
      fontFamily: font.regular,
      fontSize: 13.5,
      color: colors.textSub,
      marginTop: 4,
      letterSpacing: -0.1,
    },
    streak: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 149, 0, 0.15)',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radius.pill,
      gap: 5,
    },
    streakEmoji: { fontSize: 13 },
    streakText: { fontFamily: font.semibold, fontSize: 12.5, color: '#FF9500' },

    summary: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: space.lg,
      ...shadow,
    },
    summaryTop: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    summaryLabel: { fontFamily: font.regular, fontSize: 13, color: colors.textSub, marginBottom: 4 },
    summaryCountRow: { flexDirection: 'row', alignItems: 'baseline' },
    summaryCount: {
      fontFamily: font.bold,
      fontSize: 32,
      color: colors.text,
      letterSpacing: -1,
      fontVariant: ['tabular-nums'],
    },
    summaryUnit: { fontFamily: font.regular, fontSize: 12, color: colors.textMuted, marginLeft: 3 },
    bar: {
      flexDirection: 'row',
      height: 8,
      borderRadius: radius.pill,
      overflow: 'hidden',
      marginTop: space.md,
      gap: 3,
    },
    barSeg: { borderRadius: radius.pill },
    barEmpty: { flex: 1, borderRadius: radius.pill, backgroundColor: colors.line },
    summaryFoot: {
      fontFamily: font.regular,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: space.md,
    },

    sectionTitle: {
      fontFamily: font.semibold,
      fontSize: 12.5,
      color: colors.textSub,
      marginBottom: space.md,
      marginLeft: 2,
      letterSpacing: -0.1,
    },
    /** 记录按钮区 / 今日明细区共用的外层，间距在这里统一给 */
    block: { marginTop: space.xl },
    sectionTitleInline: { marginBottom: 0 },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: 2,
      marginBottom: space.md,
    },
    lockBtn: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.cardAlt,
    },
    lockBtnOn: { backgroundColor: 'rgba(255, 59, 48, 0.14)' },
    lockBtnText: {
      fontFamily: font.medium,
      fontSize: 12,
      color: colors.textSub,
    },
    lockBtnTextOn: { color: colors.danger },

    empty: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      paddingVertical: space.xxl,
      alignItems: 'center',
      ...shadow,
    },
    emptyText: { fontFamily: font.regular, fontSize: 13, color: colors.textMuted },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
    emptyEmoji: { fontSize: 40, marginBottom: space.md },
    emptyTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
    emptyHint: { fontFamily: font.regular, fontSize: 12.5, color: colors.textMuted, marginTop: 6 },
    emptyBtn: {
      marginTop: space.lg,
      backgroundColor: colors.text,
      paddingHorizontal: 22,
      paddingVertical: 11,
      borderRadius: radius.pill,
    },
    emptyBtnText: { fontFamily: font.semibold, fontSize: 14, color: colors.card },
    pressed: { opacity: 0.75 },

    list: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      paddingHorizontal: space.lg,
      overflow: 'hidden',
      ...shadow,
    },
    rowWrap: { overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    dot: { width: 7, height: 7, borderRadius: 4, marginRight: 10 },
    time: {
      fontFamily: font.regular,
      fontSize: 13,
      color: colors.textSub,
      fontVariant: ['tabular-nums'],
      width: 46,
    },
    rowLabel: { flex: 1, fontFamily: font.regular, fontSize: 14.5, color: colors.text },
    rowNote: { fontFamily: font.regular, fontSize: 13, color: colors.textSub },
    deleteBtn: {
      flexShrink: 0, // 防止被左侧可伸缩的文本挤压
      marginLeft: 10,
      paddingHorizontal: 13,
      paddingVertical: 7,
      minHeight: 30,
      justifyContent: 'center',
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255, 59, 48, 0.12)',
    },
    deletePressed: { opacity: 0.5 },
    deleteText: {
      // 中文在 Inter 下会回落到系统字体，行高度量容易偏小。
      // 这里显式给足行高，并保留 Android 的 font padding —— 千万不要设
      // includeFontPadding: false，那样文本高度会被压到刚好等于 lineHeight，中文字形必被切。
      fontFamily: font.semibold,
      fontSize: 12,
      lineHeight: 17,
      color: colors.danger,
    },
  });
}
