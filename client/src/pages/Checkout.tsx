import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { stayHref } from '../components/Cards';
import { cancellationText, DemoTag, ErrorNote, Icon, NoPaymentNote, PriceBreakdown, Rating, Skeleton } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { dayMonth, lastFreeCancelDay, money, plural, ratingWord, weekdayDayMonth } from '../lib/format';
import { useAuth } from '../lib/session';
import { rateLabel, splitRoomName, stayFromParams, stayToParams } from '../lib/stay';
import { Steps } from './Rooms';

const REQUESTS = ['Early check-in', 'Honeymoon setup', 'Ground floor', 'Airport pickup'];
const METHODS = ['UPI', 'Card', 'Netbanking', 'Wallets'];
const HOLD_SECONDS = 600;

/**
 * The design promises a 10-minute hold. The backend has no holds: rooms are only reserved when
 * the booking is created, under a row lock. So this timer is labelled as a demo, and availability
 * is rechecked live while you fill in the form.
 */
function useDemoTimer() {
  const [left, setLeft] = useState(HOLD_SECONDS);
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  return `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
}

export function CheckoutPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const roomId = params.get('roomId') ?? '';
  const stay = stayFromParams(params);
  const { user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const timer = useDemoTimer();

  const [first, setFirst] = useState(user?.firstName ?? '');
  const [last, setLast] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [forOther, setForOther] = useState(false);
  const [requests, setRequests] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [payLater, setPayLater] = useState(true);
  const [method, setMethod] = useState('Card');
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState(false);

  const property = useQuery({ queryKey: ['property', slug], queryFn: () => api.property(slug) });
  const avail = useQuery({
    queryKey: ['availability', property.data?.id, stay.checkIn, stay.checkOut, stay.adults, stay.children, stay.rooms],
    enabled: !!property.data,
    queryFn: () => api.availability({ propertyId: property.data!.id, checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults, children: stay.children, rooms: stay.rooms }),
    refetchInterval: 15_000,
  });
  const room = avail.data?.find((r) => r.id === roomId);
  const stillOpen = room?.available ?? false;

  const book = useMutation({
    mutationFn: () => api.createBooking({
      roomId, checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults, children: stay.children, rooms: stay.rooms,
      guest: { firstName: first, lastName: last, email, phone: phone || undefined },
      specialRequests: [...requests, notes.trim()].filter(Boolean).join('; ') || undefined,
    }),
    onSuccess: (booking) => {
      qc.invalidateQueries({ queryKey: ['availability'] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      nav(`/bookings/${booking.id}/confirmation`, { replace: true });
    },
    onError: () => qc.invalidateQueries({ queryKey: ['availability'] }),
  });

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const valid = first.trim() && last.trim() && validEmail && agreed;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (valid && stillOpen && !book.isPending) book.mutate();
  };
  const toggleForOther = (on: boolean) => {
    setForOther(on);
    setFirst(on ? '' : user?.firstName ?? '');
    setLast(on ? '' : user?.lastName ?? '');
  };

  if (property.error) return <div className="page" style={{ paddingTop: 32 }}><ErrorNote error={property.error} /></div>;
  if (!property.data || avail.isLoading) return <div className="page stack md" style={{ paddingTop: 32 }}><Skeleton height={300} /></div>;
  if (avail.error) return <div className="page" style={{ paddingTop: 32 }}><ErrorNote error={avail.error} retry={() => avail.refetch()} /></div>;
  if (!room) return <div className="page" style={{ paddingTop: 32 }}><ErrorNote error={new Error('That room isn’t available at this property.')} /><Link className="btn" style={{ marginTop: 16 }} to={stayHref(slug, stay, '/rooms')}>Choose a room</Link></div>;

  const conflict = book.error instanceof ApiError && book.error.status === 409;
  const quote = room.quote;
  const category = splitRoomName(room.name).category;

  return (
    <>
      <div className="flow-head">
        <div className="page">
          <Link to={`/stays/${slug}/rooms?${stayToParams(stay)}`} className="row strong s"><Icon name="chevron-left" size={18} />Change room</Link>
          <Steps current={2} />
          <span className="badge tint" title="Countdown only. Rooms are not actually held until you confirm."><Icon name="clock" size={16} />Hold timer {timer} (demo)</span>
        </div>
      </div>
      <form className="page split" style={{ paddingTop: 28 }} onSubmit={submit} noValidate>
        <div className="stack md" style={{ minWidth: 0 }}>
          <h1 className="h1">Almost done{user ? `, ${user.firstName}` : ''}</h1>

          {!stillOpen && (
            <div className="note bad" role="alert">
              <Icon name="alert" size={18} />
              <span className="grow">This room is no longer available for your dates. Nothing has been booked.</span>
              <Link className="btn secondary" to={`/stays/${slug}/rooms?${stayToParams(stay)}`}>Pick another room</Link>
            </div>
          )}

          <section className="card stack md">
            <div className="row between wrap"><h2 className="h3" style={{ fontSize: 20 }}>Who’s checking in?</h2><span className="badge tint"><Icon name="info" size={16} />Pre-filled from your account</span></div>
            <div className="grid-2">
              <label className="field">First name
                <span className={`input${touched && !first.trim() ? ' invalid' : ''}`}><Icon name="user" /><input value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" required /></span>
                {touched && !first.trim() && <span className="field-err">First name is required</span>}
              </label>
              <label className="field">Last name
                <span className={`input${touched && !last.trim() ? ' invalid' : ''}`}><Icon name="user" /><input value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" required /></span>
                {touched && !last.trim() && <span className="field-err">Last name is required</span>}
              </label>
              <label className="field">Email
                <span className={`input${touched && !validEmail ? ' invalid' : ''}`}><Icon name="message" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></span>
                {touched && !validEmail && <span className="field-err">Enter a valid email address</span>}
              </label>
              <label className="field">Mobile (optional)
                <span className="input"><Icon name="phone" /><input type="tel" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></span>
              </label>
            </div>
            <label className="row s" style={{ fontSize: 14, cursor: 'pointer' }}><input className="toggle" type="checkbox" checked={forOther} onChange={(e) => toggleForOther(e.target.checked)} />I’m booking for someone else</label>
            <div className="stack">
              <div className="strong s">Special requests (optional)</div>
              <div className="chips">{REQUESTS.map((r) => <button type="button" key={r} className="chip" aria-pressed={requests.includes(r)} onClick={() => setRequests((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]))}>{r}</button>)}</div>
              <label className="field"><span className="sr-only">Other requests</span><span className="input"><input value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else the property should know?" /></span></label>
            </div>
          </section>

          <section className="card stack md">
            <div className="row between wrap"><h2 className="h3" style={{ fontSize: 20 }}>How would you like to pay?</h2><DemoTag label="Payment simulated" title="No payment provider is connected." /></div>
            <NoPaymentNote />
            <button type="button" role="radio" aria-checked={payLater} className={`option${payLater ? ' selected' : ''}`} onClick={() => setPayLater(true)}>
              <span className={`radio-dot${payLater ? ' on' : ''}`} />
              <span><span className="strong" style={{ fontSize: 16 }}>Pay nothing today</span><br /><span className="s muted">In the real product, you’d pay later{room.refundable ? `, after free cancellation ends on ${dayMonth(lastFreeCancelDay(stay.checkIn))}` : ''}.</span></span>
            </button>
            <button type="button" role="radio" aria-checked={!payLater} className={`option${!payLater ? ' selected' : ''}`} onClick={() => setPayLater(false)}>
              <span className={`radio-dot${!payLater ? ' on' : ''}`} />
              <span><span className="strong" style={{ fontSize: 16 }}>Pay now</span><br /><span className="s muted">Same price, settled today in the real product.</span></span>
            </button>
            <div className="chips">{METHODS.map((m) => <button type="button" key={m} className="chip" aria-pressed={method === m} onClick={() => setMethod(m)}>{m}</button>)}</div>
            <div className="tile stack">
              <div className="row s muted"><Icon name="lock" size={16} />Fields are locked to sample values. Never enter real payment details in this prototype.</div>
              <div className="input disabled" aria-label={`${method} sample details`}><Icon name="card" />
                {method === 'Card' ? '•••• •••• •••• 4242 · 08/29 · •••' : method === 'UPI' ? 'sample@upi' : method === 'Netbanking' ? 'Sample Bank' : 'Sample Wallet'}
              </div>
            </div>
          </section>

          <section className="card stack md">
            <div className={`row s ${room.refundable ? 'ok' : ''}`} style={{ fontSize: 14 }}><Icon name={room.refundable ? 'check' : 'x'} size={18} />{cancellationText(room.refundable, stay.checkIn)}</div>
            <label className="check">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              I agree to the booking conditions and privacy statement
            </label>
            {touched && !agreed && <span className="field-err">Please accept the booking conditions to continue</span>}
          </section>

          {book.error && stillOpen && (
            <div className="stack">
              <ErrorNote error={book.error} />
              {conflict && <Link className="btn secondary" to={`/stays/${slug}/rooms?${stayToParams(stay)}`}>Choose a different room</Link>}
            </div>
          )}

          <button className="btn lg block" type="submit" disabled={book.isPending || !stillOpen}>
            <Icon name="lock" />{book.isPending ? 'Confirming…' : `Confirm booking · ${money(quote.total, quote.currency)}, no payment taken`}
          </button>
        </div>

        <aside className="stack md sticky">
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {property.data.imageUrl && <img src={property.data.imageUrl} alt={property.data.imageAlt} style={{ height: 150, width: '100%', objectFit: 'cover' }} />}
            <div className="stack" style={{ padding: 20 }}>
              <h2 className="h4" style={{ fontSize: 20 }}>{property.data.name}</h2>
              <div className="row s strong">{ratingWord(property.data.ratingAvg)} <Rating value={property.data.ratingAvg} /></div>
              <div className="grid-2" style={{ gap: 8, gridTemplateColumns: '1fr 1fr' }}>
                <div className="tile"><div className="cap muted">Check-in</div><div className="s strong">{weekdayDayMonth(stay.checkIn)}</div></div>
                <div className="tile"><div className="cap muted">Check-out</div><div className="s strong">{weekdayDayMonth(stay.checkOut)}</div></div>
              </div>
              <div className="s muted">{category} · {rateLabel(room)} · {plural(stay.adults, 'adult')}</div>
            </div>
          </section>
          <PriceBreakdown label={category} quote={quote} />
        </aside>
      </form>
    </>
  );
}
