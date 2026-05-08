import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const USER_STORAGE_KEY = 'PARK_APP_USER_INFO';
const FIREBASE_USER_DOC = 'users/default_user'; // For now, using a default doc. In production, this would be `users/${userId}`

/**
 * @typedef {Object} UserInfo
 * @property {string} farmName - 농장 이름
 * @property {string} ownerName - 농장주 이름
 * @property {string|null} farmImage - 농장 이미지 URI
 */

/**
 * 사용자 정보 저장
 * @param {UserInfo} info 
 */
export const saveUserInfo = async (info) => {
  try {
    // 1. Local Save (Cache)
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(info));
    
    // 2. Firebase Save (Remote)
    const userRef = doc(db, FIREBASE_USER_DOC);
    await setDoc(userRef, {
      ...info,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return true;
  } catch (error) {
    console.error('Failed to save user info:', error);
    return false;
  }
};

/**
 * 사용자 정보 로드
 * @returns {Promise<UserInfo|null>}
 */
export const loadUserInfo = async () => {
  try {
    // 1. Try Firebase first for the latest data if online
    const userRef = doc(db, FIREBASE_USER_DOC);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
      const data = snap.data();
      // Update local cache
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
      return data;
    }

    // 2. Fallback to Local Cache
    const localData = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return localData ? JSON.parse(localData) : null;
  } catch (error) {
    console.warn('Failed to load remote user info, falling back to local:', error);
    const data = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }
};

/**
 * 사용자 정보 삭제 (초기화용)
 */
export const clearUserInfo = async () => {
  try {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    // Note: We usually don't delete from remote for a simple clear, 
    // but you could add logic to delete from Firestore here if needed.
    return true;
  } catch (error) {
    return false;
  }
};
