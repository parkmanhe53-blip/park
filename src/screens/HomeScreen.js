import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import SectionHeader from '../components/SectionHeader';
import Tag from '../components/Tag';
import { loadJournals } from '../store/journalStore';
import { loadUserInfo } from '../store/userStore';
import { fetchWeather, getWeatherIcon, getWeatherDesc, getWorkRecommendations, getMockWeather, getCurrentLocation } from '../utils/weather';

export default function HomeScreen({ navigation }) {
  const [weather, setWeather]           = useState(getMockWeather());
  const [locationName, setLocationName] = useState('위치 확인 중…');
  const [journals, setJournals]         = useState([]);
  const [userInfo, setUserInfo]         = useState(null);
  const [refreshing, setRefreshing]     = useState(false);
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
  const days = ['일','월','화','수','목','금','토'];
  const dayStr = days[today.getDay()];

  const loadData = useCallback(async () => {
    // 일지 및 사용자 정보 즉시 로드
    loadJournals().then(j => setJournals(j.slice(0, 3)));
    loadUserInfo().then(setUserInfo);
    
    getCurrentLocation().then(({ nx, ny, locationName: name }) => {
      setLocationName(name);
      fetchWeather(nx, ny).catch(() => getMockWeather()).then(setWeather);
    });
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    loadJournals().then(j => setJournals(j.slice(0, 3)));
    loadUserInfo().then(setUserInfo);
    
    getCurrentLocation().then(({ nx, ny, locationName: name }) => {
      setLocationName(name);
      fetchWeather(nx, ny).catch(() => getMockWeather()).then(w => {
        setWeather(w);
        setRefreshing(false);
      });
    }).catch(() => setRefreshing(false));
  };

  const recs = getWorkRecommendations(weather);
  const weatherIcon = getWeatherIcon(weather.skyCode, weather.rainCode);
  const weatherDesc = getWeatherDesc(weather.skyCode, weather.rainCode);

  const quickMenus = [
    { icon: '📓', label: '영농일지', screen: 'Journal',   color: ['#4A7C2F','#6EA832'] },
    { icon: '🔬', label: '병충해진단', screen: 'Diagnosis', color: ['#C0392B','#E74C3C'] },
    { icon: '📅', label: '작업추천', screen: 'Weather',   color: ['#1A5276','#2E86C1'] },
    { icon: '🖼️', label: '농부갤러리', screen: 'Gallery',   color: ['#7D5A2C','#A0785C'] },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="light-content" />

      {/* 헤더 */}
      <LinearGradient colors={[Colors.greenMain, Colors.greenMid]} style={styles.header}>
        <SafeAreaView edges={[]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>안녕하세요, 오늘도 풍년을! 🌱</Text>
              <Text style={styles.farmerName}>
                {userInfo ? `${userInfo.ownerName} 농부님` : '농부님'}
              </Text>
              {userInfo?.farmName && (
                <Text style={styles.farmSubName}>{userInfo.farmName}</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                style={styles.settingsBtn} 
                onPress={() => navigation.navigate('Settings')}
              >
                <Text style={{ fontSize: 22 }}>⚙️</Text>
              </TouchableOpacity>
              <View style={styles.avatar}>
                {userInfo?.farmImage ? (
                  <Image source={{ uri: userInfo.farmImage }} style={styles.avatarImg} />
                ) : (
                  <Text style={{ fontSize: 26 }}>👨‍🌾</Text>
                )}
              </View>
            </View>
          </View>

          {/* 날씨 인라인 */}
          <View style={styles.weatherBox}>
            <Text style={styles.weatherBigIcon}>{weatherIcon}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.weatherTemp}>{Math.round(weather.temp)}</Text>
                <Text style={styles.weatherUnit}>°C</Text>
              </View>
              <Text style={styles.weatherDesc}>{weatherDesc} · {locationName}</Text>
              <View style={styles.weatherMeta}>
                <Text style={styles.weatherMetaItem}>💧 <Text style={styles.metaVal}>{weather.humidity}%</Text></Text>
                <Text style={styles.weatherMetaItem}>💨 <Text style={styles.metaVal}>{weather.windSpeed}m/s</Text></Text>
                <Text style={styles.weatherMetaItem}>🌧 <Text style={styles.metaVal}>{weather.rainProb}%</Text></Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.weatherDate}>{dateStr}</Text>
              <Text style={styles.weatherDay}>{dayStr}요일</Text>
              <Text style={styles.weatherMinMax}>↑{weather.maxTemp}° / ↓{weather.minTemp}°</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.greenMain} />}
      >
        {/* 퀵 메뉴 */}
        <SectionHeader title="바로가기" />
        <View style={styles.quickGrid}>
          {quickMenus.map(m => (
            <TouchableOpacity
              key={m.screen}
              style={styles.quickItem}
              onPress={() => navigation.navigate(m.screen)}
              activeOpacity={0.8}
            >
              <LinearGradient colors={m.color} style={styles.quickIcon}>
                <Text style={{ fontSize: 26 }}>{m.icon}</Text>
              </LinearGradient>
              <Text style={styles.quickLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 오늘 추천 작업 */}
        <SectionHeader title="오늘 추천 농작업" actionLabel="전체보기" onAction={() => navigation.navigate('Weather')} />
        <View style={[styles.card, { padding: 0 }]}>
          <LinearGradient colors={['#FEF9E7','#FFFDF5']} style={styles.taskHeader}>
            <Text style={{ fontSize: 14 }}>{weatherIcon}</Text>
            <Text style={styles.taskHeaderText}>{weatherDesc} · 방제 조건 확인</Text>
            <Tag label="우선순위" variant="gold" style={{ marginLeft: 'auto' }} />
          </LinearGradient>
          {recs.slice(0, 3).map((r, i) => (
            <View key={i} style={[styles.taskItem, i === recs.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.taskDot, { backgroundColor: r.color }]} />
              <Text style={styles.taskText}>{r.icon}  {r.text}</Text>
              <Tag label={r.priority === 'high' ? '필수' : r.priority === 'medium' ? '권장' : '참고'}
                   variant={r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'gold' : 'green'} />
            </View>
          ))}
        </View>

        {/* 최근 영농일지 */}
        <SectionHeader title="최근 영농일지" actionLabel="더보기" onAction={() => navigation.navigate('Journal')} />
        <View style={[styles.card, { padding: 0 }]}>
          {journals.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📓</Text>
              <Text style={styles.emptyText}>아직 작성된 일지가 없어요</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Write')}>
                <Text style={styles.emptyAction}>첫 일지 작성하기 →</Text>
              </TouchableOpacity>
            </View>
          ) : journals.map((j, i) => (
            <TouchableOpacity
              key={j.id}
              style={[styles.logItem, i === journals.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate('JournalDetail', { journal: j })}
              activeOpacity={0.75}
            >
              <View style={styles.logThumb}>
                {j.photos?.length > 0 ? (
                  <Image source={{ uri: j.photos[0] }} style={styles.thumbImage} />
                ) : (
                  <Text style={{ fontSize: 22 }}>🌿</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.logTitle} numberOfLines={1}>{j.title}</Text>
                <Text style={styles.logMeta}>{j.date} · {j.workTypes?.join(', ')}</Text>
              </View>
              <Text style={{ fontSize: 14, color: Colors.textLight }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 주의 알림 */}
        <SectionHeader title="주의 알림" />
        <View style={styles.alertCard}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>진딧물 발생 주의보</Text>
            <Text style={styles.alertDesc}>기온 상승으로 사과혹진딧물 활동 증가 시기입니다. 신초 부분 집중 확인 권장.</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* 일지 작성 FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Write')}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[Colors.greenMain, Colors.greenMid]} style={styles.fabGradient}>
          <Text style={{ fontSize: 22, color: '#fff' }}>✏️</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  greeting: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  farmerName: { fontSize: Typography.xl, fontWeight: '800', color: '#fff', marginTop: 2 },
  farmSubName: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.8)', marginTop: 1, fontWeight: '600' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  weatherBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.sm, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  weatherBigIcon: { fontSize: 36 },
  weatherTemp: { fontSize: 30, fontWeight: '900', color: '#fff', lineHeight: 34 },
  weatherUnit: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  weatherDesc: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  weatherMeta: { flexDirection: 'row', gap: 10, marginTop: 5 },
  weatherMetaItem: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.75)' },
  metaVal: { fontWeight: '700', color: '#fff' },
  weatherDate: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.7)' },
  weatherDay: { fontSize: Typography.sm, color: '#fff', fontWeight: '600' },
  weatherMinMax: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  quickGrid: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: 10 },
  quickItem: { flex: 1, alignItems: 'center', gap: 6 },
  quickIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...Shadow.card },
  quickLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMid, textAlign: 'center' },

  card: { backgroundColor: Colors.card, borderRadius: Radius.md, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, ...Shadow.card },
  taskHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderBottomWidth: 1, borderBottomColor: '#F5E6C0', borderTopLeftRadius: Radius.md, borderTopRightRadius: Radius.md },
  taskHeaderText: { fontSize: Typography.xs, fontWeight: '700', color: '#7D5A2C' },
  taskItem: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  taskDot: { width: 8, height: 8, borderRadius: 4 },
  taskText: { flex: 1, fontSize: Typography.sm, color: Colors.textDark },

  logItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  logThumb: { width: 46, height: 46, borderRadius: Radius.sm, backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  logTitle: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textDark },
  logMeta: { fontSize: Typography.xs, color: Colors.textLight, marginTop: 2 },

  emptyBox: { padding: Spacing.xxl, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: Typography.sm, color: Colors.textLight },
  emptyAction: { fontSize: Typography.sm, color: Colors.greenMain, fontWeight: '700' },

  alertCard: { flexDirection: 'row', gap: 10, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, backgroundColor: '#FFF3CD', borderWidth: 1.5, borderColor: '#FFD700', borderRadius: Radius.md, padding: 12 },
  alertIcon: { fontSize: 20 },
  alertTitle: { fontSize: Typography.sm, fontWeight: '700', color: '#856404', marginBottom: 2 },
  alertDesc: { fontSize: Typography.xs, color: '#856404', lineHeight: 18 },

  fab: { position: 'absolute', bottom: 90, right: 20, borderRadius: 30, overflow: 'hidden', ...Shadow.strong },
  fabGradient: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
});
