import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBUfofy8IxpJwwJFGgeT1FhaLyf9uZgpTE',
  authDomain: 'bom-item-list.firebaseapp.com',
  projectId: 'bom-item-list',
  storageBucket: 'bom-item-list.firebasestorage.app',
  messagingSenderId: '55168611581',
  appId: '1:55168611581:web:90f17cf889e64b5c5ffa94',
  measurementId: 'G-B7Z7CRSL2B',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
