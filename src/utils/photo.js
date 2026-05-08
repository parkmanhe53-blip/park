import { File, Paths } from 'expo-file-system';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { generateId } from './id';
import { Platform } from 'react-native';

console.log('--- Loading Modern photo.js utility with Firebase support ---');

/**
 * 이미지를 Firebase Storage로 업로드합니다.
 * @param {string} uri 
 * @returns {Promise<string|null>} 업로드된 이미지의 URL
 */
export async function uploadToFirebase(uri) {
  if (!uri) return null;

  try {
    const filename = uri.split('/').pop();
    const storageRef = ref(storage, `images/${generateId()}_${filename}`);

    let blob;
    if (Platform.OS === 'web') {
      // Web: fetch URI to get blob
      const response = await fetch(uri);
      blob = await response.blob();
    } else {
      // Mobile: fetch file URI to get blob
      const response = await fetch(uri);
      blob = await response.blob();
    }

    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('Photo uploaded to Firebase:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Failed to upload photo to Firebase:', error);
    // fallback to local uri if upload fails
    return uri;
  }
}

/**
 * 임시 URI의 사진을 앱의 영구 저장소(Document Directory)로 복사합니다. (로컬 캐시용)
 */
export async function saveToPermanentStorage(uri) {
  if (!uri) return null;
  if (Platform.OS === 'web') return uri; // Web doesn't need document directory move
  
  try {
    const filename = uri.split('/').pop();
    const newFilename = `${generateId()}_${filename}`;
    
    const sourceFile = new File(uri);
    const destFile = new File(Paths.document, newFilename);
    
    await sourceFile.copy(destFile);
    return destFile.uri;
  } catch (error) {
    console.warn('Failed to save photo locally:', error);
    return uri;
  }
}
