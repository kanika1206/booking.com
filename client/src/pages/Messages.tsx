import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DemoTag, Icon } from '../components/ui';
import { demoReplies, demoThreads, type DemoMessage } from '../demo/fixtures';
import { api } from '../lib/api';
import { dateRange } from '../lib/format';

function BlockedMessage({ m }: { m: Extract<DemoMessage, { kind: 'blocked' }> }) {
  const [reported, setReported] = useState(false);
  return (
    <>
      <div className="bubble-row">
        <span className="avatar t-bad" style={{ width: 32, height: 32 }}>!</span>
        <div className="bubble blocked stack" style={{ gap: 6 }}>
          <div className="s bad">{m.who} · {m.meta}</div>
          <div>{m.text}</div>
          <span className="badge bad" style={{ width: 'fit-content' }}><Icon name="link" size={16} />{m.link} — link disabled</span>
        </div>
      </div>
      <section className="card stack md" style={{ marginLeft: 44, maxWidth: 520, background: 'var(--bg-danger-tint)', borderColor: 'var(--danger)' }} aria-label="Scam Shield warning">
        <div className="row between wrap top">
          <div className="row"><span className="icon-tile round" style={{ background: 'var(--danger)', color: '#fff' }}><Icon name="shield-alert" size={20} /></span>
            <div><div className="h4 bad">Scam Shield blocked a payment request</div><div className="cap muted">From {m.who}</div></div></div>
          <DemoTag label="Sample scam" />
        </div>
        <p className="s" style={{ fontSize: 14 }}>This message asks you to pay {m.amount} by bank transfer through an outside link. Booking.com never asks for payment outside the app.</p>
        <div className="row wrap" style={{ gap: 12 }}>{m.flags.map((f) => <span className="row s bad" key={f}><Icon name="shield-alert" size={16} />{f}</span>)}</div>
        <div className="row wrap">
          <Link className="btn" to="/trips">Check my trip</Link>
          <button className="btn secondary" disabled={reported} onClick={() => setReported(true)}>{reported ? 'Reported (simulated)' : 'Report message'}</button>
        </div>
      </section>
    </>
  );
}

function Bubble({ m, initials }: { m: DemoMessage; initials: string }) {
  if (m.kind === 'me') return <div className="bubble me">{m.text}</div>;
  if (m.kind === 'blocked') return <BlockedMessage m={m} />;
  const ai = m.kind === 'ai';
  return (
    <div className="bubble-row">
      <span className={`avatar${ai ? ' ai' : ''}`} style={{ width: 32, height: 32, fontSize: 12 }}>{ai ? <Icon name="sparkle" size={18} /> : initials}</span>
      <div className="bubble">
        <div className={`s ${ai ? 'ai' : 'muted'}`}>{ai ? 'Booking AI (demo)' : `${m.who} · ${m.meta}`}</div>
        {m.text}
      </div>
    </div>
  );
}

export function MessagesPage() {
  const [threadId, setThreadId] = useState(demoThreads[0]!.id);
  const [added, setAdded] = useState<Record<string, DemoMessage[]>>({});
  const [text, setText] = useState('');
  const thread = demoThreads.find((t) => t.id === threadId)!;
  const messages = [...thread.messages, ...(added[threadId] ?? [])];
  const upcoming = useQuery({ queryKey: ['bookings', 'upcoming'], queryFn: () => api.bookings('upcoming') });
  const booking = upcoming.data?.data[0];

  const send = (value: string) => {
    if (!value.trim()) return;
    const reply = demoReplies[value] ?? 'This is a demo conversation, so your message wasn’t sent to anyone.';
    setAdded((a) => ({ ...a, [threadId]: [...(a[threadId] ?? []), { kind: 'me', text: value }, { kind: 'ai', text: reply }] }));
    setText('');
  };

  return (
    <div className="msg-layout">
      <aside className="msg-list">
        <div className="row between" style={{ marginBottom: 12 }}><h1 className="h3">Messages</h1><DemoTag /></div>
        {demoThreads.map((t) => (
          <button key={t.id} className={`thread-btn${t.id === threadId ? ' on' : ''}`} onClick={() => setThreadId(t.id)}>
            <span className={`avatar${t.tone === 'ai' ? ' ai' : ''}`}>{t.initials}</span>
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="row between"><span className="strong s">{t.name}</span><span className="cap faint">{t.when}</span></span>
              <span className={`s ${t.tone === 'bad' ? 'bad' : 'muted'}`} style={{ display: 'block' }}>{t.preview}</span>
            </span>
          </button>
        ))}
      </aside>

      <section className="msg-main" aria-label={`Conversation with ${thread.name}`}>
        <div className="row between wrap" style={{ padding: '14px 24px', background: '#fff', borderBottom: '1px solid var(--border)' }}>
          <div className="row"><span className={`avatar${thread.tone === 'ai' ? ' ai' : ''}`}>{thread.initials}</span><div><div className="strong">{thread.name}</div><div className="s muted">Sample conversation</div></div></div>
          <span className="badge ai"><Icon name="sparkle" size={14} />Scam Shield (demo)</span>
        </div>
        <div className="note plain" style={{ margin: '12px 32px 0' }}><Icon name="info" size={18} /><span><DemoTag /> There’s no messaging backend. These messages are samples, nothing you send leaves this page, and it resets when you reload.</span></div>
        <div className="msg-scroll" aria-live="polite">
          {messages.map((m, i) => <Bubble key={i} m={m} initials={thread.initials} />)}
        </div>
        <div className="msg-compose stack">
          <div className="chips">
            {Object.keys(demoReplies).map((k) => <button key={k} className="chip" onClick={() => send(k)}><Icon name="sparkle" size={14} />{k}</button>)}
          </div>
          <form className="compose plain" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <label className="sr-only" htmlFor="msg-input">Message</label>
            <input id="msg-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${thread.name}…`} />
            <button className="send blue" aria-label="Send" disabled={!text.trim()}><Icon name="send" size={20} /></button>
          </form>
          <p className="cap muted row"><Icon name="lock" size={14} />Never share card details or pay outside the app.</p>
        </div>
      </section>

      <aside className="msg-side stack md">
        {booking && (
          <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {booking.property.imageUrl && <img src={booking.property.imageUrl} alt="" style={{ height: 120, width: '100%', objectFit: 'cover' }} />}
            <div className="stack" style={{ padding: 16 }}>
              <div className="cap muted">Your next real booking</div>
              <div className="h4">{booking.property.name}</div>
              <div className="s muted">{booking.reference} · {dateRange(booking.checkIn, booking.checkOut)}</div>
              <Link className="s" to={`/trips?b=${booking.id}`}>Manage booking</Link>
            </div>
          </section>
        )}
        <section className="card stack">
          <h2 className="h4 row between">Need a person? <DemoTag label="Not connected" /></h2>
          {([['phone', 'Call us 24/7', 'Not available in this prototype'], ['message', 'Chat with an agent', 'Not available in this prototype'], ['shield-alert', 'Report a scam', 'Not available in this prototype']] as const).map(([icon, title, sub]) => (
            <div key={title} className="tile row"><Icon name={icon} className="brand" /><div><div className="strong s">{title}</div><div className="cap muted">{sub}</div></div></div>
          ))}
        </section>
      </aside>
    </div>
  );
}
