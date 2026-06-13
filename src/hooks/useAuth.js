import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        console.error('Google sign-in failed:', err);
        alert(`Sign-in failed: ${err.message}`);
      }
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  return { user, loading, signInWithGoogle, signOut: signOutUser };
}
