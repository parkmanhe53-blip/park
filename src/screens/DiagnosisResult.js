import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { PrimaryButton, SecondaryButton } from '../components/Button';
import { generateId } from '../utils/id';

import { db } from '../utils/firebase';
import { collection, doc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { uploadToFirebase } from '../utils/photo';

const HISTORY_KEY = '@park_diagnosis';
const FIREBASE_DIAGNOSIS_COL = 'diagnosis';

// Plant.id v3 API 연동
async function analyzePlant(imageUri) {
  const API_KEY = process.env.EXPO_PUBLIC_PLANTID_API_KEY;
  if (!API_KEY || API_KEY === 'YOUR_PLANTID_KEY') return getMockResult();

  try {
    // expo-file-system으로 이미지를 base64 읽기
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Plant.id v3는 data URL 형식 필요
    const imageData = `data:image/jpeg;base64,${base64}`;

    const apiRes = await fetch('https://plant.id/api/v3/health_assessment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': API_KEY,
      },
      body: JSON.stringify({
        images: [imageData],
        health: 'all',
        language: 'ko',
        details: 'description,treatment,local_name',
      }),
    });

    if (!apiRes.ok) {
      console.warn('[Plant.id v3] HTTP 오류:', apiRes.status);
      return getMockResult();
    }

    const data = await apiRes.json();
    console.log('[Plant.id v3] 응답 상태:', data?.status);
    return parsePlantIdResult(data);
  } catch (e) {
    console.warn('[Plant.id v3] 오류:', e.message);
    return getMockResult();
  }
}

function parsePlantIdResult(data) {
  // v3 응답 구조: data.result.disease.suggestions
  const suggestions = data?.result?.disease?.suggestions ?? [];
  if (!suggestions.length) return getMockResult();

  const top = suggestions[0];
  const details = top.details ?? {};

  // 방제법: chemical 배열을 문자열로 변환
  const chemArr = details.treatment?.chemical ?? [];
  const treatment = Array.isArray(chemArr)
    ? chemArr.join('\n')
    : (chemArr || '농업기술센터에 문의하세요.');

  return {
    disease:     details.local_name || top.name || '알 수 없음',
    confidence:  top.probability ?? 0,
    description: details.description || '상세 정보를 불러올 수 없습니다.',
    treatment:   treatment || '농업기술센터에 문의하세요.',
    alternatives: suggestions.slice(1, 3).map(d => ({
      name:       d.details?.local_name || d.name,
      confidence: d.probability,
    })),
  };
}

function getMockResult() {
  return {
    disease:     '갈색무늬병',
    confidence:  0.87,
    description: '잎에 갈색~흑색의 원형~타원형 병반이 형성됩니다. 병반 주위에 황색의 달무리가 생기고 심해지면 조기 낙엽이 발생합니다. Marssonina coronaria에 의한 진균성 병해입니다.',
    treatment:   '테부코나졸 유제 2,000배액 7~10일 간격으로 2~3회 살포',
    alternatives:[
      { name:'점무늬낙엽병', confidence: 0.09 },
      { name:'탄저병',       confidence: 0.04 },
    ],
  };
}

export default function DiagnosisResult({ navigation, route }) {
  const { imageUri, diagnosisResult } = route.params ?? {};
  const [result, setResult]     = useState(diagnosisResult?.result ?? null);
  const [loading, setLoading]   = useState(!diagnosisResult);
  const [saved, setSaved]       = useState(!!diagnosisResult);
  const [saving, setSaving]     = useState(false);

  const displayUri = imageUri || diagnosisResult?.imageUri;

  useEffect(() => {
    if (!diagnosisResult && imageUri) {
      analyzePlant(imageUri).then(r => {
        setResult(r);
        setLoading(false);
      });
    }
  }, []);

  const handleSave = async () => {
    if (!result || !displayUri) return;
    setSaving(true);
    try {
      // 1. Upload Image to Storage if it's local
      let finalImageUrl = displayUri;
      if (displayUri && !displayUri.startsWith('http')) {
        finalImageUrl = await uploadToFirebase(displayUri);
      }

      const id = generateId();
      const record = {
        id,
        date: new Date().toISOString().split('T')[0],
        imageUri: finalImageUrl,
        result,
        createdAt: new Date().toISOString()
      };

      // 2. Save to Firestore
      await setDoc(doc(db, FIREBASE_DIAGNOSIS_COL, id), record);

      // 3. Sync to Local Cache
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : [];
      history.unshift(record);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      
      setSaved(true);
    } catch (e) {
      Alert.alert('저장 오류', '진단 결과를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const confPct = result ? Math.round(result.confidence * 100) : 0;
  const confColor = confPct >= 80 ? Colors.appleRed : confPct >= 60 ? Colors.gold : Colors.textLight;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="light-content" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <LinearGradient colors={['#2D5016','#4A7C2F']} style={StyleSheet.absoluteFill} />
          <Text style={{ fontSize: 56 }}>🔬</Text>
          <ActivityIndicator size="large" color={Colors.greenLight} style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>AI 분석 중...</Text>
          <Text style={styles.loadingSub}>사과나무 병충해를 진단하고 있습니다</Text>
        </View>
      ) : (
        <>
          {/* 결과 헤더 */}
          <LinearGradient colors={['#922B21', Colors.appleRed]} style={styles.resultHeader}>
            <SafeAreaView edges={['top']}>
              <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                  <Text style={{ color:'#fff', fontSize:18, fontWeight:'700' }}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>진단 결과</Text>
                <TouchableOpacity style={styles.backBtn}>
                  <Text style={{ fontSize: 16 }}>📤</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.diseaseRow}>
                <Text style={styles.diseaseName}>{result?.disease ?? '결과 없음'}</Text>
                <View style={styles.warningBadge}><Text style={styles.warningText}>⚠️ 주의</Text></View>
              </View>

              <View style={styles.confRow}>
                <View style={styles.resultPhoto}>
                  {displayUri ? (
                    <Image source={{ uri: displayUri }} style={styles.headerImage} />
                  ) : (
                    <Text style={{ fontSize: 32 }}>🍃</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.confLabel}>진단 신뢰도</Text>
                  <View style={styles.confBarBg}>
                    <View style={[styles.confBarFill, { width: `${confPct}%` }]} />
                  </View>
                  <Text style={styles.confPct}>{confPct}%</Text>
                </View>
              </View>
            </SafeAreaView>
          </LinearGradient>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.body}>
              {/* 증상 설명 */}
              <Text style={styles.sectionLabel}>증상 설명</Text>
              <Text style={styles.desc}>{result?.description}</Text>

              {/* 방제 방법 */}
              <Text style={styles.sectionLabel}>방제 방법</Text>
              {(result?.treatment?.split('\n') ?? [result?.treatment]).filter(Boolean).map((t, i) => (
                <View key={i} style={styles.treatmentItem}>
                  <Text style={styles.treatmentBullet}>•</Text>
                  <Text style={styles.treatmentText}>{t}</Text>
                </View>
              ))}

              {/* 다른 가능성 */}
              {result?.alternatives?.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>다른 가능성</Text>
                  <View style={styles.altCard}>
                    {result.alternatives.map((a, i) => (
                      <View key={i} style={[styles.altItem, i > 0 && { marginTop: 10 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={styles.altName}>{a.name}</Text>
                          <Text style={{ fontSize: Typography.xs, fontWeight: '700', color: Colors.skyBlue }}>{Math.round(a.confidence * 100)}%</Text>
                        </View>
                        <View style={styles.altBarBg}>
                          <View style={[styles.altBarFill, { width: `${Math.round(a.confidence * 100)}%` }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* 액션 버튼 */}
              <View style={{ gap: 10, marginTop: Spacing.lg }}>
                {!saved && (
                  <PrimaryButton label="💾  진단 이력에 저장" onPress={handleSave} />
                )}
                {saved && (
                  <View style={styles.savedBadge}>
                    <Text style={styles.savedText}>✅ 저장 완료</Text>
                  </View>
                )}
                <PrimaryButton
                  label="📓  이 결과를 영농일지에 기록"
                  onPress={() => navigation.navigate('Write')}
                  style={{ backgroundColor: Colors.greenMain }}
                />
                <SecondaryButton label="📞  농업기술센터에 문의하기" onPress={() => {}} />
              </View>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: Typography.xl, fontWeight: '800', color: '#fff', marginTop: 16 },
  loadingSub: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)', marginTop: 6 },

  resultHeader: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.lg, fontWeight: '800', color: '#fff' },

  diseaseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  diseaseName: { fontSize: Typography.xxl, fontWeight: '900', color: '#fff' },
  warningBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  warningText: { fontSize: Typography.xs, fontWeight: '700', color: '#fff' },

  confRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  resultPhoto: { width: 62, height: 62, borderRadius: Radius.sm, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  headerImage: { width: '100%', height: '100%' },
  confLabel: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.8)', marginBottom: 5 },
  confBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  confBarFill: { height: '100%', backgroundColor: '#F39C12', borderRadius: 4 },
  confPct: { fontSize: Typography.lg, fontWeight: '900', color: '#fff', marginTop: 4 },

  body: { padding: Spacing.lg },
  sectionLabel: { fontSize: Typography.xs, fontWeight: '700', color: Colors.textLight, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: Spacing.sm },
  desc: { fontSize: Typography.sm, color: Colors.textDark, lineHeight: 20, marginBottom: Spacing.lg },

  treatmentItem: { flexDirection: 'row', gap: 8, marginBottom: 7 },
  treatmentBullet: { color: Colors.appleRed, fontWeight: '900', fontSize: Typography.base, marginTop: 1 },
  treatmentText: { flex: 1, fontSize: Typography.sm, color: Colors.textDark, lineHeight: 20 },

  altCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.card },
  altItem: {},
  altName: { fontSize: Typography.sm, fontWeight: '600', color: Colors.textDark },
  altBarBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  altBarFill: { height: '100%', backgroundColor: Colors.skyBlue, borderRadius: 3 },

  savedBadge: { backgroundColor: Colors.greenPale, borderRadius: Radius.sm, padding: 12, alignItems: 'center' },
  savedText: { fontSize: Typography.sm, fontWeight: '700', color: Colors.greenMain },
});
