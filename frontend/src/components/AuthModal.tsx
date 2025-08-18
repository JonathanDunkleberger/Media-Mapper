import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal() {
  const { user, signUp, signIn, signOut, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');

  if (loading) return <div>Loading...</div>;
  if (user) return (
    <div>
      <p>Signed in as {user.email}</p>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        const result = await signIn(email, password);
        if (result.error) setError(result.error.message);
      } else {
        const result = await signUp(email, password);
        if (result.error) setError(result.error.message);
      }
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
        setError((e as { message: string }).message);
      } else {
        setError('An unknown error occurred.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2>{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
      <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" required />
      <button type="submit">{mode === 'login' ? 'Login' : 'Sign Up'}</button>
      <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        {mode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Login'}
      </button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
}
