import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import Tag from '../components/Tag';
import { SecondaryButton } from '../components/Button';
import { deleteJournal } from '../store/journalStore';

const TAG_VARIANT = { 방제:'red', 적과:'gold', 시비:'blue', 제초:'green', 수확:'brown', 관수:'blue', 전정:'green', 기타:'green' };

export default function JournalDetail({ navigation, route }) {
  const { journal } = route.params;

  const handleDelete = () => {
    Alert.alert('일지 삭제', '이 일지를 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          await deleteJournal(journal.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="light-content" />

      {/* 헤더 이미지 */}
      {journal.photos?.length > 0 ? (
        <Image source={{ uri: journal.photos[0] }} style={styles.heroImg} />
      ) : (
        <LinearGradient
          colors={['#2D6010', '#5A8A2A', '#6EA832']}
          style={styles.heroImg}
        >
          <Text style={{ fontSize: 64 }}>🌿</Text>
        </LinearGradient>
      )}

      {/* 헤더 버튼 (오버레이) */}
      <SafeAreaView edges={['top']} style={styles.overlay} pointerEvents="box-none">
        <View style={styles.overlayRow}>
          <TouchableOpacity style={styles.overlayBtn} onPress={() => navigation.goBack()}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.overlayBtn}
              onPress={() => navigation.navigate('Write', { journal })}
            >
              <Text style={{ fontSize: 16 }}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.overlayBtn} onPress={handleDelete}>
              <Text style={{ fontSize: 16 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ height: 180 }} />
        <View style={styles.content}>
          <Text style={styles.title}>{journal.title}</Text>
          <View style={styles.metaRow}>
            <Tag label={journal.date} variant="green" />
            {journal.weather && (
              <Tag label={`${journal.weather.icon ?? '☀️'} ${journal.weather.temp ?? ''}°C`} variant="gold" />
            )}
            {journal.workTypes?.map(t => (
              <Tag key={t} label={t} variant={TAG_VARIANT[t] ?? 'green'} />
            ))}
            {journal.location && <Tag label={journal.location} variant="green" />}
          </View>

          <Text style={styles.bodyText}>{journal.content}</Text>

          {journal.photos?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>📷 첨부 사진</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.lg }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {journal.photos.map((p, i) => (
                    <View key={i} style={styles.photo}>
                      <Image source={{ uri: p }} style={styles.photoImg} />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}

          {journal.memo ? (
            <>
              <Text style={styles.sectionLabel}>💬 메모</Text>
              <View style={styles.memoBox}>
                <Text style={styles.memoText}>{journal.memo}</Text>
              </View>
            </>
          ) : null}

          <View style={{ height: Spacing.lg }} />
          <SecondaryButton
            label="🔬  이 일지로 병충해 진단하기"
            onPress={() => navigation.navigate('Diagnosis')}
          />
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroImg: { height: 220, alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0, right: 0 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  overlayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  overlayBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' },

  content: { backgroundColor: Colors.bg, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, marginTop: -20 },
  title: { fontSize: Typography.xxl, fontWeight: '800', color: Colors.textDark, marginBottom: Spacing.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.lg },
  bodyText: { fontSize: Typography.base, color: Colors.textDark, lineHeight: 24, marginBottom: Spacing.lg },
  sectionLabel: { fontSize: Typography.xs, fontWeight: '700', color: Colors.textMid, letterSpacing: 0.5, marginBottom: Spacing.sm },
  photo: { width: 100, height: 100, borderRadius: Radius.sm, backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...Shadow.card },
  photoImg: { width: '100%', height: '100%' },
  memoBox: { backgroundColor: Colors.greenPale, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.lg },
  memoText: { fontSize: Typography.sm, color: Colors.textDark, lineHeight: 20 },
});
