import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DemoTag, Icon } from '../components/ui';
import type { IconName } from '../components/icons';

// Answers mirror the server's actual rules (see README "Business rules"), not aspirations.
const FAQ: { topic: string; icon: IconName; items: [string, string][] }[] = [
  {
    topic: 'Booking', icon: 'calendar', items: [
      ['Is the price I see the price I pay?', 'Yes. Every price shown includes 12% GST, and the total is calculated on our server when you book. It’s stored with your booking, so later rate changes never affect it.'],
      ['How do I know a room is really available?', 'Rooms are counted night by night. When you confirm, the room is locked while we check it, so two people can’t book the last room at the same time.'],
      ['Can I book several rooms?', 'Yes. Choose the number of rooms in the guests picker before you search. They go on one booking.'],
      ['Is payment taken?', 'Not in this prototype. Your booking is confirmed and saved, but no card is charged.'],
    ],
  },
  {
    topic: 'Changes and cancellation', icon: 'x', items: [
      ['How do I cancel?', 'Open My trips, choose the booking and select Cancel for free. The room goes straight back on sale.'],
      ['Until when can I cancel for free?', 'Flexible rates can be cancelled any time before the check-in date. Non-refundable rates can’t be cancelled once booked.'],
      ['Can I change my dates?', 'Book the new dates first, then cancel the old booking while it’s still free to cancel. If the price has dropped for your exact room and dates, My trips offers a one-tap rebook.'],
    ],
  },
  {
    topic: 'Reviews', icon: 'star', items: [
      ['Who can leave a review?', 'Only guests who completed a stay at the property. You can write it from My trips once your check-out date has passed.'],
      ['Can I review a property twice?', 'No, one review per guest per property, so scores can’t be stuffed.'],
    ],
  },
  {
    topic: 'Your account', icon: 'user', items: [
      ['How do I save a stay for later?', 'Tap the heart on any stay. Your saved stays sync to your account.'],
      ['How do I change my password?', 'Go to Account. You’ll need your current password to set a new one.'],
    ],
  },
];

export function HelpPage() {
  const [open, setOpen] = useState<string | null>(FAQ[0]!.items[0]![0]);
  return (
    <div className="page" style={{ paddingTop: 24, maxWidth: 880 }}>
      <div className="stack">
        <div className="over">Help centre</div>
        <h1 className="d-l">How can we help?</h1>
        <p className="body-l">Straight answers about prices, cancellations and reviews.</p>
      </div>
      <div className="stack lg section">
        {FAQ.map((g) => (
          <section key={g.topic} className="stack md">
            <h2 className="h3 row" style={{ gap: 12 }}><span className="icon-tile sm t-action"><Icon name={g.icon} size={18} /></span>{g.topic}</h2>
            <div className="card faq">
              {g.items.map(([q, a]) => {
                const isOpen = open === q;
                return (
                  <div key={q} className="faq-item">
                    <button className="faq-q" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : q)}>
                      <span className="grow">{q}</span><Icon name="chevron-down" size={18} className={isOpen ? 'flip' : undefined} />
                    </button>
                    {isOpen && <p className="faq-a muted">{a}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <section className="card row wrap section" style={{ gap: 16 }}>
        <span className="icon-tile t-action"><Icon name="message" /></span>
        <div className="grow" style={{ minWidth: 220 }}>
          <div className="h4">Still stuck?</div>
          <p className="s muted">There’s no support team behind this prototype, but your trips page has every booking detail.</p>
        </div>
        <Link className="btn secondary" to="/trips">Go to My trips</Link>
      </section>
    </div>
  );
}

const REAL = ['Search, filters and sorting', 'Live, night-by-night availability', 'All-in pricing with GST, calculated on the server', 'Bookings that can’t overbook', 'Cancellation and price-drop rebooking', 'Reviews from completed stays', 'Accounts, saved stays and host applications'];
const DEMO = ['AI trip planner (rule-based)', 'Messages and Scam Shield', 'Verified badges and trust scores', 'Payment', 'Map (an illustration with real coordinates)'];

export function AboutPage() {
  return (
    <div className="page" style={{ paddingTop: 24, maxWidth: 960 }}>
      <div className="stack" style={{ maxWidth: 680 }}>
        <div className="over">About</div>
        <h1 className="d-l">A booking site that tells the truth about price and availability.</h1>
        <p className="body-l">This is a hackathon prototype of a travel platform focused on India. It’s built to show what booking feels like when the number you see is the number you pay, and “available” really means available.</p>
      </div>
      <div className="grid-2 section">
        <section className="card stack md">
          <h2 className="h3 row" style={{ gap: 10 }}><Icon name="check" className="ok" />Real, end to end</h2>
          <ul className="stack">{REAL.map((r) => <li key={r} className="row s" style={{ fontSize: 14 }}><Icon name="check" size={16} className="ok" />{r}</li>)}</ul>
        </section>
        <section className="card stack md">
          <h2 className="h3 row wrap" style={{ gap: 10 }}>Simulated for the demo <DemoTag label="Demo" /></h2>
          <ul className="stack">{DEMO.map((r) => <li key={r} className="row s muted" style={{ fontSize: 14 }}><Icon name="info" size={16} />{r}</li>)}</ul>
        </section>
      </div>
      <section className="card stack section">
        <h2 className="h4">Photos</h2>
        <p className="s muted">Destination and property photos are from <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a>, used under the Unsplash License. All property names are fictional.</p>
      </section>
    </div>
  );
}
