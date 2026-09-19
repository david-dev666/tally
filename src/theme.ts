import { StyleSheet, type ViewStyle } from 'react-native';

/** 语义色板 —— App 只提供深色一套 */
export interface ThemeColors {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textSub: string;
  textMuted: string;
  line: string;
  overlay: string;
  danger: string;
  /** 强调色：选中态、拖拽中的高亮 */
  accent: string;
}

export const appColors: ThemeColors = {
  bg: '#000000',
  card: '#1C1C1E',
  cardAlt: '#2C2C2E',
  text: '#FFFFFF',
  textSub: 'rgba(235, 235, 245, 0.60)',
  textMuted: 'rgba(235, 235, 245, 0.30)',
  line: 'rgba(84, 84, 88, 0.60)',
  overlay: 'rgba(0, 0, 0, 0.60)',
  danger: '#FF453A',
  accent: '#0A84FF',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/**
 * Apple 风格的字体栈。
 * Inter 是 SF Pro 最接近的开源替代，中文会自动回落到系统字体。
 */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** 深色下阴影几乎不可见，卡片改用极淡描边来分层 */
export const cardShadow: ViewStyle = {
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: 'rgba(255, 255, 255, 0.10)',
};
