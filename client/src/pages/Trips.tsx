import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmPanel, DemoTag, Empty, ErrorNote, Icon, Skeleton } from '../components/ui';
import { ReviewForm } from '../components/ReviewForm';
import { api, type Booking } from '../lib/api';
import { addDays, dateRange, dayMonth, daysFromToday, lastFreeCancelDay, money, monthYear, plural, weekdayDayMonth } from '../lib/format';
import { rateLabel, splitRoomName, stayToParams } from '../lib/stay';
import { downloadIcs } from './Confirmation';

type Scope = 'upcoming' | 'past' | 'cancelled';

const toStay = (b: Booking) => ({ destination: b.property.destination, checkIn: b.checkIn, checkOut: b.checkOut, adults: b.adults, children: b.children, rooms: b.rooms });

/**
 * Real price-drop check: compares what this booking cost with what the same room and dates cost
 * today. Rebooking is a real cancel followed by a real new booking, as the API has no price edit.
 */
function PriceDrop({ b, onRebooked }: { b: Booking; onRebooked: (b: Booking) => void }) {
  const [confirming, setConfirming] = useState(false);
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['rebook-quote', b.id],
    enabled: b.canCancel,
    queryFn: () => api.availability({ propertyId: b.property.id, checkIn: b.checkIn, checkOut: b.checkOut, adults: b.adults, children: b.children, rooms: b.rooms }),
  });
  const now = q.data?.find((r) => r.id === b.room.id);
  const rebook = useMutation({
    mutationFn: async () => {
      await api.cancelBooking(b.id, 'Rebooked at a lower price');
      return api.createBooking({
        roomId: b.room.id, checkIn: b.checkIn, checkOut: b.checkOut, adults: b.adults, children: b.children, rooms: b.rooms,
        guest: { firstName: b.guest.firstName, lastName: b.guest.lastName, email: b.guest.email, phone: b.guest.phone ?? undefined },
        specialRequests: b.specialRequests ?? undefined,
      });
    },
    onSettled: () => qc.invalidateQueries(),
    onSuccess: (fresh) => onRebooked(fresh),
  });
  if (!now || now.quote.total >= b.price.total) return null;
  const saving = b.price.total - now.quote.total;
  const c = now.quote.currency;
  return (
    <>
      <section className="card ai-card row wrap" style={{ gap: 16 }}>
        <Icon name="trend-down" size={28} className="ai" />
        <div className="grow" style={{ minWidth: 240 }}>
          <div className="h4 ai">Price dropped {money(saving, c)} for your exact room and dates</div>
          <p className="s">You’re still in the free-cancellation window, so you can rebook at the lower price.</p>
        </div>
        <button className="btn ai" onClick={() => setConfirming(true)}><Icon name="sparkle" size={18} />Rebook for {money(now.quote.total, c)}</button>
      </section>
      {confirming && (
        <ConfirmPanel
          title={`Rebook for ${money(now.quote.total, c)}?`}
          confirmLabel="Cancel and rebook"
          pending={rebook.isPending}
          onConfirm={() => rebook.mutate()}
          onCancel={() => setConfirming(false)}
        >
          This cancels {b.reference} and creates a new booking for the same room and dates, with a new reference.
          {rebook.error && <div style={{ marginTop: 8 }}><ErrorNote error={rebook.error} /></div>}
        </ConfirmPanel>
      )}
    </>
  );
}

function CancelFlow({ b, onClose }: { b: Booking; onClose: () => void }) {
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api.cancelBooking(b.id),
    onSuccess: () => { qc.invalidateQueries(); onClose(); },
  });
  return (
    <ConfirmPanel danger title="Cancel this booking?" confirmLabel="Yes, cancel booking" pending={cancel.isPending} onConfirm={() => cancel.mutate()} onCancel={onClose}>
      {b.property.name}, {dateRange(b.checkIn, b.checkOut)}. The room goes back on sale straight away, and this can’t be undone.
      {cancel.error && <div style={{ marginTop: 8 }}><ErrorNote error={cancel.error} /></div>}
    </ConfirmPanel>
  );
}

function TripDetail({ b, onRebooked }: { b: Booking; onRebooked: (b: Booking) => void }) {
  const [tab, setTab] = useState<'overview' | 'itinerary' | 'documents'>('overview');
  const [cancelling, setCancelling] = useState(false);
  const [requestState, setRequestState] = useState<'open' | 'accepted' | 'declined'>('open');
  const nav = useNavigate();
  const days = daysFromToday(b.checkIn);
  const upcoming = b.status === 'CONFIRMED' && days > 0;
  const cancelled = b.status === 'CANCELLED';
  const room = splitRoomName(b.room.name);
  const stayLink = `/stays/${b.property.slug}?${stayToParams(toStay(b))}`;
  return (
    <div className="stack md" style={{ minWidth: 0 }}>
      <section className="trip-hero">
        {b.property.imageUrl && <img className="scene" src={b.property.imageUrl} alt="" style={{ position: 'absolute', inset: 0 }} />}
        <div>
          <div className="over" style={{ color: 'var(--bg-accent)' }}>{b.property.destination} · {dateRange(b.checkIn, b.checkOut)}</div>
          <h2 className="d-l" style={{ fontSize: 36, lineHeight: '44px' }}>{b.property.name}</h2>
          <div className="s">{cancelled ? 'Cancelled' : upcoming ? `In ${plural(days, 'day')}` : days <= 0 && daysFromToday(b.checkOut) > 0 ? 'Happening now' : 'Completed'}</div>
        </div>
      </section>
      <div className="chips" role="tablist">
        {(['overview', 'itinerary', 'documents'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} aria-pressed={tab === t} className="chip" onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
        <Link className="chip" to="/messages">Messages</Link>
      </div>

      {tab === 'overview' && (
        <>
          {upcoming && <PriceDrop b={b} onRebooked={onRebooked} />}
          <section className="card stack md">
            <div className="row between wrap top">
              <div><h3 className="h3">{b.property.name}</h3><div className="s muted" style={{ fontSize: 14 }}>{b.reference} · {room.category} · {rateLabel(b.room)}</div></div>
              {cancelled ? <span className="badge bad">Cancelled</span> : <span className="badge ok"><Icon name="check" size={16} />Confirmed</span>}
            </div>
            <div className="row wrap s" style={{ gap: 24 }}>
              <span><span className="muted">Check-in </span><b>{weekdayDayMonth(b.checkIn)}</b></span>
              <span><span className="muted">Check-out </span><b>{weekdayDayMonth(b.checkOut)}</b></span>
              <span><span className="muted">Guests </span><b>{plural(b.adults + b.children, 'guest')}</b></span>
              <span><span className="muted">Total </span><b>{money(b.price.total, b.price.currency)}</b> <span className="muted">(tax {money(b.price.taxes, b.price.currency)})</span></span>
            </div>
            {b.specialRequests && <div className="s"><span className="muted">Requests: </span>{b.specialRequests}</div>}
            {cancelling ? <CancelFlow b={b} onClose={() => setCancelling(false)} /> : !cancelled && upcoming && (
              <div className="grid-4x">
                <Link className="action-tile" to={stayLink}><span className="icon-tile sm t-white"><Icon name="calendar" size={18} /></span><span className="strong s">Change dates</span><span className="cap muted">Pick new dates and book. Then cancel this one.</span></Link>
                <div className="action-tile"><span className="icon-tile sm t-white"><Icon name="users" size={18} /></span><span className="strong s">Guests</span><span className="cap muted">{plural(b.adults + b.children, 'guest')} on this booking. Editing isn’t available yet.</span></div>
                <Link className="action-tile" to="/messages"><span className="icon-tile sm t-white"><Icon name="message" size={18} /></span><span className="strong s">Message property</span><span className="cap muted">Sample conversation <DemoTag /></span></Link>
                {b.canCancel ? (
                  <button className="action-tile" onClick={() => setCancelling(true)}><span className="icon-tile sm t-white bad"><Icon name="x" size={18} /></span><span className="strong s bad">Cancel for free</span><span className="cap muted">Until {dayMonth(lastFreeCancelDay(b.checkIn))}</span></button>
                ) : (
                  <div className="action-tile"><span className="icon-tile sm t-white"><Icon name="lock" size={18} /></span><span className="strong s">Non-refundable</span><span className="cap muted">This rate can’t be cancelled.</span></div>
                )}
              </div>
            )}
          </section>

          {upcoming && (
            <section className="card stack md" style={{ background: 'var(--bg-success-tint)', borderColor: 'var(--success)' }}>
              <div className="row between wrap">
                <div className="row"><span className="icon-tile round" style={{ background: 'var(--success)', color: 'var(--on-cream)' }}><Icon name="shield-check" size={20} /></span>
                  <div><div className="h4 ok">Verified payment request</div><div className="cap muted">How a genuine request from the property would look</div></div></div>
                <DemoTag />
              </div>
              {requestState === 'open' ? (
                <>
                  <p className="s" style={{ fontSize: 14 }}>Optional airport transfer, ₹1,600. Paid inside the app. Nothing is actually charged in this demo.</p>
                  <div className="row wrap"><button className="btn" onClick={() => setRequestState('accepted')}>Accept (simulated)</button><button className="btn ghost" onClick={() => setRequestState('declined')}>Decline</button></div>
                </>
              ) : <p className="s" role="status">{requestState === 'accepted' ? 'Accepted in this demo. Nothing was charged and your booking is unchanged.' : 'Declined. Your booking is unchanged.'}</p>}
            </section>
          )}
          {!upcoming && !cancelled && <ReviewForm key={b.id} b={b} />}
          {!upcoming && !cancelled && <button className="btn secondary" style={{ alignSelf: 'flex-start' }} onClick={() => nav(`/stays/${b.property.slug}#reviews`)}>View property &amp; reviews</button>}
        </>
      )}

      {tab === 'itinerary' && (
        <section className="card stack md">
          <h3 className="h4" style={{ fontSize: 20 }}>Itinerary</h3>
          <ul className="timeline">
            <li><span className="icon-tile round t-ok"><Icon name="bed" size={18} /></span><div><div className="cap muted">{weekdayDayMonth(b.checkIn)}</div><div className="strong s">Check in at {b.property.name}</div><div className="cap muted">{cancelled ? 'Cancelled' : 'Confirmed'}</div></div></li>
            <li><span className="icon-tile round t-subtle"><Icon name="arrow-right" size={18} /></span><div><div className="cap muted">{weekdayDayMonth(b.checkOut)}</div><div className="strong s">Check out</div></div></li>
          </ul>
          <Link className="btn ai" style={{ alignSelf: 'flex-start' }} to="/planner"><Icon name="sparkle" size={18} />Plan activities (demo planner)</Link>
        </section>
      )}

      {tab === 'documents' && (
        <section className="card stack md">
          <h3 className="h4" style={{ fontSize: 20 }}>Documents</h3>
          <div className="row wrap">
            <Link className="btn secondary" to={`/bookings/${b.id}/confirmation`}><Icon name="external" size={18} />View confirmation</Link>
            <button className="btn secondary" onClick={() => downloadIcs(b)}><Icon name="calendar" size={18} />Add to calendar</button>
          </div>
        </section>
      )}
    </div>
  );
}

export function TripsPage() {
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useState<Scope>('upcoming');
  const lists = {
    upcoming: useQuery({ queryKey: ['bookings', 'upcoming'], queryFn: () => api.bookings('upcoming') }),
    past: useQuery({ queryKey: ['bookings', 'past'], queryFn: () => api.bookings('past') }),
    cancelled: useQuery({ queryKey: ['bookings', 'cancelled'], queryFn: () => api.bookings('cancelled') }),
  };
  const items = lists[scope].data?.data ?? [];
  const wanted = params.get('b');
  const deepLinked = useQuery({ queryKey: ['booking', wanted], enabled: !!wanted, queryFn: () => api.booking(wanted!) });
  const selected = items.find((b) => b.id === wanted) ?? (wanted ? deepLinked.data : undefined) ?? items[0];

  return (
    <div className="page trips-layout">
      <aside>
        <h1 className="h1" style={{ marginBottom: 12 }}>My trips</h1>
        <div className="chips" style={{ marginBottom: 16 }}>
          {(['upcoming', 'past', 'cancelled'] as const).map((s) => (
            <button key={s} className="chip" aria-pressed={scope === s} onClick={() => { setScope(s); setParams({}, { replace: true }); }}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({lists[s].data?.meta.total ?? '…'})
            </button>
          ))}
        </div>
        {lists[scope].error && <ErrorNote error={lists[scope].error} retry={() => lists[scope].refetch()} />}
        {lists[scope].isLoading && <Skeleton height={90} />}
        {items.map((b) => (
          <button key={b.id} className={`trip-item${selected?.id === b.id ? ' on' : ''}`} onClick={() => setParams({ b: b.id }, { replace: true })}>
            {b.property.imageUrl && <img src={b.property.imageUrl} alt="" />}
            <span className="stack" style={{ gap: 2, minWidth: 0 }}>
              <span className="strong">{b.property.destination}</span>
              <span className="s muted">{scope === 'upcoming' ? `${dateRange(b.checkIn, b.checkOut)} · in ${plural(Math.max(0, daysFromToday(b.checkIn)), 'day')}` : monthYear(b.checkIn)}</span>
              {scope === 'upcoming' ? <span className="badge ok" style={{ width: 'fit-content' }}><Icon name="check" size={14} />Confirmed</span> : <span className={`s ${scope === 'cancelled' ? 'bad' : 'link'}`}>{scope === 'cancelled' ? 'Cancelled' : 'Completed'}</span>}
            </span>
          </button>
        ))}
      </aside>
      {selected ? <TripDetail key={selected.id} b={selected} onRebooked={(fresh) => setParams({ b: fresh.id }, { replace: true })} /> : lists[scope].isSuccess && (
        <Empty icon="briefcase" title={`No ${scope} trips`}><Link className="btn" to={`/search?${stayToParams({ destination: 'Goa', checkIn: addDays(new Date().toISOString().slice(0, 10), 34), checkOut: addDays(new Date().toISOString().slice(0, 10), 37), adults: 2, children: 0, rooms: 1 })}`}>Find a stay</Link></Empty>
      )}
    </div>
  );
}
