import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { GridCard } from '../components/Cards';
import { Empty, ErrorNote, Icon, Skeleton } from '../components/ui';
import { api, ApiError, type Destination } from '../lib/api';
import { plural } from '../lib/format';
import { defaultStay, stayToParams } from '../lib/stay';

const searchHref = (d: Destination) => `/search?${stayToParams({ ...defaultStay(), destination: `${d.name}, ${d.country}` })}`;

function DestinationCard({ d, tall }: { d: Destination; tall?: boolean }) {
  return (
    <Link className="dest" to={`/destinations/${d.slug}`} style={tall ? undefined : { height: 260 }}>
      <img className="scene" src={d.imageUrl} alt="" loading="lazy" />
      <div className="dest-text">
        <div className="h3">{d.name}</div>
        <div className="s">{plural(d.propertyCount, 'stay')}</div>
      </div>
    </Link>
  );
}

export function DestinationsPage() {
  const q = useQuery({ queryKey: ['destinations', 'all'], queryFn: () => api.destinations({ limit: 50 }) });
  const india = q.data?.filter((d) => d.country === 'India') ?? [];
  const abroad = q.data?.filter((d) => d.country !== 'India') ?? [];
  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <div className="stack" style={{ maxWidth: 640 }}>
        <div className="over">Destinations</div>
        <h1 className="d-l">Where to next?</h1>
        <p className="body-l">{q.data ? `${plural(india.length, 'place')} across India, from houseboats to hill stations, each with verified stays.` : 'Loading destinations…'}</p>
      </div>
      {q.error ? <div className="section"><ErrorNote error={q.error} retry={() => q.refetch()} /></div> : (
        <>
          <section className="section">
            <h2 className="h3" style={{ marginBottom: 16 }}>India</h2>
            <div className="grid-4">
              {q.isLoading && Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={260} />)}
              {india.map((d) => <DestinationCard key={d.id} d={d} />)}
            </div>
          </section>
          {abroad.length > 0 && (
            <section className="section">
              <h2 className="h3" style={{ marginBottom: 4 }}>Beyond India</h2>
              <p className="s muted" style={{ marginBottom: 16 }}>International stays, priced in rupees.</p>
              <div className="grid-4">{abroad.map((d) => <DestinationCard key={d.id} d={d} />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export function DestinationPage() {
  const { slug = '' } = useParams();
  const stay = defaultStay();
  const dest = useQuery({ queryKey: ['destination', slug], queryFn: () => api.destination(slug), retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 1 });
  const stays = useQuery({
    queryKey: ['destination-stays', slug],
    enabled: !!dest.data,
    queryFn: () => api.search({ destination: dest.data!.name, checkIn: stay.checkIn, checkOut: stay.checkOut, adults: 2, sort: 'rating', limit: 12 }),
  });
  const others = useQuery({ queryKey: ['destinations', 'all'], queryFn: () => api.destinations({ limit: 50 }) });

  if (dest.error) {
    return <div className="page" style={{ paddingTop: 40 }}>{dest.error instanceof ApiError && dest.error.status === 404
      ? <Empty title="We couldn’t find that destination"><Link className="btn" to="/destinations">All destinations</Link></Empty>
      : <ErrorNote error={dest.error} retry={() => dest.refetch()} />}</div>;
  }
  const d = dest.data;
  const nearby = (others.data ?? []).filter((o) => o.slug !== slug && o.country === d?.country).slice(0, 4);

  return (
    <div className="page" style={{ paddingTop: 16 }}>
      {!d ? <Skeleton height={380} /> : (
        <section className="dest-hero">
          <img className="scene" src={d.imageUrl} alt={`${d.name}, ${d.country}`} />
          <div className="dest-hero-text">
            <Link to="/destinations" className="s muted row" style={{ marginBottom: 12 }}><Icon name="chevron-left" size={16} />All destinations</Link>
            <h1 className="d-l">{d.name}</h1>
            <p className="body-l" style={{ maxWidth: 520 }}>{d.description}</p>
            <Link className="btn lg" to={searchHref(d)} style={{ marginTop: 20, alignSelf: 'flex-start' }}><Icon name="search" size={18} />Search {plural(d.propertyCount, 'stay')}</Link>
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="h2" style={{ marginBottom: 4 }}>Best-rated stays</h2>
        <p className="s muted" style={{ marginBottom: 20 }}>Nightly prices include tax.</p>
        {stays.error ? <ErrorNote error={stays.error} retry={() => stays.refetch()} /> : (
          <div className="grid-4">
            {(stays.isLoading || !d) && [0, 1, 2, 3].map((i) => <Skeleton key={i} height={300} />)}
            {stays.data?.data.map((p) => <GridCard key={p.id} p={p} stay={stay} />)}
          </div>
        )}
        {stays.data && stays.data.data.length === 0 && <Empty title={`No stays open in ${d?.name} for the next few nights`} />}
      </section>

      {nearby.length > 0 && (
        <section className="section">
          <h2 className="h3" style={{ marginBottom: 16 }}>More places in {d?.country}</h2>
          <div className="grid-4">{nearby.map((o) => <DestinationCard key={o.id} d={o} />)}</div>
        </section>
      )}
    </div>
  );
}
