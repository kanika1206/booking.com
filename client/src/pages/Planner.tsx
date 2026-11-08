import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GridCard, stayHref } from '../components/Cards';
import { MapBackground, project } from '../components/MapCanvas';
import { DemoTag, ErrorNote, Icon, Skeleton } from '../components/ui';
import { demoFlight } from '../demo/fixtures';
import { DEMO_ACTIVITIES_MINOR, defaultPlan, itinerary, parsePrompt, type Plan } from '../demo/planner';
import { api, type SearchResult } from '../lib/api';
import { addDays, dateRange, money, nightsBetween, plural, weekdayDayMonth } from '../lib/format';
import { readStore, writeStore } from '../lib/session';
import { groupLookalikes, type Stay } from '../lib/stay';

type Bubble = { who: 'me' | 'ai'; text: string; chips?: boolean };
const AiAvatar = () => <span className="avatar ai" style={{ width: 32, height: 32 }}><Icon name="sparkle" size={18} /></span>;

/** Rupees per night all-in, converted to the API's pre-tax minor units. */
const toApiMax = (rupees: number) => Math.round((rupees * 100) / 1.12);

export function PlannerPage() {
  const [params, setParams] = useSearchParams();
  const [plan, setPlan] = useState<Plan>(() => readStore<Plan>('tripPlan') ?? defaultPlan());
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'itinerary' | 'stays' | 'map' | 'flights'>('itinerary');
  const started = useRef(false);

  const nights = nightsBetween(plan.checkIn, plan.checkOut);
  const amenities = plan.wants.flatMap((w) => (w.amenity ? [w.amenity] : [])).join(',');
  const stays = useQuery({
    queryKey: ['planner', plan.destination, plan.checkIn, plan.checkOut, plan.adults, plan.children, plan.budgetPerNight, amenities],
    queryFn: () => api.search({
      destination: plan.destination, checkIn: plan.checkIn, checkOut: plan.checkOut, adults: plan.adults, children: plan.children,
      amenities: amenities || undefined, maxPrice: plan.budgetPerNight ? toApiMax(plan.budgetPerNight) : undefined, limit: 50,
    }),
  });
  const shortlist: SearchResult[] = groupLookalikes(stays.data?.data ?? []).map((g) => g.lead).slice(0, 3);
  const best = shortlist[0];
  const stay: Stay = { destination: plan.destination, checkIn: plan.checkIn, checkOut: plan.checkOut, adults: plan.adults, children: plan.children, rooms: 1 };

  const flightCost = plan.flightAdded ? demoFlight.pricePerPerson * plan.adults : 0;
  const estimate = (best?.quote?.total ?? 0) + flightCost + DEMO_ACTIVITIES_MINOR;
  const budget = plan.budgetPerNight ? plan.budgetPerNight * 100 * nights + 2000000 : null;

  useEffect(() => { writeStore('tripPlan', plan); }, [plan]);

  const say = (mine: string, reply: string, chips = false) =>
    setBubbles((b) => [...b, { who: 'me', text: mine }, { who: 'ai', text: reply, chips }]);

  const send = (value: string) => {
    if (!value.trim()) return;
    setPlan((p) => parsePrompt(value, p));
    say(value, 'Here’s what I understood. Tap a suggestion or type a change. Stays below come from live search.', true);
    setText('');
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const q = params.get('q');
    if (q) {
      setPlan(() => parsePrompt(q, defaultPlan()));
      say(q, 'Here’s what I understood. Tap a suggestion or type a change. Stays below come from live search.', true);
      setParams({}, { replace: true });
    } else {
      setBubbles([{ who: 'ai', text: 'Tell me where you’d like to go, your dates, party and budget. For example: “3 nights in Goa for two, quiet beach, pool, under ₹9k a night”.' }]);
    }
  }, [params, setParams]);

  const actions: { label: string; run: () => void }[] = [
    { label: plan.flightAdded ? 'Remove the flight' : `Add the ${demoFlight.time} flight`, run: () => {
      const added = !plan.flightAdded;
      setPlan((p) => ({ ...p, flightAdded: added }));
      say(added ? `Add the ${demoFlight.time} flight` : 'Remove the flight', added ? 'Added to your estimate only. Flights can’t be booked in this prototype.' : 'Removed from your estimate.');
    } },
    { label: 'Show cheaper stays', run: () => {
      const cheapest = best ? Math.round((best.quote?.nightlyPrice ?? best.startingPrice ?? 0) * 1.12 / 100) : 9000;
      setPlan((p) => ({ ...p, budgetPerNight: Math.max(1000, Math.floor(cheapest * 0.8)) }));
      say('Show cheaper stays', 'I lowered your nightly budget by 20% and searched again.');
    } },
    { label: plan.spaDay ? 'Restore Day 2' : 'Swap Day 2 for spa', run: () => {
      const spa = !plan.spaDay;
      setPlan((p) => ({ ...p, spaDay: spa }));
      say(spa ? 'Swap Day 2 for spa' : 'Restore Day 2', 'Your itinerary is updated.');
    } },
    { label: `Make it ${nights + 1} nights`, run: () => {
      setPlan((p) => ({ ...p, checkOut: addDays(p.checkOut, 1) }));
      say(`Make it ${nights + 1} nights`, 'Done. Prices and availability were rechecked for the new dates.');
    } },
  ];

  const reset = () => {
    const fresh = defaultPlan();
    setPlan(fresh);
    setBubbles([{ who: 'ai', text: 'New trip started. Where would you like to go?' }]);
  };

  const days = itinerary(plan, nights);
  const place = shortlist.length ? project(shortlist) : null;

  return (
    <div className="planner">
      <aside className="plan-chat">
        <div className="row between" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <div className="row"><span className="icon-tile sm t-ai" style={{ width: 36, height: 36 }}><Icon name="sparkle" size={20} /></span>
            <div><div className="strong">Trip Planner</div><div className="s ai">Rule-based demo · uses live prices</div></div>
          </div>
          <button className="btn ghost" onClick={reset}><Icon name="plus" size={18} />New trip</button>
        </div>
        <div className="plan-scroll" aria-live="polite">
          <div className="note plain"><Icon name="info" size={18} /><span><DemoTag label="Demo planner" /> No AI model is connected. This reads your text with simple rules and uses template itineraries. Stay prices and availability are real.</span></div>
          {bubbles.map((b, i) => b.who === 'me' ? (
            <div key={i} className="bubble me">{b.text}</div>
          ) : (
            <div key={i} className="stack">
              <div className="bubble-row"><AiAvatar /><div className="bubble"><div className="s ai">Booking AI (demo)</div>{b.text}</div></div>
              {b.chips && (
                <div className="chips" style={{ marginLeft: 44 }}>
                  <span className="chip on"><Icon name="sparkle" size={14} />{plan.destination}</span>
                  <span className="chip on">{dateRange(plan.checkIn, plan.checkOut)} · {plural(nights, 'night')}</span>
                  <span className="chip on">{plural(plan.adults, 'adult')}</span>
                  {plan.wants.map((w) => <span key={w.key} className="chip on">{w.label}</span>)}
                  {plan.budgetPerNight && <span className="chip on">≤ {money(plan.budgetPerNight * 100)} / night</span>}
                  {plan.from && <span className="chip on">From {plan.from}</span>}
                </div>
              )}
            </div>
          ))}
          <div className="chips" style={{ marginLeft: 44 }}>
            {actions.map((a) => <button key={a.label} className="chip" onClick={a.run}><Icon name="sparkle" size={14} />{a.label}</button>)}
          </div>
        </div>
        <div style={{ padding: '12px 24px 16px' }}>
          <form className="compose" onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <label className="sr-only" htmlFor="plan-input">Ask the planner</label>
            <input id="plan-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Try: “Make it 5 nights, under ₹6k”" />
            <button className="send" aria-label="Send" disabled={!text.trim()}><Icon name="send" size={20} /></button>
          </form>
          <p className="cap muted row" style={{ marginTop: 8 }}><Icon name="info" size={14} />Prices and rooms are rechecked live before you book.</p>
        </div>
      </aside>

      <div className="plan-main stack lg">
        <div className="row between wrap top">
          <div>
            <div className="over ai">Your trip · draft</div>
            <h1 className="h1">{plan.destination}, {dateRange(plan.checkIn, plan.checkOut)} · {plural(plan.adults, 'adult')}</h1>
          </div>
          <div className="card tight" style={{ minWidth: 300 }}>
            <div className="row between s"><span className="muted row">Estimated total <DemoTag label="Estimate" title="Stay total is real. Activities and flights are sample figures." /></span>
              <span className="strong" style={{ fontSize: 15 }}>{money(estimate)}{budget ? ` / ${money(budget)}` : ''}</span></div>
            {budget && <div className="bar" style={{ margin: '10px 0 6px' }}><i style={{ width: `${Math.min(100, (estimate / budget) * 100)}%`, background: estimate > budget ? 'var(--danger)' : 'var(--success)' }} /></div>}
            {budget && <div className={`cap ${estimate > budget ? 'bad' : 'ok'}`}>{estimate > budget ? `${money(estimate - budget)} over budget` : `${money(budget - estimate)} left for food & activities`}</div>}
          </div>
        </div>

        <div className="chips" role="tablist">
          {([['itinerary', 'Itinerary'], ['stays', `Stays (${shortlist.length})`], ['map', 'Map'], ['flights', 'Flights']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} aria-pressed={tab === k} className="chip" onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'itinerary' && (
          <div className="day-grid">
            {days.map((d, i) => (
              <div className="card tight stack md" key={i}>
                <div><div className="s muted">{weekdayDayMonth(addDays(plan.checkIn, i))}</div><h3 className="h4">{d.title}</h3></div>
                {d.items.map((it) => (
                  <div className="row top" key={it.time + it.title}>
                    <span className="icon-tile round t-subtle"><Icon name={it.icon} size={18} /></span>
                    <div><div className="s strong">{it.time} · {it.title}</div><div className="cap muted">{it.note}</div></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'flights' && (
          <div className="card row wrap between">
            <div className="row"><span className="icon-tile t-action"><Icon name="plane" /></span>
              <div><div className="strong row">{demoFlight.time} · {demoFlight.carrier} {plan.from === 'Delhi' || !plan.from ? demoFlight.route : `${plan.from} → ${plan.destination}`} <DemoTag /></div>
                <div className="s muted">Sample fare {money(demoFlight.pricePerPerson)} per person. Flights can’t be booked here.</div></div>
            </div>
          </div>
        )}

        {tab === 'map' && (
          <div className="map-canvas" style={{ height: 420, borderRadius: 16 }}>
            <div className="map-world">
              <MapBackground seaLabel={plan.destination === 'Goa' ? 'Arabian Sea' : undefined} />
              {place && shortlist.map((p) => {
                const pos = place(p);
                return <Link key={p.id} className="pin" style={{ left: `${pos.left}%`, top: `${pos.top}%`, color: 'inherit' }} to={stayHref(p.slug, stay)}>{p.name}</Link>;
              })}
            </div>
            <div className="map-foot"><DemoTag label="Illustrative map" />Not to scale</div>
          </div>
        )}

        {(tab === 'itinerary' || tab === 'stays') && (
          <section className="stack md">
            <div className="row between wrap">
              <h2 className="h4" style={{ fontSize: 20 }}>Shortlisted stays · {plural(shortlist.length, 'style')}</h2>
              <span className="badge ai"><Icon name="sparkle" size={14} />Grouped for variety, not just price</span>
            </div>
            {stays.error ? <ErrorNote error={stays.error} retry={() => stays.refetch()} /> : stays.isLoading ? <Skeleton height={306} /> : shortlist.length === 0 ? (
              <div className="note warn"><Icon name="alert" size={18} />Nothing in {plan.destination} matches this. Try a higher budget, other dates or fewer must-haves.</div>
            ) : (
              <div className="day-grid">{shortlist.map((p, i) => <GridCard key={p.id} p={p} stay={stay} tag={i === 0 ? 'Best match' : i === 1 ? 'Different style' : 'Another option'} />)}</div>
            )}
          </section>
        )}

        {best && (
          <div className="book-banner">
            <Icon name="shield-check" size={32} className="no-print" />
            <div className="grow">
              <div className="strong">Ready to book {best.name} for {dateRange(plan.checkIn, plan.checkOut)}?</div>
              <div className="s">{best.quote ? `${money(best.quote.total)} all-in. ` : ''}Availability is rechecked when you book. No payment is taken in this prototype.</div>
            </div>
            <Link to={stayHref(best.slug, stay, '/rooms')} className="btn accent lg"><Icon name="arrow-right" />Review stay</Link>
          </div>
        )}
      </div>
    </div>
  );
}
