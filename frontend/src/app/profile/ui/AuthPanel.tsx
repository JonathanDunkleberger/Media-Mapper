'use client';
import { FormEvent, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { useFavorites } from '@/store/favorites';

export default function AuthPanel() {
  const token = useSession();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const items = useFavorites(s => s.items);
  const [emailAddr, setEmailAddr] = useState<string | null>(null);
  const [serverCount, setServerCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    supabaseClient.auth.getUser().then(({ data }) => {
      if (!active) return;
      setEmailAddr(data.user?.email ?? null);
    });
    if (token) {
      fetch('/api/favorites', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(j => { if (active && j?.items) setServerCount(j.items.length); });
    } else {
      setServerCount(null);
    }
    return () => { active = false; };
  }, [token]);

  const sendMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
    if (!error) setSent(true);
  };

  const signInWithProvider = async (provider: 'github' | 'google') => {
    await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      },
    });
  };

  const signOut = async () => {
    await supabaseClient.auth.signOut();
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-white/10 p-4">
        <h2 className="font-medium mb-3">Status</h2>
        <div className="text-sm text-zinc-300">
          {token ? (
            <>
              <p>Signed in{emailAddr ? ` as ${emailAddr}` : ''}.</p>
              <p className="mt-2">Local favorites: {items.length}</p>
              {serverCount !== null && <p className="mt-1">Server favorites: {serverCount}</p>}
              <button onClick={signOut} className="mt-4 rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20">Sign out</button>
            </>
          ) : (
            <p>Not signed in.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 p-4">
        <h2 className="font-medium mb-3">Sign in</h2>
        <form onSubmit={sendMagicLink} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 outline-none focus:border-white/25"
          />
          <button type="submit" className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20" disabled={sent}>
            {sent ? 'Magic link sent' : 'Send magic link'}
          </button>
        </form>
        <div className="mt-4 flex gap-2">
          <button onClick={() => signInWithProvider('github')} className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20">Continue with GitHub</button>
          <button onClick={() => signInWithProvider('google')} className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20">Continue with Google</button>
        </div>
      </div>
    </div>
  );
}
