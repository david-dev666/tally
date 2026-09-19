import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import { COLOR_PALETTE, EMOJI_PRESETS, tintOf } from '../constants';
import type { ActivityDraft } from '../hooks/useActivities';
import { useTheme } from '../hooks/useTheme';
import { font, radius, space, type ThemeColors } from '../theme';
import type { Activity } from '../types';

interface ActivityEditorProps {
  visible: boolean;
  /** 传入表示编辑已有内容，null 表示新增 */
  editing: Activity | null;
  onSubmit: (draft: ActivityDraft) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ActivityEditor({
  visible,
  editing,
  onSubmit,
  onDelete,
  onClose,
}: ActivityEditorProps) {
  const { colors, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow), [colors, shadow]);

  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_PRESETS[0]);
  const [color, setColor] = useState(COLOR_PALETTE[0]);

  // 每次打开时同步为当前编辑对象的值
  useEffect(() => {
    if (!visible) return;
    setLabel(editing?.label ?? '');
    setEmoji(editing?.emoji ?? EMOJI_PRESETS[0]);
    setColor(editing?.color ?? COLOR_PALETTE[0]);
  }, [visible, editing]);

  const canSave = label.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSubmit({ label: label.trim(), emoji, color });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.backdropTouch} onPress={onClose} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={10} style={styles.headerSide}>
                <Text style={styles.cancel}>取消</Text>
              </Pressable>
              <Text style={styles.headerTitle}>{editing ? '编辑学习内容' : '新增学习内容'}</Text>
              <View style={styles.headerSide} />
            </View>

            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.preview, { backgroundColor: tintOf(color) }]}>
                <Text style={styles.previewEmoji}>{emoji}</Text>
                <Text style={[styles.previewLabel, { color }]} numberOfLines={1}>
                  {label.trim() || '内容名称'}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>名称</Text>
              <TextInput
                style={styles.input}
                value={label}
                onChangeText={setLabel}
                placeholder="例如：刷算法题"
                placeholderTextColor={colors.textMuted}
                maxLength={20}
                returnKeyType="done"
                selectionColor={color}
              />
              <Text style={styles.fieldHint}>最多 20 个字</Text>

              <Text style={styles.fieldLabel}>图标</Text>
              <View style={styles.grid}>
                {EMOJI_PRESETS.map((item) => {
                  const active = item === emoji;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => setEmoji(item)}
                      style={[
                        styles.emojiCell,
                        active && { borderColor: color, backgroundColor: tintOf(color) },
                      ]}
                    >
                      <Text style={styles.emojiText}>{item}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>颜色</Text>
              <View style={styles.grid}>
                {COLOR_PALETTE.map((item) => {
                  const active = item === color;
                  return (
                    <Pressable key={item} onPress={() => setColor(item)} style={styles.colorCell}>
                      <View style={[styles.colorDot, { backgroundColor: item }]}>
                        {active ? <Text style={styles.colorCheck}>✓</Text> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  { backgroundColor: canSave ? colors.text : colors.cardAlt },
                  pressed && canSave && styles.pressedOpacity,
                ]}
                onPress={handleSave}
                disabled={!canSave}
              >
                <Text
                  style={[styles.saveText, { color: canSave ? colors.card : colors.textMuted }]}
                >
                  {editing ? '保存修改' : '添加'}
                </Text>
              </Pressable>

              {editing ? (
                <Pressable
                  style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressedOpacity]}
                  onPress={onDelete}
                >
                  <Text style={styles.deleteText}>删除这项内容</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, shadow: ViewStyle) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end' },
    backdropTouch: { flex: 1 },

    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingBottom: space.lg,
      maxHeight: '88%',
    },
    handle: {
      width: 38,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.line,
      alignSelf: 'center',
      marginTop: space.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.lg,
      paddingTop: space.md,
      paddingBottom: space.md,
    },
    headerTitle: {
      fontFamily: font.semibold,
      fontSize: 15.5,
      color: colors.text,
      letterSpacing: -0.2,
    },
    headerSide: { width: 40 },
    cancel: { fontFamily: font.regular, fontSize: 14, color: colors.textSub },

    body: { flexGrow: 0 },
    bodyContent: { paddingHorizontal: space.lg, paddingBottom: space.lg },

    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: space.lg,
      borderRadius: radius.lg,
      marginBottom: space.lg,
    },
    previewEmoji: { fontSize: 30 },
    previewLabel: {
      fontFamily: font.bold,
      fontSize: 18,
      maxWidth: '70%',
      letterSpacing: -0.4,
    },

    fieldLabel: {
      fontFamily: font.semibold,
      fontSize: 12.5,
      color: colors.textSub,
      marginBottom: space.sm,
      marginLeft: 2,
    },
    fieldHint: {
      fontFamily: font.regular,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 6,
      marginLeft: 2,
    },
    input: {
      backgroundColor: colors.cardAlt,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      paddingVertical: 13,
      fontFamily: font.regular,
      fontSize: 15.5,
      color: colors.text,
    },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.lg },
    emojiCell: {
      width: 46,
      height: 46,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: 'transparent',
      backgroundColor: colors.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiText: { fontSize: 22, lineHeight: 28 },
    colorCell: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    colorDot: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorCheck: { color: '#FFFFFF', fontSize: 16, fontFamily: font.bold },

    footer: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm },
    saveBtn: { paddingVertical: 15, borderRadius: radius.md, alignItems: 'center' },
    saveText: { fontFamily: font.semibold, fontSize: 15.5 },
    deleteBtn: { paddingVertical: 13, borderRadius: radius.md, alignItems: 'center' },
    deleteText: { fontFamily: font.medium, fontSize: 14, color: colors.danger },
    pressedOpacity: { opacity: 0.75 },
  });
}
