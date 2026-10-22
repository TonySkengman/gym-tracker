import { useEffect, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import App from '../App';
import { createGuestApi } from '../services/guest';
import { clearCsrf, getCurrentUser, login, logout, register } from '../services/auth';

export default function AccountApp() {
  const [guestApi, setGuestApi] = useState(createGuestApi);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  async function restore() {
    setLoading(true); setError('');
    try { setUser(await getCurrentUser()); }
    catch { setError('Account connection unavailable. You can still use guest mode.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    restore();
    const expire = () => { clearCsrf(); setUser(null); setError('Your session expired. Log in again to access your saved training.'); };
    window.addEventListener('session-expired', expire);
    // Re-check account identity across browser tabs before showing private data.
    const focus = async () => {
      try { clearCsrf(); const current = await getCurrentUser(); setUser(previous => previous?.id === current?.id ? previous : current); }
      catch { /* Keep the current view during a temporary connection failure. */ }
    };
    window.addEventListener('focus', focus);
    return () => { window.removeEventListener('session-expired', expire); window.removeEventListener('focus', focus); };
  }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { setUser(await (mode === 'register' ? register(data) : login(data))); setAuthOpen(false); setGuestApi(createGuestApi()); }
    catch (error) { setError(error.message || 'Cannot reach the server. Please retry.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true); setError('');
    try { await logout(); setUser(null); setGuestApi(createGuestApi()); setAuthOpen(false); }
    catch { setError('Could not log out. Check your connection and retry.'); }
    finally { setBusy(false); }
  }
  if (loading) return <div className="account-screen" role="status">Loading your account…</div>;
  return <>
    <div hidden={authOpen}><App key={user?.id || 'guest'} user={user} services={user ? undefined : guestApi} onLogout={signOut} logoutBusy={busy} onSignIn={() => { setError(''); setAuthOpen(true); }}/></div>
    {!authOpen && error && <p role="alert" className="account-error error">{error}</p>}
    {authOpen && <div className="account-screen account-overlay" role="dialog" aria-modal="true" aria-label={mode === 'register' ? 'Create account' : 'Log in'}><section className="account-card">
    <div className="brand"><Dumbbell size={30}/>form<span className="brand-dot">.</span></div>
    <p className="eyebrow">YOUR TRAINING SPACE</p>
    <h1>{mode === 'register' ? 'Create your account' : 'Welcome back'}</h1>
    <p className="muted">Save your training with an account. Signing in opens your saved workspace; temporary guest data will not be transferred.</p>
    <form onSubmit={submit} key={mode}>
      {mode === 'register' && <label>Name<input name="displayName" autoComplete="name" required maxLength={60}/></label>}
      <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>
      <label>Password<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 8 : 1} maxLength={72}/></label>
      {mode === 'register' && <p className="muted">Use 8–72 characters.</p>}
      {error && <p className="error mt-4" role="alert">{error}</p>}
      <button className="primary account-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'}</button>
    </form>
    <button className="text-button" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'New here? Create an account' : 'Already registered? Log in'}</button>
    <button className="secondary account-back" disabled={busy} onClick={() => { setAuthOpen(false); setError(''); }}>Continue as guest</button>
  </section></div>}
  </>;
}
