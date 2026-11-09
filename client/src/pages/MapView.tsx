import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { stayHref, VerifiedBadge } from '../components/Cards';
import { MapCanvas } from '../components/MapCanvas';
import { DemoTag, ErrorNote, Icon, Rating, Skeleton, SyncStatus } from '../components/ui';
import { trustFor } from '../demo/fixtures';
import { api } from '../lib/api';
import { dateRange, money, plural } from '../lib/format';
import { searchTerm, stayFromParams } from '../lib/stay';

const compact = (minor: number) => `₹${(minor / 100000).toFixed(1)}k`;

export function MapPage() {
  const [params] = useSearchParams();
  const stay = stayFromParams(params);
  const [picked, setPicked] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['map', stay],
    queryFn: () => api.search({ destination: searchTerm(stay.destination), checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults, children: stay.children, rooms: stay.rooms, limit: 50 }),
    refetchInterval: 30_000,
  });
  const items = q.data?.data ?? [];
  const selected = items.find((p) => p.id === picked) ?? items[0] ?? null;
  const term = searchTerm(stay.destination);
  const nights = selected?.quote?.nights ?? 0;

  return (
    <div className="map-layout">
      <aside className="map-list">
        <div className="row between" style={{ marginBottom: 16 }}>
          <div><h1 className="h4" style={{ fontSize: 20 }}>{plural(q.data?.meta.total ?? 0, 'stay')} in {term}</h1><div className="s ok">Totals for {plural(nights, 'night')} · all-in</div></div>
          <Link className="btn secondary" to={`/search?${params}`}><Icon name="menu" size={18} />List</Link>
        </div>
        {q.error && <ErrorNote error={q.error} retry={() => q.refetch()} />}
        {q.isLoading && <Skeleton height={114} />}
        {items.map((p) => (
          <button key={p.id} className={`map-item${selected?.id === p.id ? ' on' : ''}`} onClick={() => setPicked(p.id)}>
            {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" />}
            <span className="stack" style={{ gap: 2, minWidth: 0 }}>
              <span className="strong link" style={{ fontSize: 14 }}>{p.name}</span>
              <span className="s muted">{p.address.split(',')[0]}</span>
              <span className="row"><Rating value={p.ratingAvg} /><span className="strong" style={{ fontSize: 17 }}>{money(p.quote?.total ?? 0)}</span></span>
            </span>
          </button>
        ))}
      </aside>
      <div className="map-canvas">
        <div className="map-top">
          <div className="card tight row between" style={{ boxShadow: 'var(--e2)' }}>
            <Link to={`/search?${params}`} aria-label="Back to list" style={{ color: 'inherit' }}><Icon name="chevron-left" /></Link>
            <div className="grow"><div className="strong">{term} · {items.length} in this area</div><div className="s muted">{dateRange(stay.checkIn, stay.checkOut)} · {plural(stay.adults, 'adult')}</div></div>
          </div>
        </div>
        {items.length > 0 && <MapCanvas items={items} selectedId={selected?.id ?? null} onSelect={setPicked} label={(p) => compact(p.quote?.total ?? 0)} />}
        {selected && (
          <div className="map-pop">
            {selected.imageUrl && <img src={selected.imageUrl} alt="" />}
            <div className="stack" style={{ padding: 16 }}>
              <div className="row between"><span className="strong" style={{ fontSize: 17 }}>{selected.name}</span><Rating value={selected.ratingAvg} /></div>
              {trustFor(selected.slug, selected.destination.country) && <VerifiedBadge />}
              <SyncStatus failed={q.isError} />
              <div className="row between">
                <div><div className="price-m">{money(selected.quote?.total ?? 0)}</div><div className="s muted">{plural(nights, 'night')} · all-in</div></div>
                <Link className="btn" to={stayHref(selected.slug, stay)}>View</Link>
              </div>
            </div>
          </div>
        )}
        <div className="map-foot"><DemoTag label="Illustrative map" title="No map provider is connected. Pins use real coordinates, scaled to fit." />Pin positions use real coordinates, not to scale</div>
      </div>
    </div>
  );
}
