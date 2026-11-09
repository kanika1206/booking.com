import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorNote, Icon, Select } from '../components/ui';
import type { IconName } from '../components/icons';
import { api, type HostApplicationInput, type PropertyType } from '../lib/api';
import { useAuth } from '../lib/session';

const TYPES: { value: PropertyType; label: string }[] = [
  { value: 'GUESTHOUSE', label: 'Guesthouse or homestay' }, { value: 'HOTEL', label: 'Hotel' },
  { value: 'RESORT', label: 'Resort' }, { value: 'VILLA', label: 'Villa' },
  { value: 'APARTMENT', label: 'Apartment' }, { value: 'HOSTEL', label: 'Hostel' },
];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'edit', title: 'Tell us about your place', text: 'Five minutes. No documents yet.' },
  { icon: 'shield-check', title: 'We verify it', text: 'An address visit and a photo check before anything goes live.' },
  { icon: 'calendar', title: 'Start taking bookings', text: 'Live room counts mean you are never overbooked.' },
];

export function HostPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<HostApplicationInput>({
    name: user ? `${user.firstName} ${user.lastName}` : '', email: user?.email ?? '', phone: '',
    propertyName: '', city: '', propertyType: 'GUESTHOUSE', rooms: 4, message: '',
  });
  const apply = useMutation({ mutationFn: () => api.applyToHost(form) });
  const set = <K extends keyof HostApplicationInput>(k: K, v: HostApplicationInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="page host-layout" style={{ paddingTop: 24 }}>
      <div className="stack lg">
        <div className="stack">
          <div className="over">List your property</div>
          <h1 className="d-l">Host travellers who book with confidence.</h1>
          <p className="body-l">Guests here see all-in prices and live availability, so the bookings you get are the ones that show up.</p>
        </div>
        <ol className="stack md" style={{ listStyle: 'none', padding: 0 }}>
          {STEPS.map((s, i) => (
            <li key={s.title} className="row top" style={{ gap: 16 }}>
              <span className="icon-tile t-action"><Icon name={s.icon} /></span>
              <div><div className="h4">{i + 1}. {s.title}</div><div className="s muted">{s.text}</div></div>
            </li>
          ))}
        </ol>
      </div>

      {apply.isSuccess ? (
        <section className="card stack md" role="status" style={{ alignSelf: 'start' }}>
          <span className="conf-check" style={{ width: 56, height: 56 }}><Icon name="check" size={28} /></span>
          <h2 className="h2">Application received</h2>
          <p className="muted">Thanks, {form.name.split(' ')[0]}. We’ve saved your application for <b className="strong" style={{ color: 'var(--cream)' }}>{form.propertyName}</b>. Reference <b className="strong" style={{ color: 'var(--cream)' }}>{apply.data.id.slice(0, 8).toUpperCase()}</b>.</p>
          <p className="s muted">This prototype doesn’t send email. An admin reviews applications from the dashboard.</p>
          <Link className="btn secondary" to="/" style={{ alignSelf: 'flex-start' }}>Back to home</Link>
        </section>
      ) : (
        <form className="card stack md" style={{ alignSelf: 'start' }} onSubmit={(e) => { e.preventDefault(); apply.mutate(); }}>
          <h2 className="h3">Your details</h2>
          <div className="grid-2">
            <label className="field">Full name<span className="input"><input required minLength={2} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} /></span></label>
            <label className="field">Phone (optional)<span className="input"><input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></span></label>
          </div>
          <label className="field">Email<span className="input"><input type="email" required autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></span></label>

          <h2 className="h3" style={{ marginTop: 8 }}>Your property</h2>
          <label className="field">Property name<span className="input"><input required minLength={2} value={form.propertyName} onChange={(e) => set('propertyName', e.target.value)} /></span></label>
          <div className="grid-2">
            <label className="field">City<span className="input"><input required minLength={2} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Udaipur" /></span></label>
            <label className="field">Rooms<span className="input"><input type="number" required min={1} max={500} value={form.rooms} onChange={(e) => set('rooms', Number(e.target.value))} /></span></label>
          </div>
          <div className="field">Type<Select label="Property type" icon="home" value={form.propertyType} onChange={(v) => set('propertyType', v)} options={TYPES} /></div>
          <label className="field">Anything else? (optional)
            <textarea rows={3} maxLength={2000} value={form.message} onChange={(e) => set('message', e.target.value)} placeholder="What makes it special, when you’d like to start…" style={{ padding: 14, resize: 'vertical' }} />
          </label>
          {apply.error && <ErrorNote error={apply.error} />}
          <button className="btn lg block" disabled={apply.isPending}>{apply.isPending ? 'Sending…' : 'Send application'}</button>
        </form>
      )}
    </div>
  );
}
