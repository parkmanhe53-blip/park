import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../utils/firebase';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  query, orderBy, limit 
} from 'firebase/firestore';

export const JOURNAL_KEY = '@park_journals';
const FIREBASE_JOURNAL_COL = 'journals';

export async function loadJournals() {
  try {
    // 1. Try Firebase (Online)
    const q = query(collection(db, FIREBASE_JOURNAL_COL), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const journals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(journals));
      return journals;
    }

    // 2. Fallback to Local
    const raw = await AsyncStorage.getItem(JOURNAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('loadJournals 원격 로드 실패, 로컬 데이터 사용:', e.message);
    const raw = await AsyncStorage.getItem(JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}

export async function saveJournal(journal) {
  try {
    // 1. Local Cache Save
    const all = await loadJournals();
    const idx = all.findIndex(j => j.id === journal.id);
    if (idx >= 0) {
      all[idx] = journal;
    } else {
      all.unshift(journal);
    }
    await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(all));

    // 2. Firebase Remote Save
    const journalRef = doc(db, FIREBASE_JOURNAL_COL, journal.id);
    await setDoc(journalRef, {
      ...journal,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return all;
  } catch (e) {
    console.warn('saveJournal 오류:', e.message);
    throw e;
  }
}

export async function deleteJournal(id) {
  try {
    // 1. Local Cache Delete
    const all = await loadJournals();
    const filtered = all.filter(j => j.id !== id);
    await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(filtered));

    // 2. Firebase Remote Delete
    await deleteDoc(doc(db, FIREBASE_JOURNAL_COL, id));

    return filtered;
  } catch (e) {
    console.warn('deleteJournal 오류:', e.message);
    throw e;
  }
}
