import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { VerifiedBadge } from '../components/Cards';
import { DemoTag, ErrorNote, Icon, Skeleton } from '../components/ui';
import { demoFlight, hasDemoTrust } from '../demo/fixtures';
import { api, type Booking } from '../lib/api';
import { dayMonth, lastFreeCancelDay, money, plural, weekdayDayMonth } from '../lib/format';
import { rateLabel, splitRoomName } from '../lib/stay';

const escapeIcs = (s: string) => s.replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');

export function bookingIcs(b: Booking) {
  const d = (iso: string) => iso.replace(/-/g, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Booking prototype//EN', 'BEGIN:VEVENT',
    `UID:${b.id}@booking-prototype.example`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d(b.checkIn)}`,
    `DTEND;VALUE=DATE:${d(b.checkOut)}`,
    `SUMMARY:${escapeIcs(`Stay at ${b.property.name}`)}`,
    `LOCATION:${escapeIcs(b.property.address)}`,
    `DESCRIPTION:${escapeIcs(`Booking ${b.reference}`)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(b: Booking) {
  const url = URL.createObjectURL(new Blob([bookingIcs(b)], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${b.reference}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ConfirmationPage() {
  const { id = '' } = useParams();
  const q = useQuery({ queryKey: ['booking', id], queryFn: () => api.booking(id) });
  if (q.error) return <div className="page" style={{ paddingTop: 32 }}><ErrorNote error={q.error} retry={() => q.refetch()} /></div>;
  const b = q.data;
  if (!b) return <div className="page" style={{ paddingTop: 32 }}><Skeleton height={300} /></div>;
  const room = splitRoomName(b.room.name);
  const c = b.price.currency;
  return (
    <>
      <section className="conf-hero">
        <div className="page row between wrap" style={{ gap: 24 }}>
          <div className="row wrap" style={{ gap: 24 }}>
            <span className="conf-check"><Icon name="check" size={36} /></span>
            <div>
              <h1 className="h1">You’re going to {b.property.destination}, {b.guest.firstName}!</h1>
              <p className="muted body-l">Booking {b.reference} is confirmed and saved.</p>
              <p className="s ok row" style={{ marginTop: 4 }}><Icon name="shield-check" size={16} />Your room is reserved. Availability has been updated for other guests.</p>
            </div>
          </div>
          <div className="row wrap no-print">
            <button className="btn secondary" onClick={() => downloadIcs(b)}><Icon name="calendar" size={18} />Add to calendar</button>
            <button className="btn secondary" onClick={() => window.print()}><Icon name="download" size={18} />Download</button>
          </div>
        </div>
      </section>

      <div className="page split" style={{ paddingTop: 32 }}>
        <div className="stack md" style={{ minWidth: 0 }}>
          <section className="card stack md" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="room-head" style={{ padding: 20 }}>
              {b.property.imageUrl && <div className="room-img"><img className="scene" src={b.property.imageUrl} alt="" /></div>}
              <div className="stack">
                <div className="row between wrap"><h2 className="h3">{b.property.name}</h2>{hasDemoTrust(b.property.destination) && <VerifiedBadge />}</div>
                <div className="s muted">{b.property.address}</div>
                <div className="grid-4x">
                  <div className="tile"><div className="cap muted">Check-in</div><div className="s strong">{weekdayDayMonth(b.checkIn)}</div></div>
                  <div className="tile"><div className="cap muted">Check-out</div><div className="s strong">{weekdayDayMonth(b.checkOut)}</div></div>
                  <div className="tile"><div className="cap muted">Guests</div><div className="s strong">{plural(b.adults, 'adult')}{b.children ? `, ${plural(b.children, 'child', 'children')}` : ''}</div></div>
                  <div className="tile"><div className="cap muted">Room</div><div className="s strong">{room.category} · {rateLabel(b.room)}</div></div>
                </div>
              </div>
            </div>
            <div className="row between wrap" style={{ padding: '16px 20px', background: 'var(--bg-subtle)' }}>
              <div>
                <div className="strong s">Total {money(b.price.total, c)} · no payment taken <DemoTag label="Prototype" /></div>
                <div className={`cap ${b.room.refundable ? 'ok' : 'muted'}`}>{b.room.refundable ? `Free cancellation until ${dayMonth(lastFreeCancelDay(b.checkIn))}` : 'Non-refundable'} · taxes included</div>
              </div>
              <Link className="btn no-print" to={`/trips?b=${b.id}`}><Icon name="edit" size={18} />Manage booking</Link>
            </div>
          </section>

          <section className="card stack md">
            <h2 className="h3" style={{ fontSize: 20 }}>What happens next</h2>
            <ul className="timeline">
              <li><span className="icon-tile round t-ok"><Icon name="check" size={18} /></span><div><div className="cap muted">Today</div><div className="strong s">Your booking is saved</div><div className="cap muted">Find it any time under My trips. This prototype doesn’t send email.</div></div></li>
              {b.room.refundable && <li><span className="icon-tile round t-action"><Icon name="calendar" size={18} /></span><div><div className="cap muted">{dayMonth(lastFreeCancelDay(b.checkIn))}</div><div className="strong s">Last day to cancel for free</div></div></li>}
              <li><span className="icon-tile round t-subtle"><Icon name="bed" size={18} /></span><div><div className="cap muted">{dayMonth(b.checkIn)}</div><div className="strong s">Check in with reference {b.reference}</div></div></li>
              <li><span className="icon-tile round t-subtle"><Icon name="arrow-right" size={18} /></span><div><div className="cap muted">{dayMonth(b.checkOut)}</div><div className="strong s">Check out, then leave a review</div></div></li>
            </ul>
          </section>
        </div>

        <aside className="stack md no-print">
          <section className="card ai-card stack md">
            <h2 className="row h4 ai"><span className="icon-tile sm t-ai"><Icon name="sparkle" size={18} /></span>Keep planning <DemoTag label="Demo planner" /></h2>
            <p className="s">Flights are still open in your plan. Sample fare: {demoFlight.time} {demoFlight.carrier} at {money(demoFlight.pricePerPerson)} per person.</p>
            <Link className="btn ai" to="/planner"><Icon name="sparkle" size={18} />Open trip planner</Link>
          </section>
          <section className="card stack md" style={{ borderColor: 'var(--danger)' }}>
            <h2 className="row h4 bad"><Icon name="shield-alert" size={22} />Stay scam-safe</h2>
            <ul className="stack s">
              <li className="row top"><Icon name="check" size={16} className="bad" />Never pay by bank transfer or through an outside link.</li>
              <li className="row top"><Icon name="check" size={16} className="bad" />Be wary of urgent payment demands, even if they look official.</li>
            </ul>
            <Link to="/messages" className="s">See how Scam Shield would work (demo) →</Link>
          </section>
        </aside>
      </div>
    </>
  );
}
