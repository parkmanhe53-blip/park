import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, StatusBar, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { loadUserInfo } from '../store/userStore';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const [userInfo, setUserInfo] = React.useState(null);

  React.useEffect(() => {
    loadUserInfo().then(setUserInfo);
  }, []);

  const handleEnter = async () => {
    const userInfo = await loadUserInfo();
    if (userInfo) {
      navigation.replace('Main');
    } else {
      navigation.replace('Setup');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#2D5016', '#1A3A08', '#0D2206']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* 중앙 메인 이미지 영역 (박스에 꽉 차게 설정) */}
      <View style={styles.orchardScene}>
        <Image
          source={userInfo?.farmImage ? { uri: userInfo.farmImage } : require('../../assets/parkimage01.jpg')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </View>

      {/* 하단 텍스트 + 버튼 */}
      <SafeAreaView style={styles.bottom} edges={['bottom']}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🌿  ORCHARD MANAGER</Text>
        </View>

        <Text style={styles.title}>
          {userInfo ? (
            <>
              {userInfo.ownerName}{'\n'}
              <Text style={styles.titleAccent}>{userInfo.farmName}</Text>
            </>
          ) : (
            <>
              박만희{'\n'}<Text style={styles.titleAccent}>과수원</Text>
            </>
          )}
        </Text>
        <Text style={styles.subtitle}>사과나무와 함께하는 스마트 농업</Text>

        <TouchableOpacity
          style={styles.enterBtn}
          activeOpacity={0.85}
          onPress={handleEnter}
        >
          <LinearGradient
            colors={[Colors.greenMid, Colors.greenLight]}
            style={styles.enterGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.enterText}>🍎  과수원으로 입장</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  orchardScene: {
    height: height * 0.45,
    marginTop: 50,
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  bottom: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginBottom: Spacing.md,
  },
  badgeText: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.8)', letterSpacing: 1.5, fontWeight: '600' },

  title: {
    fontSize: Typography.xxxl,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  titleAccent: { color: Colors.greenLight },
  subtitle: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.65)', marginTop: 6, marginBottom: Spacing.xxl },

  enterBtn:      { width: '100%', borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.lg },
  enterGradient: { paddingVertical: 16, alignItems: 'center' },
  enterText: { fontSize: Typography.md, fontWeight: '800', color: Colors.greenDark, letterSpacing: 0.5 },

  dots: { flexDirection: 'row', gap: 6 },
  dot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 20, borderRadius: 3, backgroundColor: Colors.greenLight },
});
