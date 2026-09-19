import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, Platform, type ViewStyle } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { appColors, cardShadow, type ThemeColors } from '../theme';

interface ThemeValue {
  colors: ThemeColors;
  /** 卡片的分层方式（深色下是描边，不是阴影） */
  shadow: ViewStyle;
}

const ThemeContext = createContext<ThemeValue>({
  colors: appColors,
  shadow: cardShadow,
});

/**
 * App 固定为深色，不提供主题切换。
 *
 * 这里仍要主动告诉原生层「我是深色」：否则手机处于系统浅色模式时，
 * Android 会按浅色去渲染状态栏文字、键盘、原生弹窗这些我们控制不到的部件，
 * 和 App 自己画的深色界面撞在一起。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // React Native Web 没有实现 setColorScheme，直接调用会抛错并把整棵树干掉
    if (Platform.OS !== 'web') Appearance.setColorScheme('dark');
    // 根视图底色也跟着设，避免切换页面或键盘弹起时露出系统浅色底
    void SystemUI.setBackgroundColorAsync(appColors.bg);
  }, []);

  const value = useMemo<ThemeValue>(() => ({ colors: appColors, shadow: cardShadow }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
