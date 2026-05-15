import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import SectionHeader from '../components/SectionHeader';
import Tag from '../components/Tag';
import { fetchWeather, getWeatherIcon, getWeatherDesc, getWorkRecommendations, getMockWeather, getCurrentLocation } from '../utils/weather';

const WEEK_MOCK = [
  { dow:'월', icon:'☀️', high:22, low:10 },
  { dow:'화', icon:'☀️', high:22, low:10 },
  { dow:'수', icon:'☀️', high:22, low:10 },
  { dow:'목', icon:'☀️', high:22, low:10 },
  { dow:'금', icon:'☀️', high:22, low:10 },
];

export default function WeatherScreen({ navigation }) {
  const [weather, setWeather]           = useState(getMockWeather());
  const [locationName, setLocationName] = useState('위치 확인 중…');
  const [refreshing, setRefreshing]     = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const load = async () => {
    // 화면을 즉시 보여주고 GPS/날씨는 백그라운드에서 로드
    getCurrentLocation().then(({ nx, ny, locationName: name }) => {
      setLocationName(name);
      fetchWeather(nx, ny).then(w => {
        setWeather(w);
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
      }).catch(() => getMockWeather());
    });
  };
  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const { nx, ny, locationName: name } = await getCurrentLocation();
    setLocationName(name);
    const w = await fetchWeather(nx, ny).catch(() => getMockWeather());
    setWeather(w);
    setRefreshing(false);
  };

  const recs = getWorkRecommendations(weather);
  const weatherIcon = getWeatherIcon(weather.skyCode, weather.rainCode);
  const weatherDesc = getWeatherDesc(weather.skyCode, weather.rainCode);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="light-content" />

      {/* 날씨 히어로 */}
      <LinearGradient colors={['#1A5276','#2E86C1','#5DADE2']} style={styles.hero}>
        <SafeAreaView edges={[]}>
          <Text style={styles.heroLocation}>📍 {locationName}</Text>
          <View style={styles.heroMain}>
            <Text style={styles.heroIcon}>{weatherIcon}</Text>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                <Text style={styles.heroTemp}>{Math.round(weather.temp)}</Text>
                <Text style={styles.heroUnit}>°C</Text>
              </View>
              <Text style={styles.heroDesc}>{weatherDesc} · 최고 {weather.maxTemp}° / 최저 {weather.minTemp}°</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            {[
              { icon:'💧', val:`${weather.humidity}%`,   lbl:'습도'  },
              { icon:'💨', val:`${weather.windSpeed}`,   lbl:'m/s'   },
              { icon:'🌧', val:`${weather.rainProb}%`,   lbl:'강수'  },
              { icon:'☀️', val:'8h',                     lbl:'일조'  },
            ].map(s => (
              <View key={s.lbl} style={styles.statBox}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLbl}>{s.lbl}</Text>
              </View>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.skyBlue} />}
      >
        {/* 7일 예보 */}
        <SectionHeader title="7일 예보" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
          {(weather.weekForecast || WEEK_MOCK).map((d, i) => (
            <View key={i} style={[styles.weekCard, i === 0 && styles.weekCardToday]}>
              <Text style={[styles.weekDow,  i === 0 && { color:'#fff' }]}>{i === 0 ? '오늘' : d.dow}</Text>
              <Text style={styles.weekIcon}>{d.icon}</Text>
              <Text style={[styles.weekHigh, i === 0 && { color:'#fff' }]}>{d.high}°</Text>
              <Text style={[styles.weekLow,  i === 0 && { color:'rgba(255,255,255,0.7)' }]}>{d.low}°</Text>
            </View>
          ))}
        </ScrollView>

        {/* 추천 작업 */}
        <SectionHeader title="오늘 추천 농작업" />
        {recs.map((r, i) => (
          <TouchableOpacity 
            key={i} 
            style={styles.recCard}
            onPress={() => navigation.navigate('Write', { 
              initialTitle: r.text,
              initialContent: `${r.text} 작업을 실시함. (날씨 맞춤 추천)`,
              initialWorkType: r.text.includes('방제') ? '방제' : r.text.includes('적과') ? '적과' : '기타'
            })}
          >
            <View style={[styles.recBar, { backgroundColor: r.color }]} />
            <View style={styles.recBody}>
              <Text style={styles.recIcon}>{r.icon}</Text>
              <Text style={styles.recText}>{r.text}</Text>
              <Tag
                label={r.priority === 'high' ? '필수' : r.priority === 'medium' ? '권장' : '참고'}
                variant={r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'gold' : 'green'}
              />
            </View>
          </TouchableOpacity>
        ))}

        {/* 주의사항 */}
        <SectionHeader title="이번 주 주의사항" />
        <TouchableOpacity 
          style={styles.alertCard}
          onPress={() => navigation.navigate('Write', {
            initialTitle: '강수 예보 대비 방제',
            initialContent: '강수 예보에 따른 사전 방제 작업 실시 및 배수로 점검.',
            initialWorkType: '방제'
          })}
        >
          <Text style={styles.alertIcon}>🌧</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>이번 주 강수 예보 대응</Text>
            <Text style={styles.alertDesc}>비 오기 전 방제 마무리 권장. 비 후 병해 발생 위험 증가로 예방 방제가 중요합니다.</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.alertCard, { backgroundColor:'#EAF4FE', borderColor:'#AED6F1' }]}
          onPress={() => navigation.navigate('Write', {
            initialTitle: '시비 주기 점검',
            initialContent: '생육 상태 확인 후 비료(추비) 주기 점검 및 실시.',
            initialWorkType: '시비'
          })}
        >
          <Text style={styles.alertIcon}>💊</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { color:'#1A5276' }]}>비료(시비) 주기 알림</Text>
            <Text style={[styles.alertDesc, { color:'#1A5276' }]}>
              {new Date().getMonth() + 1}월 생육 촉진을 위한 추비 주기입니다. 나무 생육 상태 확인 후 시비량 조절 권장.
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, paddingTop: 10 },
  heroLocation: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginBottom: 12 },
  heroMain: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: Spacing.xl, backgroundColor: 'rgba(255,255,255,0.15)', padding: 20, borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroIcon: { fontSize: 64 },
  heroTemp: { fontSize: 60, fontWeight: '900', color: '#fff', letterSpacing: -2 },
  heroUnit: { fontSize: 24, color: 'rgba(255,255,255,0.8)', marginBottom: 12, fontWeight: '700' },
  heroDesc: { fontSize: Typography.base, color: '#fff', fontWeight: '800', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center', gap: 2 },
  statIcon: { fontSize: 16 },
  statVal: { fontSize: Typography.sm, fontWeight: '900', color: '#fff' },
  statLbl: { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },

  weekRow: { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: 4 },
  weekCard: { backgroundColor: Colors.card, borderRadius: Radius.sm, padding: 10, alignItems: 'center', minWidth: 58, ...Shadow.card },
  weekCardToday: { backgroundColor: Colors.greenMain },
  weekDow:  { fontSize: Typography.xs, fontWeight: '700', color: Colors.textLight, marginBottom: 4 },
  weekIcon: { fontSize: 20, marginBottom: 4 },
  weekHigh: { fontSize: Typography.sm, fontWeight: '800', color: Colors.textDark },
  weekLow:  { fontSize: Typography.xs, color: Colors.textLight },

  recCard: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.sm, overflow: 'hidden', ...Shadow.card },
  recBar:  { width: 4 },
  recBody: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  recIcon: { fontSize: 20 },
  recText: { flex: 1, fontSize: Typography.sm, color: Colors.textDark, lineHeight: 18 },

  alertCard: { flexDirection: 'row', gap: 10, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, backgroundColor: '#FFF3CD', borderWidth: 1.5, borderColor: '#FFD700', borderRadius: Radius.md, padding: 12 },
  alertIcon: { fontSize: 20, marginTop: 1 },
  alertTitle: { fontSize: Typography.sm, fontWeight: '700', color: '#856404', marginBottom: 2 },
  alertDesc: { fontSize: Typography.xs, color: '#856404', lineHeight: 18 },
});
