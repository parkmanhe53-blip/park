import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// User provided Firebase configuration (Hardcoded for stability on Vercel)
const firebaseConfig = {
  apiKey: "AIzaSyBxZihQk0q0GmBBDcdQ1BCzSiYJAEEgdMI",
  authDomain: "park2-ff7c4.firebaseapp.com",
  projectId: "park2-ff7c4",
  storageBucket: "park2-ff7c4.firebasestorage.app",
  messagingSenderId: "809431455264",
  appId: "1:809431455264:web:59b893632fcb260fedce45",
  measurementId: "G-41YQXNSFKK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
