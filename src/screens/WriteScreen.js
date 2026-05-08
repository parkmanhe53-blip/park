import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, Alert, StatusBar, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { PrimaryButton } from '../components/Button';
import { saveJournal } from '../store/journalStore';
import { uploadToFirebase } from '../utils/photo';

export default function WriteScreen({ navigation, route }) {
  const existing = route.params?.journal;
  const today    = new Date().toISOString().split('T')[0];
  const weather  = getMockWeather();

  const [title,     setTitle]     = useState(existing?.title     ?? '');
  const [content,   setContent]   = useState(existing?.content   ?? '');
  const [memo,      setMemo]      = useState(existing?.memo      ?? '');
  const [workTypes, setWorkTypes] = useState(existing?.workTypes ?? []);
  const [location,  setLocation]  = useState(existing?.location  ?? '');
  const [photos,    setPhotos]    = useState(existing?.photos    ?? []);
  const [saving,    setSaving]    = useState(false);

  const toggleType = t =>
    setWorkTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const pickImage = async (source) => {
    try {
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '사진 접근 권한을 허용해 주세요.');
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
          });
      if (!result.canceled) {
        // We keep local URIs for preview, will upload on Save
        const newUris = result.assets.map(a => a.uri);
        setPhotos(prev => [...prev, ...newUris].slice(0, 10));
      }
    } catch (e) {
      Alert.alert('오류', '사진을 불러오지 못했습니다.');
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('입력 필요', '✍️ 작업 내용을 입력해 주세요.');
      return;
    }

    setSaving(true);

    try {
      // 1. Photo Upload (Only if they are local URIs)
      const uploadedPhotos = await Promise.all(photos.map(async p => {
        if (p.startsWith('http')) return p; // Already uploaded
        return await uploadToFirebase(p);
      }));

      // 2. 제목 자동 생성
      const finalTitle = title.trim() ||
        (workTypes.length > 0
          ? `${today} ${workTypes.join('·')} 작업`
          : `${today} 영농 기록`);

      const journal = {
        id:        existing?.id ?? generateId(),
        date:      today,
        title:     finalTitle,
        content:   content.trim(),
        memo:      memo.trim(),
        workTypes,
        location,
        photos:    uploadedPhotos,
        weather: {
          icon: getWeatherIcon(weather.skyCode, weather.rainCode),
          desc: getWeatherDesc(weather.skyCode, weather.rainCode),
          temp: weather.temp,
        },
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 3. Firebase Store Save
      await saveJournal(journal);

      Alert.alert('✅ 저장 완료', `"${finalTitle}"\n영농일지가 저장되었습니다.`, [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('저장 오류', `오류 내용: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.card }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{existing ? '일지 수정' : '일지 작성'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '저장'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* 날짜 */}
        <View style={styles.section}>
          <Text style={styles.label}>📅 날짜</Text>
          <View style={styles.staticBox}>
            <Text style={styles.staticText}>{today}</Text>
          </View>
        </View>

        {/* 날씨 */}
        <View style={styles.section}>
          <Text style={styles.label}>☀️ 날씨 (자동 반영)</Text>
          <View style={styles.weatherBox}>
            <Text style={{ fontSize: 18 }}>{getWeatherIcon(weather.skyCode, weather.rainCode)}</Text>
            <Text style={styles.weatherText}>
              {getWeatherDesc(weather.skyCode, weather.rainCode)} · {weather.temp}°C · 습도 {weather.humidity}%
            </Text>
          </View>
        </View>

        {/* 제목 */}
        <View style={styles.section}>
          <Text style={styles.label}>📝 제목 <Text style={styles.optional}>(선택 — 비우면 자동 생성)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="오늘 작업을 한 줄로 요약해 주세요"
            placeholderTextColor={Colors.textLight}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            returnKeyType="next"
          />
        </View>

        {/* 작업 구분 */}
        <View style={styles.section}>
          <Text style={styles.label}>🏷 작업 구분 (복수 선택)</Text>
          <View style={styles.tagGrid}>
            {WORK_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, workTypes.includes(t) && styles.chipSel]}
                onPress={() => toggleType(t)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, workTypes.includes(t) && styles.chipTextSel]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 과원 위치 */}
        <View style={styles.section}>
          <Text style={styles.label}>🌳 과원 위치</Text>
          <View style={styles.tagGrid}>
            {LOCATIONS.map(l => (
              <TouchableOpacity
                key={l}
                style={[styles.chip, location === l && styles.chipSel]}
                onPress={() => setLocation(prev => prev === l ? '' : l)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, location === l && styles.chipTextSel]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 작업 내용 (필수) */}
        <View style={styles.section}>
          <Text style={styles.label}>✍️ 작업 내용 <Text style={styles.required}>*필수</Text></Text>
          <TextInput
            style={styles.textarea}
            placeholder="오늘 어떤 작업을 하셨나요?"
            placeholderTextColor={Colors.textLight}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* 사진 첨부 */}
        <View style={styles.section}>
          <Text style={styles.label}>📷 사진 첨부 ({photos.length}/10)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.photoAddBtn} onPress={() => pickImage('camera')}>
                <Text style={{ fontSize: 22, color: Colors.greenMain }}>📷</Text>
                <Text style={styles.photoAddLabel}>카메라</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoAddBtn} onPress={() => pickImage('library')}>
                <Text style={{ fontSize: 22, color: Colors.greenMain }}>🖼️</Text>
                <Text style={styles.photoAddLabel}>갤러리</Text>
              </TouchableOpacity>
              {photos.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.photoThumb}
                  onLongPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                >
                  <Image source={{ uri: p }} style={styles.photoImage} />
                  <View style={styles.photoRemove}>
                    <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>✕</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={styles.photoHint}>사진을 길게 누르면 삭제됩니다</Text>
        </View>

        {/* 메모 */}
        <View style={styles.section}>
          <Text style={styles.label}>💬 추가 메모 <Text style={styles.optional}>(선택)</Text></Text>
          <TextInput
            style={[styles.textarea, { height: 80 }]}
            placeholder="추가로 기록할 내용"
            placeholderTextColor={Colors.textLight}
            value={memo}
            onChangeText={setMemo}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* 저장 버튼 */}
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <PrimaryButton
            label={saving ? '저장 중...' : '💾  일지 저장'}
            onPress={handleSave}
            loading={saving}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  backBtnText: { fontSize: 20, color: Colors.textDark, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: Typography.lg, fontWeight: '800', color: Colors.textDark },
  saveBtn: {
    backgroundColor: Colors.greenMain, borderRadius: Radius.sm,
    paddingHorizontal: 18, paddingVertical: 9,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.sm },

  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  label:    { fontSize: Typography.xs, fontWeight: '700', color: Colors.textMid, marginBottom: 8 },
  optional: { fontWeight: '400', color: Colors.textLight },
  required: { color: Colors.appleRed, fontWeight: '700' },

  staticBox: {
    backgroundColor: Colors.greenPale, borderRadius: Radius.sm,
    padding: 12, borderWidth: 1.5, borderColor: Colors.border,
  },
  staticText: { fontSize: Typography.base, color: Colors.textDark, fontWeight: '600' },

  weatherBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.skyLight, borderWidth: 1.5,
    borderColor: '#AED6F1', borderRadius: Radius.sm, padding: 12,
  },
  weatherText: { fontSize: Typography.sm, color: Colors.skyBlue, fontWeight: '600', flex: 1 },

  input: {
    backgroundColor: Colors.card, borderRadius: Radius.sm,
    padding: 14, fontSize: Typography.base, color: Colors.textDark,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  textarea: {
    backgroundColor: Colors.card, borderRadius: Radius.sm,
    padding: 14, fontSize: Typography.base, color: Colors.textDark,
    borderWidth: 1.5, borderColor: Colors.border,
    height: 120, lineHeight: 22,
  },

  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card,
  },
  chipSel:     { backgroundColor: Colors.greenPale, borderColor: Colors.greenMain },
  chipText:    { fontSize: Typography.sm, fontWeight: '600', color: Colors.textMid },
  chipTextSel: { color: Colors.greenMain },

  photoAddBtn: {
    width: 70, height: 70, borderRadius: Radius.sm,
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
    backgroundColor: Colors.greenPale,
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  photoAddLabel: { fontSize: 9, fontWeight: '700', color: Colors.greenMain },
  photoThumb: {
    width: 70, height: 70, borderRadius: Radius.sm,
    backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border, position: 'relative', overflow: 'hidden'
  },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 2, right: 2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.appleRed, alignItems: 'center', justifyContent: 'center',
  },
  photoHint: { fontSize: 10, color: Colors.textLight, marginTop: 5 },
});
