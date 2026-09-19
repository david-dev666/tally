import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import { tintOf } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { font, radius, space, type ThemeColors } from '../theme';
import type { Activity } from '../types';
import { expandFeedback } from '../utils/feedback';
import { formatLastSeen } from '../utils/date';

interface ActionButtonProps {
  activity: Activity;
  count: number;
  /** 该类型最近一次记录的时间，用于副标题 */
  lastAt?: number;
  onRecord: (note?: string) => void;
}

/**
 * 打卡按钮：
 * - 短按 → 直接记录一次
 * - 长按 → 副标题那一行原地换成输入框，整个按钮不变形
 *          敲回车即确认打卡，点别处则收起且不记录
 */
export function ActionButton({ activity, count, lastAt, onRecord }: ActionButtonProps) {
  const { colors, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);

  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState('');
  const inputRef = useRef<TextInput>(null);

  const scale = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(0)).current;

  const tint = tintOf(activity.color);

  useEffect(() => {
    if (!expanded) return;
    // 等布局就位再聚焦，避免键盘弹起时按钮抖动
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [expanded]);

  const playRecordAnimation = () => {
    scale.stopAnimation();
    scale.setValue(0.97);
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 6,
    }).start();

    pop.stopAnimation();
    pop.setValue(0);
    Animated.timing(pop, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (expanded) return;
    onRecord();
    playRecordAnimation();
  };

  const handleLongPress = () => {
    if (expanded) return;
    expandFeedback();
    setNote('');
    setExpanded(true);
  };

  /** 回车确认：有内容就带备注，没内容就是纯打卡 */
  const submit = () => {
    if (!expanded) return;
    onRecord(note.trim() || undefined);
    setNote('');
    setExpanded(false);
    playRecordAnimation();
  };

  /** 失去焦点视为放弃，收起但不记录 */
  const handleBlur = () => {
    setExpanded(false);
    setNote('');
  };

  const popStyle = {
    opacity: pop.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
    transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [4, -26] }) }],
  };

  const subtitle = lastAt ? formatLastSeen(lastAt) : '还没记录过';

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={expanded ? undefined : handlePress}
        onLongPress={expanded ? undefined : handleLongPress}
        delayLongPress={350}
        android_ripple={expanded ? undefined : { color: tint }}
        style={styles.inner}
      >
        <View style={[styles.iconBox, { backgroundColor: tint }]}>
          <Text style={styles.emoji}>{activity.emoji}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.label} numberOfLines={1}>
            {activity.label}
          </Text>

          {expanded ? (
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={note}
              onChangeText={setNote}
              onBlur={handleBlur}
              onSubmitEditing={submit}
              returnKeyType="done"
              maxLength={40}
              selectionColor={activity.color}
            />
          ) : (
            <Text style={styles.sub} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.counter}>
          <View style={styles.counterRow}>
            <Text style={[styles.count, { color: count > 0 ? activity.color : colors.textMuted }]}>
              {count}
            </Text>
            <Text style={styles.unit}>次</Text>
          </View>
          <Animated.View style={[styles.plusOne, popStyle]}>
            <Text style={[styles.plusOneText, { color: activity.color }]}>+1</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors, shadow: ViewStyle) {
  return StyleSheet.create({
    wrapper: {
      marginBottom: space.md,
      borderRadius: radius.lg,
      backgroundColor: colors.card,
      ...shadow,
    },
    inner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: space.lg,
      paddingHorizontal: space.lg,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    iconBox: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: { fontSize: 26, lineHeight: 32 },
    body: { flex: 1, marginLeft: space.md, marginRight: space.sm },
    label: {
      fontFamily: font.semibold,
      fontSize: 17,
      color: colors.text,
      letterSpacing: -0.3,
    },
    sub: {
      fontFamily: font.regular,
      fontSize: 12.5,
      color: colors.textSub,
      marginTop: 3,
      letterSpacing: -0.1,
    },

    // 输入框紧贴副标题的位置，高度只比文字行略高一点，按钮整体不会撑大
    input: {
      marginTop: 3,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.sm,
      backgroundColor: colors.cardAlt,
      fontFamily: font.regular,
      fontSize: 13.5,
      color: colors.text,
    },

    counter: { alignItems: 'flex-end', minWidth: 56 },
    counterRow: { flexDirection: 'row', alignItems: 'baseline' },
    count: {
      fontFamily: font.bold,
      fontSize: 26,
      letterSpacing: -0.6,
      fontVariant: ['tabular-nums'],
    },
    unit: { fontFamily: font.regular, fontSize: 11, color: colors.textMuted, marginLeft: 3 },
    plusOne: { position: 'absolute', right: 2, top: -6 },
    plusOneText: { fontFamily: font.bold, fontSize: 15 },
  });
}
