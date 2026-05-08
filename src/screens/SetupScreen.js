import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { saveUserInfo } from '../store/userStore';
import { uploadToFirebase } from '../utils/photo';

export default function SetupScreen({ navigation }) {
  const [farmName, setFarmName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [farmImage, setFarmImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFarmImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!farmName.trim() || !ownerName.trim()) {
      Alert.alert('알림', '농장 이름과 농장주 이름을 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = farmImage;
      if (farmImage && !farmImage.startsWith('http')) {
        finalImageUrl = await uploadToFirebase(farmImage);
      }

      const userInfo = {
        farmName: farmName.trim(),
        ownerName: ownerName.trim(),
        farmImage: finalImageUrl,
      };

      const success = await saveUserInfo(userInfo);
      if (success) {
        navigation.replace('Main');
      } else {
        Alert.alert('오류', '정보 저장에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (e) {
      Alert.alert('오류', '업로드 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>🌿</Text>
            <Text style={styles.title}>과수원 초기 설정</Text>
            <Text style={styles.subtitle}>농장 정보를 입력하여 시작해보세요</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>농장 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 푸른 사과 농원"
              placeholderTextColor={Colors.textLight}
              value={farmName}
              onChangeText={setFarmName}
            />

            <Text style={styles.label}>농장주 이름</Text>
            <TextInput
              style={styles.input}
              placeholder="예: 홍길동"
              placeholderTextColor={Colors.textLight}
              value={ownerName}
              onChangeText={setOwnerName}
            />

            <Text style={styles.label}>농장 대표 이미지</Text>
            <TouchableOpacity 
              style={styles.imagePicker} 
              onPress={pickImage}
              activeOpacity={0.7}
            >
              {farmImage ? (
                <Image source={{ uri: farmImage }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={{ fontSize: 40 }}>📸</Text>
                  <Text style={styles.imagePlaceholderText}>이미지 업로드</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={loading}
          >
            <LinearGradient
              colors={[Colors.greenMain, Colors.greenMid]}
              style={styles.saveGradient}
            >
              <Text style={styles.saveText}>
                {loading ? '설정 저장 중...' : '설정 완료 및 시작하기'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 30 },
  headerEmoji: { fontSize: 50, marginBottom: 10 },
  title: { fontSize: Typography.xxl, fontWeight: '900', color: Colors.textDark, textAlign: 'center' },
  subtitle: { fontSize: Typography.sm, color: Colors.textMid, marginTop: 8 },
  
  form: { marginTop: 10 },
  label: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textDark, marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: Typography.md,
    color: Colors.textDark,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  
  imagePicker: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginTop: 4,
    ...Shadow.card,
  },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  imagePlaceholderText: { fontSize: Typography.sm, color: Colors.textLight, fontWeight: '600' },
  
  saveBtn: { marginTop: 40, borderRadius: Radius.full, overflow: 'hidden', ...Shadow.strong },
  saveGradient: { paddingVertical: 16, alignItems: 'center' },
  saveText: { fontSize: Typography.md, fontWeight: '800', color: '#fff' },
});
