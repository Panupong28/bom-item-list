import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
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

// Persist Firestore data in IndexedDB so repeat loads render instantly from the
// local cache and sync in the background. The multi-tab manager keeps the cache
// consistent when the app is open in several tabs.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
