import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import Tag from '../components/Tag';
import { saveToPermanentStorage } from '../utils/photo';

import { db } from '../utils/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

const HISTORY_KEY = '@park_diagnosis';
const FIREBASE_DIAGNOSIS_COL = 'diagnosis';

export default function DiagnosisScreen({ navigation }) {
  const [history, setHistory] = useState([]);

  useFocusEffect(useCallback(() => {
    const loadHistory = async () => {
      try {
        const q = query(collection(db, FIREBASE_DIAGNOSIS_COL), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const remoteHistory = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setHistory(remoteHistory);
          await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(remoteHistory));
        } else {
          const v = await AsyncStorage.getItem(HISTORY_KEY);
          if (v) setHistory(JSON.parse(v));
        }
      } catch (e) {
        console.warn('Failed to load remote diagnosis history:', e);
        const v = await AsyncStorage.getItem(HISTORY_KEY);
        if (v) setHistory(JSON.parse(v));
      }
    };
    loadHistory();
  }, []));

  const pickAndDiagnose = async (source) => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('권한 필요', '카메라/갤러리 접근 권한을 허용해 주세요.'); return; }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [1,1] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });

    if (!result.canceled) {
      const permanentUri = await saveToPermanentStorage(result.assets[0].uri);
      navigation.navigate('DiagnosisResult', { imageUri: permanentUri });
    }
  };

  const TIPS = [
    { ok: true,  text: '증상이 있는 잎을 클로즈업으로 촬영하세요' },
    { ok: true,  text: '밝은 곳에서 자연광으로 촬영하면 정확도 향상' },
    { ok: true,  text: '잎 앞면과 뒷면 모두 촬영하면 좋습니다' },
    { ok: false, text: '흔들리거나 역광 사진은 정확도 감소' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={[]} style={{ backgroundColor: Colors.card }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>🔬 병충해 진단</Text>
            <Text style={styles.sub}>사과나무 잎·줄기 사진으로 진단</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={{ fontSize: 18 }}>📋</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 업로드 영역 */}
        <View style={styles.uploadCard}>
          <TouchableOpacity style={styles.uploadArea} onPress={() => pickAndDiagnose('library')} activeOpacity={0.75}>
            <Text style={styles.uploadIcon}>🍃</Text>
            <Text style={styles.uploadText}>사진을 여기에 올려주세요</Text>
            <Text style={styles.uploadSub}>잎, 줄기, 열매의 선명한 사진이 좋습니다{'\n'}최대 5장 · JPG, PNG</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>— 또는 —</Text>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.sourceBtn} onPress={() => pickAndDiagnose('camera')} activeOpacity={0.8}>
              <Text style={{ fontSize: 22 }}>📷</Text>
              <Text style={styles.sourceBtnText}>카메라 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sourceBtn} onPress={() => pickAndDiagnose('library')} activeOpacity={0.8}>
              <Text style={{ fontSize: 22 }}>🖼️</Text>
              <Text style={styles.sourceBtnText}>갤러리 선택</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 촬영 팁 */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>📌 촬영 팁</Text>
          {TIPS.map((t, i) => (
            <View key={i} style={styles.tipItem}>
              <Text style={{ fontSize: 16 }}>{t.ok ? '✅' : '❌'}</Text>
              <Text style={[styles.tipText, !t.ok && { color: Colors.appleRed }]}>{t.text}</Text>
            </View>
          ))}
        </View>

        {/* 최근 진단 이력 */}
        {history.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>최근 진단 이력</Text>
              <TouchableOpacity><Text style={styles.sectionMore}>더보기 ›</Text></TouchableOpacity>
            </View>
            <View style={styles.historyCard}>
              {history.slice(0, 5).map((h, i) => (
                <TouchableOpacity
                  key={h.id}
                  style={[styles.historyItem, i === Math.min(history.length, 5) - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => navigation.navigate('DiagnosisResult', { diagnosisResult: h })}
                  activeOpacity={0.75}
                >
                  <View style={styles.historyThumb}>
                    {h.imageUri ? (
                      <Image source={{ uri: h.imageUri }} style={styles.thumbImage} />
                    ) : (
                      <Text style={{ fontSize: 20 }}>🍃</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.historyName}>{h.result?.disease ?? '분석 결과 없음'}</Text>
                      {h.result?.confidence && (
                        <Tag label={`${Math.round(h.result.confidence * 100)}%`} variant={h.result.confidence > 0.7 ? 'red' : 'gold'} />
                      )}
                    </View>
                    <Text style={styles.historyDate}>{h.date}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: Colors.textLight }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {history.length === 0 && (
          <View style={styles.emptyHistory}>
            <Text style={{ fontSize: 36 }}>🔬</Text>
            <Text style={{ fontSize: Typography.sm, color: Colors.textLight, marginTop: 8 }}>아직 진단 이력이 없어요</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  title: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textDark },
  sub:   { fontSize: Typography.xs, color: Colors.textLight, marginTop: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center' },

  uploadCard: { margin: Spacing.lg, backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.lg, ...Shadow.card },
  uploadArea: { borderWidth: 2.5, borderColor: Colors.greenLight, borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: 30, alignItems: 'center', gap: 8, backgroundColor: Colors.greenPale },
  uploadIcon: { fontSize: 48 },
  uploadText: { fontSize: Typography.base, fontWeight: '700', color: Colors.greenMain },
  uploadSub:  { fontSize: Typography.xs, color: Colors.textLight, textAlign: 'center', lineHeight: 18 },
  orText: { textAlign: 'center', fontSize: Typography.xs, color: Colors.textLight, paddingVertical: 10, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 10 },
  sourceBtn: { flex: 1, backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 4 },
  sourceBtnText: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textDark },

  tipsCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.lg, ...Shadow.card },
  tipsTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textDark, marginBottom: Spacing.sm },
  tipItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tipText: { fontSize: Typography.xs, color: Colors.textDark, flex: 1, lineHeight: 18 },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textMid },
  sectionMore: { fontSize: Typography.xs, color: Colors.greenMain, fontWeight: '600' },

  historyCard: { marginHorizontal: Spacing.lg, backgroundColor: Colors.card, borderRadius: Radius.md, ...Shadow.card },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyThumb: { width: 42, height: 42, borderRadius: Radius.sm, backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  historyName: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textDark },
  historyDate: { fontSize: Typography.xs, color: Colors.textLight, marginTop: 1 },

  emptyHistory: { alignItems: 'center', padding: 30 },
});
