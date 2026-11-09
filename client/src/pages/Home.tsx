import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GridCard, stayHref } from '../components/Cards';
import { SearchBar } from '../components/SearchBar';
import { DemoTag, ErrorNote, Icon, Skeleton } from '../components/ui';
import type { Plan } from '../demo/planner';
import { api, type PropertyCard } from '../lib/api';
import { dateRange, money, nightsBetween, plural } from '../lib/format';
import { readStore, useAuth } from '../lib/session';
import { defaultStay, stayToParams, type Stay } from '../lib/stay';
import type { IconName } from '../components/icons';

const PERKS: { icon: IconName; text: string }[] = [
  { icon: 'tag', text: 'All-in prices, tax included' },
  { icon: 'sync', text: 'Live room counts, night by night' },
  { icon: 'check', text: 'Free cancellation on flexible rates' },
  { icon: 'trend-down', text: 'Rebook in one tap if the price drops' },
  { icon: 'star', text: 'Reviews only from completed stays' },
];
/** "Fri 14", like the reference's date slips. */
const shortDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })} ${d.getUTCDate()}`;
};
/** Tags come from each stay's real price and rating, so "Splurge" can't land on the cheapest one. */
function styleTags(items: PropertyCard[]) {
  const byPrice = [...items].sort((a, b) => (a.startingPrice ?? 0) - (b.startingPrice ?? 0));
  const cheapest = byPrice[0];
  const priciest = byPrice.length > 1 ? byPrice[byPrice.length - 1] : undefined;
  const rest = byPrice.filter((p) => p !== cheapest && p !== priciest).sort((a, b) => b.ratingAvg - a.ratingAvg);
  const tag = (p: PropertyCard) => (p === priciest ? 'Splurge' : p === cheapest ? 'Lowest price' : p === rest[0] ? 'Top rated' : 'Different style');
  return [...rest, ...(cheapest ? [cheapest] : []), ...(priciest ? [priciest] : [])].map((p) => ({ p, tag: tag(p) }));
}

function PlanBanner() {
  const plan = readStore<Plan>('tripPlan');
  return (
    <div className="card ai-card row wrap" style={{ gap: 20, flex: 1, minWidth: 0 }}>
      <span className="icon-tile t-ai"><Icon name="sparkle" size={24} /></span>
      <div className="grow" style={{ minWidth: 200 }}>
        <div className="h4 row wrap">{plan ? `Your ${plan.destination} plan is saved` : 'Describe your trip, get a plan'} <DemoTag label="Demo planner" /></div>
        <div className="s muted">
          {plan ? `${plural(nightsBetween(plan.checkIn, plan.checkOut), 'night')} · ${dateRange(plan.checkIn, plan.checkOut)} · ${plural(plan.adults, 'adult')}` : 'A rule-based demo that shortlists real stays with real prices.'}
        </div>
      </div>
      <Link className="btn ai" to="/planner"><Icon name="sparkle" size={18} />{plan ? 'Continue planning' : 'Try the planner'}</Link>
    </div>
  );
}

function RecentSearch() {
  const last = readStore<{ stay: Stay; total: number; scene: string | null }>('lastSearch');
  if (!last) return null;
  return (
    <Link to={`/search?${stayToParams(last.stay)}`} className="card row" style={{ color: 'inherit', gap: 16, textDecoration: 'none' }}>
      {last.scene && <img src={last.scene} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />}
      <div className="grow">
        <div className="h4">{last.stay.destination.split(',')[0]} · {dateRange(last.stay.checkIn, last.stay.checkOut)}</div>
        <div className="s muted">{plural(last.stay.adults, 'adult')} · {plural(last.total, 'stay')}</div>
      </div>
      <Icon name="chevron-right" />
    </Link>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'search' | 'describe'>('search');
  const [text, setText] = useState('');
  const stay = defaultStay();
  const destinations = useQuery({ queryKey: ['destinations', 'featured'], queryFn: () => api.destinations({ featured: true }) });
  const featured = useQuery({ queryKey: ['featured'], queryFn: () => api.featured(4) });
  const fromPrices = useQuery({
    queryKey: ['destination-prices', destinations.data?.map((d) => d.slug)],
    enabled: !!destinations.data,
    queryFn: async () => {
      const results = await Promise.all(destinations.data!.map((d) => api.search({ destination: d.name, checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults, limit: 1, sort: 'price_asc' })));
      // All-in per night from a real quote, so the first price shown already includes tax.
      return new Map(destinations.data!.map((d, i) => {
        const quote = results[i]!.data[0]?.quote;
        return [d.slug, quote ? Math.round(quote.total / quote.nights) : null];
      }));
    },
  });
  const picks = styleTags(featured.data ?? []);
  const plan = (q: string) => nav(`/planner?q=${encodeURIComponent(q)}`);
  const slips = (featured.data ?? []).slice(0, 2);
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const [inDay, outDay] = [stay.checkIn, stay.checkOut].map(shortDay);
  return (
    <>
      <section className="hero">
        <div className="page hero-body">
          <aside className="hero-card rise d2" aria-label="Featured stays for your dates">
            <div className="where"><Icon name="map-pin" size={14} />{slips[0] ? `${slips[0].destination.name}, ${slips[0].destination.country}` : 'Featured this week'}</div>
            {featured.isLoading && [0, 1].map((i) => <div key={i} className="stay-slip skeleton" style={{ height: 92 }} />)}
            {slips.map((p) => (
              <Link key={p.id} className="stay-slip" to={stayHref(p.slug, stay)}>
                <div className="row between"><span className="strong s" style={{ fontSize: 14 }}>{p.name}</span><span className="cap muted">{p.ratingAvg.toFixed(2)} rating</span></div>
                <div className="dates">
                  <span><small>Check-in</small><b>{inDay}</b></span>
                  <span className="nights">{plural(nights, 'night')}</span>
                  <span style={{ textAlign: 'right' }}><small>Check-out</small><b>{outDay}</b></span>
                </div>
              </Link>
            ))}
          </aside>
          <div className="hero-title stack md rise">
            <h1 className="d-xl">
              <span className="hide-m">Verified stays across India, priced all-in.</span>
              <span className="show-block-m">Where to next{user ? `, ${user.firstName}` : ''}?</span>
            </h1>
            <p className="body-l hero-lede">Every price includes tax, every room count is live, and every listing is checked before it goes up.</p>
          </div>
        </div>
        <div className="page finder stack md rise d1" id="finder">
          <div className="segment" role="tablist" style={{ width: 'fit-content' }}>
            <button role="tab" aria-selected={mode === 'search'} className={mode === 'search' ? 'on' : ''} onClick={() => setMode('search')}><Icon name="search" size={18} />Search stays</button>
            <button role="tab" aria-selected={mode === 'describe'} className={mode === 'describe' ? 'on' : ''} onClick={() => setMode('describe')}><Icon name="sparkle" size={18} />Describe your trip</button>
          </div>
          {mode === 'search' ? <SearchBar initial={{ ...stay, destination: 'Goa, India' }} /> : (
            <form className="ai-bar" onSubmit={(e) => { e.preventDefault(); if (text.trim()) plan(text); }}>
              <label className="sb-field">
                <Icon name="sparkle" size={24} />
                <span className="grow"><span className="sb-label ai">Describe your trip</span>
                  <input className="sb-value" style={{ border: 0, outline: 0, boxShadow: 'none', width: '100%' }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Quiet beach stay in Goa for 2, pool, under ₹9k a night" />
                </span>
              </label>
              <button className="btn sb-go" type="submit"><Icon name="sparkle" />Plan it</button>
            </form>
          )}
        </div>
        <div className="page">
          <ul className="perks rise d2">
            {PERKS.map((p) => <li key={p.text}><Icon name={p.icon} size={18} />{p.text}</li>)}
          </ul>
        </div>
      </section>

      <div className="page">
        <div className="section row wrap top home-plans" style={{ gap: 20 }}>
          <PlanBanner />
          <div style={{ minWidth: 300 }}><RecentSearch /></div>
        </div>


        <section className="section">
          <div className="over overline-row">Trending</div>
          <h2 className="h2" style={{ marginBottom: 20 }}>Where India is travelling this winter</h2>
          {destinations.error ? <ErrorNote error={destinations.error} retry={() => destinations.refetch()} /> : (
            <div className="grid-4">
              {destinations.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} height={300} />)}
              {destinations.data?.map((d) => {
                const from = fromPrices.data?.get(d.slug);
                return (
                  <Link key={d.id} className="dest" to={`/search?${stayToParams({ ...stay, destination: d.name })}`}>
                    <img className="scene" src={d.imageUrl} alt="" loading="lazy" />
                    <div className="dest-text">
                      <div className="h3">{d.name}</div>
                      <div className="s">{plural(d.propertyCount, 'stay')}{from ? ` · from ${money(from)}` : ''}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="section">
          <div className="over overline-row ai">Picked for you · 4 different styles</div>
          <div className="row between wrap" style={{ marginBottom: 20 }}>
            <h2 className="h2">Not four lookalikes, a real choice</h2>
          </div>
          {featured.error ? <ErrorNote error={featured.error} retry={() => featured.refetch()} /> : (
            <div className="grid-4">
              {featured.isLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} height={306} />)}
              {picks.map(({ p, tag }) => <GridCard key={p.id} p={p} tag={tag} stay={stay} />)}
            </div>
          )}
        </section>

      </div>
    </>
  );
}
