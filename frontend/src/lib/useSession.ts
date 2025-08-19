'use client';
import { useEffect, useState } from 'react';
import { supabaseClient } from './supabase';

export function useSession() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
    const { data: sub } = supabaseClient.auth.onAuthStateChange((_e, s) => {
      setToken(s?.access_token ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);
  return token;
}
