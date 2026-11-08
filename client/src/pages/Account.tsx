import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GridCard } from '../components/Cards';
import { DemoTag, Empty, ErrorNote, Icon, Skeleton } from '../components/ui';
import { DEMO_GENIUS_LEVEL } from '../demo/fixtures';
import { api, ApiError } from '../lib/api';
import { initials } from '../lib/format';
import { safeNext, useAuth, useFavorites } from '../lib/session';
import { defaultStay } from '../lib/stay';

function useSessionSuccess() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [params] = useSearchParams();
  return (user: Awaited<ReturnType<typeof api.login>>) => {
    qc.setQueryData(['me'], user);
    qc.invalidateQueries({ queryKey: ['favorites'] });
    nav(safeNext(params.get('next')), { replace: true });
  };
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [params] = useSearchParams();
  const done = useSessionSuccess();
  const login = useMutation({ mutationFn: () => api.login(email, password), onSuccess: done });
  const next = params.get('next');
  return (
    <div className="page">
      <form className="card auth stack md" onSubmit={(e) => { e.preventDefault(); login.mutate(); }}>
        <h1 className="h2">Sign in</h1>
        <div className="note plain"><Icon name="info" size={18} /><span><DemoTag label="Local demo" /> Try <b>demo@example.com</b> with password <b>Demo1234!</b></span></div>
        <label className="field">Email<span className="input"><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></span></label>
        <label className="field">Password<span className="input"><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></span></label>
        {login.error && <ErrorNote error={login.error} />}
        <button className="btn lg block" disabled={login.isPending}>{login.isPending ? 'Signing in…' : 'Sign in'}</button>
        <p className="s muted">New here? <Link to={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link></p>
      </form>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const done = useSessionSuccess();
  const register = useMutation({ mutationFn: () => api.register(form), onSuccess: done });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="page">
      <form className="card auth stack md" onSubmit={(e) => { e.preventDefault(); register.mutate(); }}>
        <h1 className="h2">Create your account</h1>
        <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="field">First name<span className="input"><input required autoComplete="given-name" value={form.firstName} onChange={set('firstName')} /></span></label>
          <label className="field">Last name<span className="input"><input required autoComplete="family-name" value={form.lastName} onChange={set('lastName')} /></span></label>
        </div>
        <label className="field">Email<span className="input"><input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></span></label>
        <label className="field">Password (at least 8 characters)<span className="input"><input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} /></span></label>
        {register.error && <ErrorNote error={register.error} />}
        <button className="btn lg block" disabled={register.isPending}>{register.isPending ? 'Creating…' : 'Create account'}</button>
        <p className="s muted">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}

export function SavedPage() {
  const { list } = useFavorites();
  const stay = defaultStay();
  return (
    <div className="page" style={{ paddingTop: 32 }}>
      <h1 className="h1" style={{ marginBottom: 20 }}>Saved stays</h1>
      {list.error ? <ErrorNote error={list.error} retry={() => list.refetch()} /> : list.isLoading ? <Skeleton height={306} /> : !list.data?.length ? (
        <Empty icon="heart" title="Nothing saved yet"><p className="muted">Tap the heart on any stay to keep it here.</p><Link to="/" className="btn">Find stays</Link></Empty>
      ) : (
        <div className="grid-4">{list.data.map((p) => <GridCard key={p.id} p={p} stay={stay} />)}</div>
      )}
    </div>
  );
}

export function AccountPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [firstName, setFirst] = useState(user?.firstName ?? '');
  const [lastName, setLast] = useState(user?.lastName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const save = useMutation({
    mutationFn: () => api.updateMe({ firstName, lastName, phone: phone || null }),
    onSuccess: (u) => qc.setQueryData(['me'], u),
  });
  const logout = useMutation({ mutationFn: api.logout, onSuccess: () => { qc.clear(); nav('/'); } });
  if (!user) return null;
  const message = save.error instanceof ApiError ? save.error : null;
  return (
    <div className="page" style={{ paddingTop: 32, maxWidth: 640 }}>
      <div className="row" style={{ marginBottom: 20, gap: 16 }}>
        <span className="avatar accent" style={{ width: 56, height: 56, fontSize: 18 }}>{initials(user.firstName, user.lastName)}</span>
        <div><h1 className="h2">{user.firstName} {user.lastName}</h1><div className="s row muted">{user.email} · {DEMO_GENIUS_LEVEL} <DemoTag /></div></div>
      </div>
      <form className="card stack md" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <h2 className="h4">Your details</h2>
        <label className="field">First name<span className="input"><input required value={firstName} onChange={(e) => setFirst(e.target.value)} /></span></label>
        <label className="field">Last name<span className="input"><input required value={lastName} onChange={(e) => setLast(e.target.value)} /></span></label>
        <label className="field">Mobile<span className="input"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></span></label>
        {message && <ErrorNote error={message} />}
        {save.isSuccess && <div className="note ok" role="status"><Icon name="check" size={18} />Saved.</div>}
        <div className="row wrap">
          <button className="btn" disabled={save.isPending}>Save changes</button>
          <button type="button" className="btn secondary" onClick={() => logout.mutate()}>Sign out</button>
        </div>
      </form>
    </div>
  );
}
