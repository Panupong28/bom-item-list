import { createContext, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { db } from './firebase.js';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import Sidebar from './components/Sidebar.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import { useAuth } from './hooks/useAuth.js';

export const DataContext = createContext(null);
export const AuthContext = createContext(null);

export default function App() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth();
  const [parts, setParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [boms, setBoms] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setParts([]);
      setCategories([]);
      setBoms([]);
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubParts = onSnapshot(
      query(collection(db, 'parts'), orderBy('createdAt', 'asc')),
      (snap) => {
        setParts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load parts:', err);
        setLoading(false);
      }
    );
    const unsubCats = onSnapshot(
      query(collection(db, 'categories'), orderBy('name', 'asc')),
      (snap) => {
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    const unsubBoms = onSnapshot(
      query(collection(db, 'boms'), orderBy('createdAt', 'desc')),
      (snap) => {
        setBoms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error('Failed to load boms:', err)
    );
    const unsubTpl = onSnapshot(
      query(collection(db, 'bomTemplates'), orderBy('createdAt', 'desc')),
      (snap) => {
        setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => console.error('Failed to load templates:', err)
    );
    return () => {
      unsubParts();
      unsubCats();
      unsubBoms();
      unsubTpl();
    };
  }, [user]);

  const partsByCategory = useMemo(() => {
    const map = {};
    for (const p of parts) {
      const c = p.category || 'Uncategorized';
      (map[c] ||= []).push(p);
    }
    return map;
  }, [parts]);

  const partsByBrand = useMemo(() => {
    const map = {};
    for (const p of parts) {
      const b = (p.brand || '').trim();
      if (!b) continue;
      (map[b] ||= []).push(p);
    }
    return map;
  }, [parts]);

  const brands = useMemo(
    () =>
      Object.keys(partsByBrand).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      ),
    [partsByBrand]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-sm text-slate-500 dark:text-slate-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onSignIn={signInWithGoogle} />;
  }

  return (
    <AuthContext.Provider value={{ user, signOut }}>
      <DataContext.Provider
        value={{
          parts,
          categories,
          partsByCategory,
          partsByBrand,
          brands,
          boms,
          templates,
          loading,
        }}
      >
        <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
          <Sidebar
            parts={parts}
            categories={categories}
            brands={brands}
            totalParts={parts.length}
            bomCount={boms.length}
            templateCount={templates.length}
            user={user}
            onSignOut={signOut}
          />
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <Outlet />
          </main>
        </div>
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}
