import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { tintOf } from '../constants';
import type { ActivitiesStore } from '../hooks/useActivities';
import type { DayGroup, RecordsStore } from '../hooks/useRecords';
import { useTheme } from '../hooks/useTheme';
import { font, radius, space, type ThemeColors } from '../theme';
import { dayKey, formatClock, formatDayKeyLabel } from '../utils/date';

/** 柱状图的高度上限（px） */
const CHART_HEIGHT = 72;
/** 趋势与构成统计的时间窗口（天） */
const WINDOW_DAYS = 14;

type Styles = ReturnType<typeof createStyles>;

interface TrendDay {
  key: string;
  label: string;
  total: number;
  counts: Record<string, number>;
}

function StatCell({
  label,
  value,
  unit,
  styles,
}: {
  label: string;
  value: number;
  unit?: string;
  styles: Styles;
}) {
  return (
    <View style={styles.statCell}>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DayCard({
  group,
  isOpen,
  onToggle,
  activities,
  styles,
  colors,
}: {
  group: DayGroup;
  isOpen: boolean;
  onToggle: () => void;
  activities: ActivitiesStore;
  styles: Styles;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.card}>
      <Pressable onPress={onToggle} style={styles.cardHeader}>
        <View style={styles.cardHeaderTop}>
          <Text style={styles.dayTitle}>{formatDayKeyLabel(group.key)}</Text>
          <Text style={styles.dayTotal}>共 {group.total} 次</Text>
        </View>

        <View style={styles.chips}>
          {activities.activities.map((activity) => {
            const count = group.counts[activity.id] ?? 0;
            if (count === 0) return null;
            return (
              <View
                key={activity.id}
                style={[styles.chip, { backgroundColor: tintOf(activity.color) }]}
              >
                <Text style={[styles.chipText, { color: activity.color }]}>
                  {activity.emoji} {activity.label} {count}
                </Text>
              </View>
            );
          })}
        </View>
      </Pressable>

      {isOpen ? (
        <View style={styles.cardBody}>
          {group.records.map((record, index) => {
            const activity = activities.activityMap[record.activityId];
            return (
              <View key={record.id} style={[styles.row, index > 0 && styles.rowDivider]}>
                <View
                  style={[styles.dot, { backgroundColor: activity?.color ?? colors.textMuted }]}
                />
                <Text style={styles.time}>{formatClock(record.at)}</Text>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {activity ? `${activity.emoji} ${activity.label}` : '已删除的内容'}
                  {record.note ? <Text style={styles.rowNote}>{` · ${record.note}`}</Text> : null}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <Pressable onPress={onToggle} style={styles.toggleBtn}>
        <Text style={styles.toggleText}>{isOpen ? '收起明细' : '展开时间明细'}</Text>
      </Pressable>
    </View>
  );
}

export function HistoryScreen({
  records,
  activities,
}: {
  records: RecordsStore;
  activities: ActivitiesStore;
}) {
  const { colors, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  /** 时间窗口的起点（当天 00:00） */
  const windowStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (WINDOW_DAYS - 1));
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  /** 最近 14 天，每天的次数与按内容的拆解 */
  const trend = useMemo<TrendDay[]>(() => {
    const days: TrendDay[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = dayKey(date.getTime());
      const group = records.dayGroups.find((item) => item.key === key);
      days.push({
        key,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        total: group?.total ?? 0,
        counts: group?.counts ?? {},
      });
    }
    return days;
  }, [records.dayGroups]);

  /** 单日最高次数，用来定柱子的高度基准 */
  const peak = useMemo(() => Math.max(1, ...trend.map((day) => day.total)), [trend]);

  /** 窗口内各内容的累计次数 */
  const totalsByActivity = useMemo(() => {
    const map: Record<string, number> = {};
    for (const record of records.records) {
      if (record.at < windowStart) continue;
      map[record.activityId] = (map[record.activityId] ?? 0) + 1;
    }
    return map;
  }, [records.records, windowStart]);

  const topActivity = useMemo(
    () => Math.max(1, ...Object.values(totalsByActivity)),
    [totalsByActivity],
  );

  const ranked = useMemo(
    () =>
      [...activities.activities].sort(
        (a, b) => (totalsByActivity[b.id] ?? 0) - (totalsByActivity[a.id] ?? 0),
      ),
    [activities.activities, totalsByActivity],
  );

  const windowTotal = useMemo(
    () => Object.values(totalsByActivity).reduce((sum, n) => sum + n, 0),
    [totalsByActivity],
  );

  if (records.dayGroups.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyEmoji}>🗂️</Text>
        <Text style={styles.emptyTitle}>还没有任何记录</Text>
        <Text style={styles.emptyHint}>去「今天」页面点几个按钮试试</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
    >
      <Text style={styles.title}>历史</Text>

      <View style={styles.stats}>
        <StatCell label="总记录" value={records.totalCount} styles={styles} />
        <View style={styles.statDivider} />
        <StatCell label="有记录" value={records.activeDays} unit="天" styles={styles} />
        <View style={styles.statDivider} />
        <StatCell label="连续" value={records.streak} unit="天" styles={styles} />
      </View>

      {/* ---- 趋势：最近 14 天，按内容类型堆叠着色 ---- */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>最近 {WINDOW_DAYS} 天</Text>
        <Text style={styles.sectionMeta}>{windowTotal} 次</Text>
      </View>
      <View style={styles.chartCard}>
        <View style={styles.chart}>
          {trend.map((day) => (
            <View key={day.key} style={styles.chartCol}>
              {day.total === 0 ? (
                <View style={[styles.chartEmpty, { backgroundColor: colors.line }]} />
              ) : (
                ranked.map((activity) => {
                  const count = day.counts[activity.id] ?? 0;
                  if (count === 0) return null;
                  return (
                    <View
                      key={activity.id}
                      style={{
                        width: '100%',
                        height: (count / peak) * CHART_HEIGHT,
                        backgroundColor: activity.color,
                      }}
                    />
                  );
                })
              )}
            </View>
          ))}
        </View>

        <View style={styles.chartAxis}>
          <Text style={styles.chartAxisText}>{trend[0]?.label}</Text>
          <Text style={styles.chartAxisText}>单日最多 {peak} 次</Text>
          <Text style={styles.chartAxisText}>{trend[trend.length - 1]?.label}</Text>
        </View>

        <View style={styles.legend}>
          {ranked.map((activity) => {
            const count = totalsByActivity[activity.id] ?? 0;
            if (count === 0) return null;
            return (
              <View key={activity.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: activity.color }]} />
                <Text style={styles.legendText}>{activity.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ---- 构成：同一时间窗口内各类内容的占比 ---- */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>内容构成</Text>
        <Text style={styles.sectionMeta}>最近 {WINDOW_DAYS} 天</Text>
      </View>
      <View style={styles.distCard}>
        {ranked.map((activity) => {
          const count = totalsByActivity[activity.id] ?? 0;
          return (
            <View key={activity.id} style={styles.distRow}>
              <Text style={styles.distLabel} numberOfLines={1}>
                {activity.emoji} {activity.label}
              </Text>
              <View style={styles.distTrack}>
                <View
                  style={[
                    styles.distFill,
                    {
                      width: `${Math.max(2, (count / topActivity) * 100)}%`,
                      backgroundColor: activity.color,
                      opacity: count === 0 ? 0.18 : 1,
                    },
                  ]}
                />
              </View>
              <Text style={styles.distValue}>{count}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>每日明细</Text>

      {records.dayGroups.map((group) => (
        <DayCard
          key={group.key}
          group={group}
          isOpen={!!expanded[group.key]}
          onToggle={() => setExpanded((prev) => ({ ...prev, [group.key]: !prev[group.key] }))}
          activities={activities}
          styles={styles}
          colors={colors}
        />
      ))}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors, shadow: ViewStyle) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.xxl },

    title: {
      fontFamily: font.bold,
      fontSize: 34,
      color: colors.text,
      letterSpacing: -1.2,
      marginBottom: space.xl,
    },

    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      paddingVertical: space.lg,
      marginBottom: space.xl,
      ...shadow,
    },
    statCell: { flex: 1, alignItems: 'center' },
    statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
    statValue: {
      fontFamily: font.bold,
      fontSize: 23,
      color: colors.text,
      letterSpacing: -0.8,
      fontVariant: ['tabular-nums'],
    },
    statUnit: { fontFamily: font.regular, fontSize: 11, color: colors.textMuted, marginLeft: 2 },
    statLabel: { fontFamily: font.regular, fontSize: 12, color: colors.textSub, marginTop: 3 },
    statDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: colors.line },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: space.md,
      paddingRight: 2,
    },
    sectionTitle: {
      fontFamily: font.semibold,
      fontSize: 12.5,
      color: colors.textSub,
      marginLeft: 2,
      marginBottom: space.md,
    },
    sectionMeta: {
      fontFamily: font.regular,
      fontSize: 11.5,
      color: colors.textMuted,
      marginBottom: space.md,
    },

    chartCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: space.lg,
      marginBottom: space.xl,
      ...shadow,
    },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: CHART_HEIGHT,
      gap: 4,
    },
    chartCol: { flex: 1, justifyContent: 'flex-end' },
    chartEmpty: { width: '100%', height: 3, borderRadius: 2 },
    chartAxis: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.md,
    },
    chartAxisText: { fontFamily: font.regular, fontSize: 11, color: colors.textMuted },

    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: space.lg,
      paddingTop: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontFamily: font.regular, fontSize: 11.5, color: colors.textSub },

    distCard: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      paddingVertical: space.lg,
      paddingHorizontal: space.lg,
      gap: space.md,
      marginBottom: space.xl,
      ...shadow,
    },
    distRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    distLabel: {
      minWidth: 96,
      flexShrink: 1,
      fontFamily: font.regular,
      fontSize: 12.5,
      color: colors.text,
    },
    distTrack: {
      flex: 1,
      height: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.cardAlt,
      overflow: 'hidden',
    },
    distFill: { height: '100%', borderRadius: radius.pill },
    distValue: {
      width: 30,
      textAlign: 'right',
      fontFamily: font.semibold,
      fontSize: 12.5,
      color: colors.textSub,
      fontVariant: ['tabular-nums'],
    },

    card: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      marginBottom: space.md,
      overflow: 'hidden',
      ...shadow,
    },
    cardHeader: { paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.md },
    cardHeaderTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dayTitle: {
      fontFamily: font.semibold,
      fontSize: 16,
      color: colors.text,
      letterSpacing: -0.3,
    },
    dayTotal: { fontFamily: font.regular, fontSize: 12.5, color: colors.textMuted },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md },
    chip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.sm },
    chipText: { fontFamily: font.semibold, fontSize: 12 },

    cardBody: { paddingHorizontal: space.lg },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    dot: { width: 7, height: 7, borderRadius: 4, marginRight: 10 },
    time: {
      fontFamily: font.regular,
      fontSize: 13,
      color: colors.textSub,
      fontVariant: ['tabular-nums'],
      width: 46,
    },
    rowLabel: { flex: 1, fontFamily: font.regular, fontSize: 14, color: colors.text },
    rowNote: { fontFamily: font.regular, fontSize: 12.5, color: colors.textSub },
    toggleBtn: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      paddingVertical: 11,
      alignItems: 'center',
    },
    toggleText: { fontFamily: font.regular, fontSize: 12.5, color: colors.textSub },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
    emptyEmoji: { fontSize: 40, marginBottom: space.md },
    emptyTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.text },
    emptyHint: { fontFamily: font.regular, fontSize: 12.5, color: colors.textMuted, marginTop: 6 },
  });
}
