import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation';

// 진단 도구: 환경 변수가 제대로 로드되었는지 확인
const REQUIRED_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_WEATHER_API_KEY',
  'EXPO_PUBLIC_PLANTID_API_KEY'
];

function EnvCheck() {
  const missingKeys = REQUIRED_KEYS.filter(key => !process.env[key]);
  
  if (missingKeys.length > 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>⚠️ 설정 오류 (API Key Missing)</Text>
        <Text style={styles.errorText}>Vercel 설정에서 아래 환경 변수가 누락되었습니다:</Text>
        {missingKeys.map(key => (
          <Text key={key} style={styles.keyText}>• {key}</Text>
        ))}
        <Text style={styles.footer}>Vercel Settings -> Environment Variables에서 등록 후 Redeploy 해주세요.</Text>
      </View>
    );
  }
  return null;
}

export default function App() {
  const envError = <EnvCheck />;
  
  if (envError) {
    return (
      <SafeAreaProvider>
        {envError}
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  keyText: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f5f5f5',
    padding: 5,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  footer: {
    fontSize: 12,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  }
});
