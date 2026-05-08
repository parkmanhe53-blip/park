import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, FlatList, Dimensions, Alert, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { generateId } from '../utils/id';
import { saveToPermanentStorage } from '../utils/photo';

import { db } from '../utils/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { uploadToFirebase } from '../utils/photo';

const GALLERY_KEY = '@park_gallery';
const FIREBASE_GALLERY_COL = 'gallery';
const { width } = Dimensions.get('window');
const CELL = (width - 4) / 3;

const CATEGORIES = ['전체', '나무 생육', '병해충', '수확', '과원 풍경', '일반'];
const CATEGORY_EMOJI = { '나무 생육':'🌳', '병해충':'🔬', '수확':'🍎', '과원 풍경':'🌄', '일반':'📸' };

export default function GalleryScreen() {
  const [photos, setPhotos]     = useState([]);
  const [category, setCategory] = useState('전체');
  const [loading, setLoading]   = useState(false);

  useFocusEffect(useCallback(() => {
    const loadPhotos = async () => {
      try {
        // 1. Try Firebase
        const q = query(collection(db, FIREBASE_GALLERY_COL), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const remotePhotos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setPhotos(remotePhotos);
          await AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(remotePhotos));
        } else {
          // 2. Fallback to Local
          const v = await AsyncStorage.getItem(GALLERY_KEY);
          if (v) setPhotos(JSON.parse(v));
        }
      } catch (e) {
        console.warn('Failed to load remote gallery, using local:', e);
        const v = await AsyncStorage.getItem(GALLERY_KEY);
        if (v) setPhotos(JSON.parse(v));
      }
    };
    loadPhotos();
  }, []));

  const takePhoto = async () => {
    try {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (!camPerm.granted) { Alert.alert('권한 필요', '카메라 권한을 허용해 주세요.'); return; }

      const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false });
      if (result.canceled) return;

      setLoading(true);
      const originalUri = result.assets[0].uri;

      // 1. Upload to Firebase Storage
      const downloadURL = await uploadToFirebase(originalUri);

      // 2. Save to Firestore
      const id = generateId();
      const photo = {
        id,
        uri:      downloadURL,
        date:     new Date().toISOString().split('T')[0],
        category: '일반',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, FIREBASE_GALLERY_COL, id), photo);

      // 3. Update State & Local
      setPhotos(prev => {
        const next = [photo, ...prev];
        AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(next));
        return next;
      });

      Alert.alert('✅ 저장 완료', '사진이 농부 갤러리에 저장되었습니다.');
    } catch (error) {
      Alert.alert('저장 실패', '사진을 저장하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const pickFromLibrary = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('권한 필요', '사진첩 권한을 허용해 주세요.'); return; }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
      });
      if (result.canceled) return;

      setLoading(true);
      const newPhotos = await Promise.all(result.assets.map(async a => {
        const downloadURL = await uploadToFirebase(a.uri);
        const id = generateId();
        const photo = {
          id,
          uri:      downloadURL,
          date:     new Date().toISOString().split('T')[0],
          category: '일반',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, FIREBASE_GALLERY_COL, id), photo);
        return photo;
      }));

      setPhotos(prev => {
        const next = [...newPhotos, ...prev];
        AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(next));
        return next;
      });
    } catch (error) {
      Alert.alert('가져오기 실패', '사진을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const deletePhoto = (id) => {
    Alert.alert('사진 삭제', '이 사진을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, FIREBASE_GALLERY_COL, id));
          setPhotos(prev => {
            const next = prev.filter(p => p.id !== id);
            AsyncStorage.setItem(GALLERY_KEY, JSON.stringify(next));
            return next;
          });
        } catch (e) {
          Alert.alert('삭제 실패', '사진을 삭제하지 못했습니다.');
        }
      }},
    ]);
  };

  const filtered = category === '전체' ? photos : photos.filter(p => p.category === category);

  // 날짜별 그룹화
  const grouped = filtered.reduce((acc, p) => {
    const month = p.date?.slice(0, 7) ?? '날짜 없음';
    if (!acc[month]) acc[month] = [];
    acc[month].push(p);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort().reverse();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView edges={[]} style={{ backgroundColor: Colors.card }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>🖼️ 농부 갤러리</Text>
            <Text style={styles.sub}>총 사진 {photos.length}장</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.iconBtn} onPress={pickFromLibrary}>
              <Text style={{ fontSize: 18 }}>📁</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Text style={{ fontSize: 18 }}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 카테고리 필터 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, category === c && styles.chipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {photos.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 48 }}>📷</Text>
            <Text style={styles.emptyText}>아직 사진이 없어요</Text>
            <TouchableOpacity onPress={takePhoto}>
              <Text style={styles.emptyAction}>첫 사진 찍기 →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groupKeys.map(month => (
            <View key={month}>
              <View style={styles.monthHeader}>
                <Text style={styles.monthText}>{month.replace('-','년 ')}월</Text>
                <Text style={styles.monthCount}>{grouped[month].length}장</Text>
              </View>
              <View style={styles.grid}>
                {grouped[month].map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.cell}
                    onLongPress={() => deletePhoto(p.id)}
                    activeOpacity={0.85}
                  >
                    {p.uri ? (
                      <Image source={{ uri: p.uri }} style={styles.cellImage} />
                    ) : (
                      <View style={styles.cellBg}>
                        <Text style={{ fontSize: 28 }}>
                          {CATEGORY_EMOJI[p.category] ?? '🖼️'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cellOverlay}>
                      <Text style={styles.cellDate}>{p.date?.slice(5)}</Text>
                      <View style={styles.cellTag}>
                        <Text style={styles.cellTagText}>{p.category}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 카메라 FAB */}
      <TouchableOpacity style={styles.fab} onPress={takePhoto} activeOpacity={0.85}>
        <View style={styles.fabInner}>
          <Text style={{ fontSize: 24 }}>📷</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  title: { fontSize: Typography.xl, fontWeight: '800', color: Colors.textDark },
  sub:   { fontSize: Typography.xs, color: Colors.textLight, marginTop: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center' },

  filterRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: 7 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  chipActive: { backgroundColor: Colors.greenMain, borderColor: Colors.greenMain },
  chipText: { fontSize: Typography.xs, fontWeight: '600', color: Colors.textMid },
  chipTextActive: { color: '#fff' },

  emptyBox: { alignItems: 'center', padding: 60, gap: 10 },
  emptyText: { fontSize: Typography.sm, color: Colors.textLight },
  emptyAction: { fontSize: Typography.sm, color: Colors.greenMain, fontWeight: '700' },

  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  monthText: { fontSize: Typography.xs, fontWeight: '700', color: Colors.textMid, letterSpacing: 0.5 },
  monthCount: { fontSize: Typography.xs, color: Colors.textLight },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 2 },
  cell: { width: CELL, height: CELL, position: 'relative', overflow: 'hidden' },
  cellBg: { width: '100%', height: '100%', backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center' },
  cellImage: { width: '100%', height: '100%' },
  cellOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 5, paddingBottom: 4, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: 'transparent' },
  cellDate: { fontSize: 9, color: 'rgba(255,255,255,0.9)', fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset:{width:0,height:1}, textShadowRadius:2 },
  cellTag: { backgroundColor: 'rgba(74,124,47,0.75)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  cellTagText: { fontSize: 8, color: '#fff', fontWeight: '600' },

  fab: { position: 'absolute', bottom: 90, right: 20, ...Shadow.strong },
  fabInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.appleRed, alignItems: 'center', justifyContent: 'center' },
});
