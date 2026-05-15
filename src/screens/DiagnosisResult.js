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
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

async function analyzePlant(imageUri) {
  try {
    let base64Data;
    
    try {
      console.log('[Plant.id v3] 이미지 최적화 시도...');
      const manipResult = await manipulateAsync(
        imageUri,
        [{ resize: { width: 1000 } }],
        { compress: 0.7, format: SaveFormat.JPEG, base64: true }
      );
      base64Data = manipResult.base64;
    } catch (manipError) {
      console.warn('[Plant.id v3] 최적화 실패, 원본 사용:', manipError.message);
      // Fallback: read original image as base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      base64Data = dataUrl.split(',')[1];
    }

    if (!base64Data || base64Data.length < 100) {
      throw new Error('데이터 생성 실패 (P1)');
    }

    console.log('[Plant.id v3] 서버로 분석 요청 중...');
    const apiRes = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [base64Data],
        health: 'all',
        language: 'ko',
        details: ['description', 'treatment', 'common_names', 'cause'],
      }),
    });

    const rawText = await apiRes.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (jsonErr) {
      console.error('[Plant.id v3] JSON 파싱 실패:', rawText);
      return getMockResult(`서버 응답 오류 (Text): ${rawText.substring(0, 100)}`);
    }

    if (!apiRes.ok) {
      const detail = data?.detail || data?.error || `HTTP ${apiRes.status}`;
      const reason = data?.error || '서버 오류';
      return getMockResult(reason, detail);
    }

    console.log('[Plant.id v3] 분석 완료:', data?.status);
    return parsePlantIdResult(data);
  } catch (e) {
    console.error('[Plant.id v3] 분석 중 예외 발생:', e);
    return getMockResult(`시스템 오류: ${e.message}`);
  }
}

function parsePlantIdResult(data) {
  // v3 응답 구조: data.result.disease.suggestions
  const suggestions = data?.result?.disease?.suggestions ?? [];
  if (suggestions.length === 0) {
    return getMockResult('분석 결과가 없습니다. 다른 사진으로 시도해 보세요.');
  }

  const top = suggestions[0];
  const details = top.details ?? {};

  // Find local name or use top name
  const diseaseName = (details.common_names && details.common_names[0]) || details.local_name || top.name || '알 수 없는 질병';

  // Cause parsing
  const cause = details.cause ? `\n\n[원인]: ${details.cause}` : '';

  // Treatment parsing
  let treatment = '농업기술센터에 문의하거나 방제 계획을 확인하세요.';
  const t = details.treatment;
  if (t) {
    if (t.chemical && Array.isArray(t.chemical)) {
      treatment = t.chemical.join('\n');
    } else if (t.biological && Array.isArray(t.biological)) {
      treatment = t.biological.join('\n');
    } else if (typeof t === 'string') {
      treatment = t;
    }
  }

  let description = (rawDesc || '이 식물에 대한 구체적인 증상 설명이 데이터베이스에 아직 등록되지 않았습니다. 하지만 높은 신뢰도로 보아 해당 병해충일 가능성이 높으니, 가까운 농업기술센터에 사진을 보여주시고 상담받으시는 것을 권장합니다.') + cause;

  return {
    disease:     diseaseName,
    confidence:  top.probability ?? 0,
    description: description,
    treatment:   treatment,
    alternatives: suggestions.slice(1, 3).map(d => ({
      name:       d.details?.local_name || d.name || '기타 가능성',
      confidence: d.probability ?? 0,
    })),
  };
}

function getMockResult(reason = '', detail = '') {
  return {
    disease:     '분석 실패',
    confidence:  0,
    description: `[오류 원인]: ${reason}${detail ? '\n\n' + detail : ''}\n\n서버와 통신 중 문제가 발생했습니다. 사진이 너무 어둡거나 흐리지 않은지 확인해 주세요.`,
    treatment:   '문제가 지속되면 API 사용 한도 초과일 수 있습니다.',
    alternatives: [],
    isError:     true
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
