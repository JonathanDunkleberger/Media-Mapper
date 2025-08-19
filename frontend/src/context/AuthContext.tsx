"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../utils/supabaseClient';

type AuthResult = {
  data: { user: { id: string; email?: string } | null; session: { user: { id: string; email?: string } } | null };
  error: { message: string } | null;
};

type User = { id: string; email?: string } | null;

const AuthContext = createContext<{
  user: User;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}>({
  user: null,
  loading: true,
  signUp: async () => ({ data: { user: null, session: null }, error: null }),
  signIn: async () => ({ data: { user: null, session: null }, error: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // Helper: sync guest favorites to server
  const syncGuestFavorites = async (token: string) => {
    try {
      const raw = window.localStorage.getItem('guest-favorites');
      if (!raw) return;
  const favorites: Record<string, unknown>[] = JSON.parse(raw);
      for (const fav of favorites) {
        const id = fav.external_id || fav.id || fav.key;
        if (!id) continue;
  // Use /api endpoints directly
  await fetch(`/api/favorites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ media_id: id })
        });
      }
      window.localStorage.removeItem('guest-favorites');
    } catch (e) { console.error('Sync guest favorites failed', e); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
  const u = data.session?.user;
  setUser(u ? { id: u.id, email: u.email } : null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
  const u = session?.user;
  setUser(u ? { id: u.id, email: u.email } : null);
      setLoading(false);
      // On login/signup, sync guest favorites
      if (session?.user && session.access_token) {
        await syncGuestFavorites(session.access_token);
      }
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    const result = await supabase.auth.signUp({ email, password });
    if (result.data.session?.user && result.data.session.access_token) {
      await syncGuestFavorites(result.data.session.access_token);
    }
    return { data: result.data, error: result.error };
  };

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.data.session?.user && result.data.session.access_token) {
      await syncGuestFavorites(result.data.session.access_token);
    }
    return { data: result.data, error: result.error };
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
