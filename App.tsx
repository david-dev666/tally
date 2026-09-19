import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { TabBar, type TabKey } from './src/components/TabBar';
import { useActivities } from './src/hooks/useActivities';
import { useFeedbackLevel } from './src/hooks/useFeedbackLevel';
import { useRecords } from './src/hooks/useRecords';
import { ThemeProvider, useTheme } from './src/hooks/useTheme';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TodayScreen } from './src/screens/TodayScreen';

// 字体没就绪前先别撤掉启动屏，否则会闪一下系统字体
SplashScreen.preventAutoHideAsync().catch(() => {});

function Shell() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabKey>('today');
  const records = useRecords();
  const activities = useActivities();
  // 档位读取很快，不阻塞首屏；取到后会立刻作用于之后的震动
  const feedback = useFeedbackLevel();

  const ready = records.recordsReady && activities.activitiesReady;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      {ready ? (
        <>
          <View style={styles.content}>
            {tab === 'today' ? (
              <TodayScreen
                records={records}
                activities={activities}
                onGoToSettings={() => setTab('settings')}
              />
            ) : null}
            {tab === 'history' ? (
              <HistoryScreen records={records} activities={activities} />
            ) : null}
            {tab === 'settings' ? (
              <SettingsScreen
                records={records}
                activities={activities}
                feedbackLevel={feedback.feedbackLevel}
                onChangeFeedbackLevel={feedback.changeLevel}
              />
            ) : null}
          </View>
          <TabBar value={tab} onChange={setTab} />
        </>
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: require('./assets/fonts/Inter_400Regular.ttf'),
    Inter_500Medium: require('./assets/fonts/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('./assets/fonts/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('./assets/fonts/Inter_700Bold.ttf'),
  });

  // 字体加载失败也要放行，避免启动屏卡住
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <Shell />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1 },
});
