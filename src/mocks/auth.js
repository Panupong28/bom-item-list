// In-memory Firebase Auth shim for local/container testing.
//
// Wired in via a Vite alias that only activates when VITE_MOCK is set, so the
// production bundle is unaffected. It signs a fake user in immediately so the
// Google sign-in screen is bypassed.

const mockUser = {
  uid: 'dev-tester',
  displayName: 'Dev Tester',
  email: 'dev@example.com',
  photoURL: null,
};

const state = { user: mockUser };
const listeners = new Set();

function notify() {
  for (const cb of listeners) cb(state.user);
}

export function getAuth() {
  return {
    get currentUser() {
      return state.user;
    },
  };
}

export class GoogleAuthProvider {}

export function onAuthStateChanged(_auth, cb) {
  listeners.add(cb);
  Promise.resolve().then(() => cb(state.user));
  return () => listeners.delete(cb);
}

export async function signInWithPopup() {
  state.user = mockUser;
  notify();
  return { user: mockUser };
}

export async function signOut() {
  state.user = null;
  notify();
}
