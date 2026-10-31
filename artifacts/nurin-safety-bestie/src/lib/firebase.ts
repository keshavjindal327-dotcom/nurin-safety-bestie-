import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// PUBLIC web-app identifiers (safe in browser code; access is enforced by firestore.rules).
// Each can be overridden with a VITE_FIREBASE_* environment variable.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyAxR81BV91o_PZxyPImsoJWFdzsaO_XXx0',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'nurin-safety-bestie.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'nurin-safety-bestie',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'nurin-safety-bestie.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '852134960319',
  appId: env.VITE_FIREBASE_APP_ID || '1:852134960319:web:d1ccb4805d5be377f97a0a',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
