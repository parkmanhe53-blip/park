import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Text, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography } from '../theme';

// Screens
import SplashScreen    from '../screens/SplashScreen';
import SetupScreen     from '../screens/SetupScreen';
import SettingsScreen  from '../screens/SettingsScreen';
import HomeScreen      from '../screens/HomeScreen';
import JournalScreen   from '../screens/JournalScreen';
import WriteScreen     from '../screens/WriteScreen';
import JournalDetail   from '../screens/JournalDetail';
import DiagnosisScreen from '../screens/DiagnosisScreen';
import DiagnosisResult from '../screens/DiagnosisResult';
import WeatherScreen   from '../screens/WeatherScreen';
import GalleryScreen   from '../screens/GalleryScreen';

const Stack = createNativeStackNavigator();
const Tab   = createMaterialTopTabNavigator();

const TABS = [
  { name: 'Home',      label: '홈',    emoji: '🏠' },
  { name: 'Journal',   label: '일지',  emoji: '📓' },
  { name: 'Diagnosis', label: '진단',  emoji: '🔬' },
  { name: 'Weather',   label: '날씨',  emoji: '📅' },
  { name: 'Gallery',   label: '갤러리', emoji: '🖼️' },
];

const SCREENS = {
  Home:      HomeScreen,
  Journal:   JournalScreen,
  Diagnosis: DiagnosisScreen,
  Weather:   WeatherScreen,
  Gallery:   GalleryScreen,
};

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      tabBarPosition="top"
      screenOptions={{
        swipeEnabled: true,
        tabBarStyle: {
          backgroundColor: Colors.greenMain,
          // Safe area 상단 여백 적용
          paddingTop: insets.top,
          elevation: 4,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
        },
        tabBarIndicatorStyle: {
          backgroundColor: Colors.greenLight,
          height: 3,
          borderRadius: 2,
        },
        tabBarActiveTintColor:   '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          minHeight: 52,
        },
        tabBarPressColor: 'rgba(255,255,255,0.15)',
      }}
    >
      {TABS.map(t => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={SCREENS[t.name]}
          options={{
            tabBarLabel: ({ focused, color }) => (
              <View style={{ alignItems: 'center', gap: 1 }}>
                <Text style={{ fontSize: focused ? 20 : 18, lineHeight: 22 }}>{t.emoji}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color, letterSpacing: 0.2 }}>
                  {t.label}
                </Text>
              </View>
            ),
            tabBarShowLabel: true,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash"          component={SplashScreen} />
        <Stack.Screen name="Setup"           component={SetupScreen} />
        <Stack.Screen name="Main"            component={MainTabs} />
        <Stack.Screen name="Write"           component={WriteScreen} />
        <Stack.Screen name="JournalDetail"   component={JournalDetail} />
        <Stack.Screen name="DiagnosisResult" component={DiagnosisResult} />
        <Stack.Screen name="Settings"        component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
