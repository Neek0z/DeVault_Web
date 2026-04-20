import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Auth() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') await signInWithEmail(email, password);
      else await signUpWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 48 }}>
      <div>
        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em' }}>DeVault</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 4 }}>
          {mode === 'signin' ? 'Connecte-toi à ton vault.' : 'Crée ton compte.'}
        </p>
      </div>

      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          required
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            background: 'var(--bg-fill)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            fontSize: 15,
          }}
        />
        <input
          type="password"
          required
          placeholder="Mot de passe"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            background: 'var(--bg-fill)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            fontSize: 15,
          }}
        />
        {error && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          style={{
            background: 'var(--text-primary)',
            color: 'var(--bg-secondary)',
            padding: '14px',
            borderRadius: 'var(--radius-pill)',
            fontSize: 15,
            fontWeight: 600,
            opacity: busy ? 0.6 : 1,
          }}
        >
          {mode === 'signin' ? 'Se connecter' : "S'inscrire"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        style={{ color: 'var(--text-secondary)', fontSize: 13, alignSelf: 'center' }}
      >
        {mode === 'signin'
          ? "Pas encore de compte ? S'inscrire"
          : 'Déjà un compte ? Se connecter'}
      </button>
    </div>
  );
}
