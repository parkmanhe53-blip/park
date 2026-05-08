import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import Tag from '../components/Tag';
import { loadJournals } from '../store/journalStore';

const TAG_VARIANT = { 방제:'red', 적과:'gold', 시비:'blue', 제초:'green', 수확:'brown', 관수:'blue', 전정:'green', 기타:'green' };

export default function JournalScreen({ navigation }) {
  const [journals, setJournals]       = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const today = new Date().toISOString().split('T')[0];

  useFocusEffect(useCallback(() => {
    loadJournals().then(setJournals);
  }, []));

  const markedDates = journals.reduce((acc, j) => {
    acc[j.date] = { marked: true, dotColor: Colors.appleRed };
    return acc;
  }, {});
  if (selectedDate) markedDates[selectedDate] = { ...(markedDates[selectedDate] || {}), selected: true, selectedColor: Colors.greenMain };

  const filtered = selectedDate
    ? journals.filter(j => j.date === selectedDate)
    : journals;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={[]} style={{ backgroundColor: Colors.card }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>📓 영농일지</Text>
            <Text style={styles.sub}>총 {journals.length}건</Text>
          </View>
          <TouchableOpacity style={styles.searchBtn}>
            <Text style={{ fontSize: 18 }}>🔍</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 캘린더 */}
        <View style={styles.calendarWrap}>
          <Calendar
            current={today}
            markedDates={{ ...markedDates, [today]: { ...(markedDates[today] || {}), today: true } }}
            onDayPress={d => setSelectedDate(prev => prev === d.dateString ? '' : d.dateString)}
            theme={{
              backgroundColor: Colors.card,
              calendarBackground: Colors.card,
              textSectionTitleColor: Colors.textMid,
              selectedDayBackgroundColor: Colors.greenMain,
              selectedDayTextColor: '#fff',
              todayTextColor: Colors.greenMain,
              dayTextColor: Colors.textDark,
              textDisabledColor: Colors.border,
              dotColor: Colors.appleRed,
              arrowColor: Colors.greenMain,
              monthTextColor: Colors.textDark,
              textDayFontWeight: '500',
              textMonthFontWeight: '800',
              textDayHeaderFontWeight: '600',
              textDayFontSize: Typography.sm,
              textMonthFontSize: Typography.md,
            }}
          />
        </View>

        {/* 일지 목록 */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {selectedDate ? `${selectedDate} 일지` : '최근 일지'}
          </Text>
          <Text style={styles.listCount}>{filtered.length}건</Text>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 42 }}>📝</Text>
            <Text style={styles.emptyText}>
              {selectedDate ? '이 날짜에 작성된 일지가 없어요' : '아직 작성된 일지가 없어요'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Write')}>
              <Text style={styles.emptyAction}>첫 일지 작성하기 →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map(j => (
            <TouchableOpacity
              key={j.id}
              style={styles.card}
              onPress={() => navigation.navigate('JournalDetail', { journal: j })}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{j.date}</Text>
                <Text style={{ fontSize: 14 }}>
                  {j.weather?.icon ?? '☀️'} {j.weather?.temp ?? ''}°C
                </Text>
              </View>
              <Text style={styles.cardTitle}>{j.title}</Text>
              <Text style={styles.cardPreview} numberOfLines={2}>{j.content}</Text>
              {j.workTypes?.length > 0 && (
                <View style={styles.tagRow}>
                  {j.workTypes.map(t => (
                    <Tag key={t} label={t} variant={TAG_VARIANT[t] ?? 'green'} />
                  ))}
                  {j.location && <Tag label={j.location} variant="green" />}
                </View>
              )}
              {j.photos?.length > 0 && (
                <View style={styles.photoRow}>
                  {j.photos.slice(0, 4).map((p, i) => (
                    <View key={i} style={styles.photoThumb}>
                      <Image source={{ uri: p }} style={styles.thumbImage} />
                    </View>
                  ))}
                  {j.photos.length > 4 && (
                    <View style={[styles.photoThumb, { backgroundColor: Colors.greenPale }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.greenMain }}>+{j.photos.length - 4}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Write')}
        activeOpacity={0.85}
      >
        <View style={styles.fabInner}>
          <Text style={{ fontSize: 22, color: '#fff' }}>✏️</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  title: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textDark },
  sub:   { fontSize: Typography.xs, color: Colors.textLight, marginTop: 1 },
  searchBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center' },

  calendarWrap: { backgroundColor: Colors.card, borderRadius: Radius.md, marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.md, overflow: 'hidden', ...Shadow.card },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  listTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textMid },
  listCount: { fontSize: Typography.xs, color: Colors.textLight },

  emptyBox: { alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: Typography.sm, color: Colors.textLight, textAlign: 'center' },
  emptyAction: { fontSize: Typography.sm, color: Colors.greenMain, fontWeight: '700' },

  card: { backgroundColor: Colors.card, borderRadius: Radius.md, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.lg, ...Shadow.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  cardDate: { fontSize: Typography.xs, color: Colors.textLight, fontWeight: '600' },
  cardTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.textDark, marginBottom: 4 },
  cardPreview: { fontSize: Typography.xs, color: Colors.textMid, lineHeight: 18, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  photoRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  photoThumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },

  fab: { position: 'absolute', bottom: 90, right: 20, ...Shadow.strong },
  fabInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.greenMain, alignItems: 'center', justifyContent: 'center' },
});
