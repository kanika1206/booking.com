import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorNote, Select, Skeleton } from '../components/ui';
import { api, type Booking, type HostStatus } from '../lib/api';
import { dateRange, money, titleCase, todayIso } from '../lib/format';
import { useAuth } from '../lib/session';

const STATUS_OPTIONS: { value: HostStatus; label: string }[] = [
  { value: 'NEW', label: 'New' }, { value: 'CONTACTED', label: 'Contacted' },
  { value: 'APPROVED', label: 'Approved' }, { value: 'DECLINED', label: 'Declined' },
];

function BookingRow({ b }: { b: Booking }) {
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api.cancelBooking(b.id, 'Cancelled by admin'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });
  const cancelled = b.status === 'CANCELLED';
  const upcoming = b.checkIn > todayIso();
  return (
    <tr>
      <td><span className="strong">{b.reference}</span><div className="cap muted">{b.guest.firstName} {b.guest.lastName}</div></td>
      <td><Link to={`/stays/${b.property.slug}`}>{b.property.name}</Link><div className="cap muted">{b.room.name.split(' | ')[0]}</div></td>
      <td className="nums">{dateRange(b.checkIn, b.checkOut)}</td>
      <td className="nums" style={{ textAlign: 'right' }}>{money(b.price.total, b.price.currency)}</td>
      <td><span className={`badge ${cancelled ? 'bad' : upcoming ? 'ok' : ''}`}>{cancelled ? 'Cancelled' : upcoming ? 'Upcoming' : 'Completed'}</span></td>
      <td style={{ textAlign: 'right' }}>
        {!cancelled && upcoming && (
          <button className="btn ghost" disabled={cancel.isPending} onClick={() => { if (confirm(`Cancel ${b.reference} for ${b.guest.firstName}? The room goes back on sale.`)) cancel.mutate(); }}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
        {cancel.error && <div className="cap bad">{cancel.error.message}</div>}
      </td>
    </tr>
  );
}

function Bookings() {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['admin-bookings', page], queryFn: () => api.adminBookings(page), placeholderData: keepPreviousData });
  if (q.error) return <ErrorNote error={q.error} retry={() => q.refetch()} />;
  if (!q.data) return <Skeleton height={320} />;
  const { data, meta } = q.data;
  return (
    <section className="card table-card">
      <table className="table">
        <thead><tr><th>Booking</th><th>Stay</th><th>Dates</th><th style={{ textAlign: 'right' }}>Total</th><th>Status</th><th /></tr></thead>
        <tbody>{data.map((b) => <BookingRow key={b.id} b={b} />)}</tbody>
      </table>
      {meta.totalPages > 1 && (
        <div className="row between" style={{ padding: '12px 16px' }}>
          <button className="btn secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="s muted">Page {page} of {meta.totalPages}</span>
          <button className="btn secondary" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}

function Applications() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['host-applications'], queryFn: () => api.hostApplications() });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: HostStatus }) => api.setHostStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['host-applications'] }),
  });
  if (q.error) return <ErrorNote error={q.error} retry={() => q.refetch()} />;
  if (!q.data) return <Skeleton height={240} />;
  if (q.data.data.length === 0) return <Empty icon="home" title="No applications yet"><Link className="btn secondary" to="/host">Open the host form</Link></Empty>;
  return (
    <div className="stack md">
      {update.error && <ErrorNote error={update.error} />}
      {q.data.data.map((a) => (
        <article key={a.id} className="card row wrap top" style={{ gap: 20 }}>
          <div className="grow" style={{ minWidth: 240 }}>
            <div className="h4">{a.propertyName}</div>
            <div className="s muted">{titleCase(a.propertyType)} · {a.rooms} rooms · {a.city}</div>
            <div className="s" style={{ marginTop: 8 }}>{a.name} · <a href={`mailto:${a.email}`}>{a.email}</a>{a.phone ? ` · ${a.phone}` : ''}</div>
            {a.message && <p className="s muted" style={{ marginTop: 8 }}>“{a.message}”</p>}
            <div className="cap faint" style={{ marginTop: 8 }}>Received {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
          <div style={{ width: 180 }}>
            <Select label={`Status of ${a.propertyName}`} value={a.status} options={STATUS_OPTIONS} onChange={(status) => update.mutate({ id: a.id, status })} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'bookings' | 'hosts'>('bookings');
  const bookings = useQuery({ queryKey: ['admin-bookings', 1], queryFn: () => api.adminBookings(1), enabled: user?.role === 'ADMIN' });
  const apps = useQuery({ queryKey: ['host-applications'], queryFn: () => api.hostApplications(), enabled: user?.role === 'ADMIN' });

  if (user?.role !== 'ADMIN') {
    return <div className="page" style={{ paddingTop: 40 }}><Empty icon="lock" title="Admins only"><p className="muted">Sign in as admin@example.com to see the dashboard.</p></Empty></div>;
  }
  const newApps = apps.data?.data.filter((a) => a.status === 'NEW').length ?? 0;
  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <div className="row between wrap" style={{ gap: 16 }}>
        <div><div className="over">Admin</div><h1 className="h1">Dashboard</h1></div>
        <div className="row" style={{ gap: 12 }}>
          <div className="stat"><b className="nums">{bookings.data?.meta.total ?? '–'}</b><span>bookings</span></div>
          <div className="stat"><b className="nums">{newApps}</b><span>new applications</span></div>
        </div>
      </div>
      <div className="segment" role="tablist" style={{ margin: '24px 0 16px' }}>
        <button role="tab" aria-selected={tab === 'bookings'} className={tab === 'bookings' ? 'on' : ''} onClick={() => setTab('bookings')}>All bookings</button>
        <button role="tab" aria-selected={tab === 'hosts'} className={tab === 'hosts' ? 'on' : ''} onClick={() => setTab('hosts')}>Host applications{newApps ? ` (${newApps})` : ''}</button>
      </div>
      {tab === 'bookings' ? <Bookings /> : <Applications />}
    </div>
  );
}
