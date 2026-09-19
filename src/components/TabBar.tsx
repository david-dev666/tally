import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '../hooks/useTheme';
import { font, radius, space, type ThemeColors } from '../theme';

export type TabKey = 'today' | 'history' | 'settings';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'today', label: '今天', icon: '✎' },
  { key: 'history', label: '历史', icon: '▦' },
  { key: 'settings', label: '设置', icon: '⚙' },
];

interface TabBarProps {
  value: TabKey;
  onChange: (key: TabKey) => void;
}

export function TabBar({ value, onChange }: TabBarProps) {
  const { colors, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);

  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.item,
              active && styles.itemActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.icon, { color: active ? colors.text : colors.textMuted }]}>
              {tab.icon}
            </Text>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors, shadow: ViewStyle) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      marginHorizontal: space.lg,
      marginTop: space.sm,
      marginBottom: space.sm,
      borderRadius: radius.pill,
      padding: 5,
      ...shadow,
    },
    item: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      borderRadius: radius.pill,
      gap: 6,
    },
    itemActive: { backgroundColor: colors.cardAlt },
    pressed: { opacity: 0.6 },
    icon: { fontSize: 14 },
    label: {
      fontFamily: font.medium,
      fontSize: 13.5,
      color: colors.textMuted,
      letterSpacing: -0.1,
    },
    labelActive: { fontFamily: font.semibold, color: colors.text },
  });
}
