import { useQueries, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FavoriteButton, stayHref, TrustPanel, VerifiedBadge } from '../components/Cards';
import { copyUrl, DemoTag, Empty, ErrorNote, Icon, Rating, Select, Skeleton, Stars, SyncStatus } from '../components/ui';
import { reviewSummaries, trustFor } from '../demo/fixtures';
import { api, ApiError, type PropertyDetail, type RoomAvailability } from '../lib/api';
import { addDays, dayMonth, money, monthYear, plural, ratingWord } from '../lib/format';
import { stayFromParams, stayToParams, type Stay } from '../lib/stay';
import type { IconName } from '../components/icons';

const AMENITY_ICONS: Record<string, IconName> = {
  pool: 'pool', wifi: 'wifi', breakfast: 'coffee', 'airport-shuttle': 'car', parking: 'car', restaurant: 'utensils', bar: 'utensils',
  'family-rooms': 'users', spa: 'heart', beachfront: 'compass', 'pet-friendly': 'heart', kitchen: 'utensils',
};

/** Real availability: one single-night query per day, so sold-out nights are genuinely sold out. */
function AvailabilityCalendar({ property, stay, onPick }: { property: PropertyDetail; stay: Stay; onPick: (iso: string) => void }) {
  const days = Array.from({ length: 12 }, (_, i) => addDays(stay.checkIn, i - 2));
  const today = new Date().toISOString().slice(0, 10);
  const results = useQueries({
    queries: days.map((d) => ({
      queryKey: ['night', property.id, d, stay.adults, stay.children, stay.rooms],
      enabled: d >= today,
      queryFn: () => api.availability({ propertyId: property.id, checkIn: d, checkOut: addDays(d, 1), adults: stay.adults, children: stay.children, rooms: stay.rooms }),
    })),
  });
  return (
    <section className="card stack md" id="availability">
      <div className="row between wrap">
        <div><h2 className="h4" style={{ fontSize: 20 }}>Availability, {monthYear(stay.checkIn)}</h2><p className="s muted">Lowest all-in price per night. Pick a day to move your check-in.</p></div>
        <SyncStatus failed={results.some((r) => r.isError)} />
      </div>
      <div className="cal">
        {days.map((d, i) => {
          const open = (results[i]!.data ?? []).filter((r: RoomAvailability) => r.available);
          const lowest = open.length ? Math.min(...open.map((r: RoomAvailability) => r.quote.total)) : null;
          const edge = d === stay.checkIn || d === stay.checkOut;
          const inside = d > stay.checkIn && d < stay.checkOut;
          const soldOut = d < today || (results[i]!.isSuccess && lowest === null);
          return (
            <button key={d} className={soldOut ? 'out' : edge ? 'edge' : inside ? 'in' : ''} disabled={soldOut} aria-label={`${dayMonth(d)}, ${soldOut ? 'not available' : lowest ? money(lowest) : 'loading'}`} onClick={() => onPick(d)}>
              <b>{Number(d.slice(8))}</b>
              <small>{soldOut ? '—' : lowest ? `₹${(lowest / 100000).toFixed(1)}k` : '…'}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GuestSummary({ property }: { property: PropertyDetail }) {
  const summary = reviewSummaries[property.slug];
  const reviews = useQuery({ queryKey: ['reviews', property.id], queryFn: () => api.reviews(property.id, 3) });
  return (
    <section className="card white-ai stack md" id="reviews">
      <div className="row between wrap top">
        <div className="row">
          <span className="icon-tile sm t-ai"><Icon name="sparkle" size={18} /></span>
          <div><h2 className="h4" style={{ fontSize: 20 }}>What guests say</h2>
            <div className="cap ai">{summary ? 'Sample AI summary' : 'Recent reviews from past guests'}</div></div>
        </div>
        <div className="row"><div style={{ textAlign: 'right' }}><div className="h4" style={{ fontSize: 16 }}>{ratingWord(property.ratingAvg)}</div><div className="cap muted">{plural(property.reviewCount, 'review')}</div></div><Rating value={property.ratingAvg} large /></div>
      </div>
      {summary && (
        <>
          <p className="row wrap"><DemoTag label="Demo summary" title="Written by hand for the demo. Not generated from reviews." /></p>
          <p>{summary.summary}</p>
          <div className="grid-2">
            <div className="tile stack" style={{ background: 'var(--bg-success-tint)' }}><div className="strong ok s">Loved</div>{summary.loved.map((l) => <div className="row s" key={l}><Icon name="check" size={16} className="ok" />{l}</div>)}</div>
            <div className="tile stack" style={{ background: 'var(--bg-warning-tint)' }}><div className="strong warn s">Watch out</div>{summary.watch.map((l) => <div className="row s" key={l}><Icon name="alert" size={16} className="warn" />{l}</div>)}</div>
          </div>
        </>
      )}
      <div className="stack md">
        {reviews.data?.data.map((r) => (
          <div key={r.id} className="tile">
            <div className="row between"><span className="strong s">{r.title}</span><Rating value={r.rating} /></div>
            <p className="s muted" style={{ marginTop: 4 }}>{r.comment}</p>
            <div className="cap faint" style={{ marginTop: 4 }}>{r.author}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PropertyPage() {
  const { slug = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const stay = stayFromParams(params);
  const q = useQuery({ queryKey: ['property', slug], queryFn: () => api.property(slug), retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 1 });
  const property = q.data;
  const avail = useQuery({
    queryKey: ['availability', property?.id, stay.checkIn, stay.checkOut, stay.adults, stay.children, stay.rooms],
    enabled: !!property,
    queryFn: () => api.availability({ propertyId: property!.id, checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults, children: stay.children, rooms: stay.rooms }),
    refetchInterval: 30_000,
  });
  useEffect(() => {
    document.body.classList.add('has-mobile-bar');
    return () => document.body.classList.remove('has-mobile-bar');
  }, []);

  if (q.error) {
    return <div className="page" style={{ paddingTop: 40 }}>{q.error instanceof ApiError && q.error.status === 404 ? <Empty title="We couldn’t find this stay"><Link className="btn" to="/">Back to search</Link></Empty> : <ErrorNote error={q.error} retry={() => q.refetch()} />}</div>;
  }
  if (!property) return <div className="page stack md" style={{ paddingTop: 32 }}><Skeleton height={60} /><Skeleton height={420} /></div>;

  const open = avail.data?.filter((r) => r.available) ?? [];
  const lowest = open.length ? open.reduce((a, b) => (b.quote.total < a.quote.total ? b : a)) : null;
  const trust = trustFor(property.slug, property.destination.country);
  const roomsHref = stayHref(property.slug, stay, '/rooms');
  const setStay = (patch: Partial<Stay>) => {
    const next = { ...stay, ...patch };
    if (next.checkOut <= next.checkIn) next.checkOut = addDays(next.checkIn, 1);
    setParams(stayToParams(next), { replace: true });
  };
  const nights = Math.round((Date.parse(stay.checkOut) - Date.parse(stay.checkIn)) / 86_400_000);

  return (
    <div className="page" style={{ paddingTop: 16 }}>
      <div className="row between wrap" style={{ alignItems: 'flex-end', paddingTop: 16 }}>
        <div className="grow" style={{ minWidth: 280 }}>
          <div className="row wrap" style={{ gap: 12 }}><h1 className="h1">{property.name}</h1><Stars count={property.stars} size={18} /></div>
          <div className="row wrap s muted" style={{ fontSize: 14, marginTop: 8, gap: 12 }}>
            <span>{property.address}</span>
            <Link to={`/map?${stayToParams({ ...stay, destination: property.destination.name })}`}>Show on map</Link>
            {trust && <VerifiedBadge />}
          </div>
          <SyncStatus failed={avail.isError} />
        </div>
        <div className="row hide-m">
          <FavoriteButton id={property.id} name={property.name} className="icon-btn fav-square" />
          <button className="icon-btn" aria-label="Copy link to this stay" onClick={copyUrl}><Icon name="link" /></button>
        </div>
      </div>

      <div className="gallery">
        {property.images.slice(0, 5).map((img, i) => (
          <div key={img.url + i}><img className="scene" src={img.url} alt={img.alt} loading={i ? 'lazy' : 'eager'} /></div>
        ))}
      </div>

      <div className="split" style={{ marginTop: 32 }}>
        <div className="stack md" style={{ minWidth: 0 }}>
          <section className="card" id="about"><h2 className="h4" style={{ fontSize: 20, marginBottom: 8 }}>About this stay</h2><p className="muted">{property.description}</p></section>
          <GuestSummary property={property} />
          <section className="card stack md">
            <h2 className="h4" style={{ fontSize: 20 }}>Most popular facilities</h2>
            <div className="facilities">
              {property.amenities.map((a) => <div className="facility" key={a.slug}><Icon name={AMENITY_ICONS[a.slug] ?? 'check'} />{a.name}</div>)}
            </div>
          </section>
          <AvailabilityCalendar property={property} stay={stay} onPick={(d) => setStay({ checkIn: d, checkOut: addDays(d, nights) })} />
          <section className="card stack" id="policies">
            <h2 className="h4" style={{ fontSize: 20 }}>Policies</h2>
            <div className="row s"><Icon name="check" size={18} className="ok" />Flexible rates can be cancelled for free any time before the check-in date.</div>
            <div className="row s"><Icon name="x" size={18} />Non-refundable rates can’t be cancelled once booked.</div>
            <div className="row s"><Icon name="info" size={18} />The price is fixed when you book. Later rate changes don’t affect it.</div>
          </section>
        </div>

        <aside className="stack md sticky">
          <div className="card e stack md">
            <div>
              <div className="s muted">From</div>
              {avail.isLoading ? <Skeleton height={36} /> : lowest ? (
                <><div className="price-l">{money(lowest.quote.total, lowest.quote.currency)}</div><div className="s ok">{plural(lowest.quote.nights, 'night')}, {plural(stay.adults, 'adult')} · all-in</div></>
              ) : <div className="strong bad">No rooms left for these dates</div>}
            </div>
            <div className="grid-2" style={{ gap: 8 }}>
              <label className="field">Check-in<span className="input"><input type="date" value={stay.checkIn} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { if (e.target.value) setStay({ checkIn: e.target.value }); }} /></span></label>
              <label className="field">Check-out<span className="input"><input type="date" value={stay.checkOut} min={addDays(stay.checkIn, 1)} onChange={(e) => { if (e.target.value) setStay({ checkOut: e.target.value }); }} /></span></label>
            </div>
            <div className="field">Adults
              <Select label="Adults" icon="users" value={stay.adults} onChange={(adults) => setStay({ adults })}
                options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: plural(n, 'adult') }))} />
            </div>
            {avail.error && <ErrorNote error={avail.error} />}
            <Link to={roomsHref} className="btn lg block">Choose your room</Link>
            <div className="row s muted" style={{ justifyContent: 'center' }}><Icon name="lock" size={16} />You won’t be charged</div>
          </div>
          {trust && <TrustPanel trust={trust} />}
        </aside>
      </div>

      <div className="mobile-bar no-print">
        <div>{lowest ? <><div className="price-m">{money(lowest.quote.total)}</div><div className="cap ok">{plural(lowest.quote.nights, 'night')} · all-in</div></> : <span className="s bad">No rooms for these dates</span>}</div>
        <Link to={roomsHref} className="btn lg">Choose room</Link>
      </div>
    </div>
  );
}
