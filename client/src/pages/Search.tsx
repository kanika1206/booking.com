import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ListCard } from '../components/Cards';
import { MapBackground } from '../components/MapCanvas';
import { SearchBar } from '../components/SearchBar';
import { Empty, ErrorNote, Icon, Skeleton } from '../components/ui';
import { api, type SearchResult } from '../lib/api';
import { dateRange, money, plural, titleCase } from '../lib/format';
import { writeStore } from '../lib/session';
import { groupLookalikes, searchTerm, stayFromParams, stayToParams, type Stay } from '../lib/stay';

const SORTS = [['relevance', 'Best for you'], ['price_asc', 'Lowest total price'], ['rating', 'Top reviewed'], ['price_desc', 'Highest price']] as const;
const RATINGS = [['9', 'Superb 9+'], ['8', 'Very good 8+'], ['7', 'Good 7+']] as const;

/** A short, honest reason computed from this search's own results. */
export function whyThis(p: SearchResult, all: SearchResult[], stay: Stay) {
  const cheapest = Math.min(...all.map((x) => x.quote?.total ?? Infinity));
  const topRated = Math.max(...all.map((x) => x.ratingAvg));
  const amen = p.amenities.slice(0, 2).map((a) => a.name.toLowerCase()).join(' and ');
  if (p.quote?.total === cheapest && all.length > 1) return `lowest total for ${dateRange(stay.checkIn, stay.checkOut)}${amen ? `, with ${amen}` : ''}.`;
  if (p.ratingAvg === topRated && all.length > 1) return `highest guest rating in this search${amen ? `, with ${amen}` : ''}.`;
  return `${titleCase(p.type)} rated ${p.ratingAvg.toFixed(1)}${amen ? ` with ${amen}` : ''}.`;
}

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const stay = stayFromParams(params);
  const [diverse, setDiverse] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

  const list = (k: string) => params.get(k)?.split(',').filter(Boolean) ?? [];
  const types = list('types');
  const amenities = list('amenities');
  const sort = params.get('sort') ?? 'relevance';
  const minRating = params.get('minRating') ?? '';
  const maxNight = params.get('maxNight');
  const page = Math.max(1, Number(params.get('page')) || 1);

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };
  const toggle = (k: string, values: string[], v: string) =>
    setParam({ [k]: (values.includes(v) ? values.filter((x) => x !== v) : [...values, v]).join(',') || null });

  const query = useQuery({
    queryKey: ['search', stay, types, amenities, sort, minRating, maxNight, page],
    queryFn: () => api.search({
      destination: searchTerm(stay.destination), checkIn: stay.checkIn, checkOut: stay.checkOut,
      adults: stay.adults, children: stay.children, rooms: stay.rooms,
      types: types.join(',') || undefined, amenities: amenities.join(',') || undefined, sort,
      minRating: minRating ? Number(minRating) : undefined,
      maxPrice: maxNight ? Math.round((Number(maxNight) * 100) / 1.12) : undefined,
      page, limit: 20,
    }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const results = query.data?.data ?? [];
  const meta = query.data?.meta;
  const term = searchTerm(stay.destination);
  const nights = results[0]?.quote?.nights;

  useEffect(() => {
    if (meta) writeStore('lastSearch', { stay, total: meta.total, scene: results[0]?.imageUrl ?? null });
    // Save when results arrive, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.total, stay.destination, stay.checkIn, stay.checkOut]);

  const groups = diverse ? groupLookalikes(results) : results.map((lead) => ({ lead, similar: [] as SearchResult[] }));
  const carry = (s: Stay) => {
    const next = stayToParams(s);
    nav(`/search?${next}`);
  };
  const priceRange = meta?.facets.priceRange;
  const budgetMax = priceRange ? Math.ceil((priceRange.max * 1.12) / 100) : 0;
  const budgetMin = priceRange ? Math.floor((priceRange.min * 1.12) / 100) : 0;

  const filters = (
    <div className={`filters stack md${filtersOpen ? ' open' : ''}`}>
      <Link to={`/map?${params}`} className="mini-map hide-m" aria-label="Show on map">
        <MapBackground /><span className="btn"><Icon name="map" size={18} />Show on map</span>
      </Link>
      <div className="card">
        <div className="row between">
          <h2 className="h4" style={{ fontSize: 20 }}>Filter by</h2>
          <button className="btn ghost" onClick={() => setParam({ types: null, amenities: null, minRating: null, maxNight: null })}>Reset</button>
        </div>
        {budgetMax > budgetMin && (
          <div className="filter-group">
            <h3 id="budget">Your budget (per night, all-in)</h3>
            <input aria-labelledby="budget" type="range" min={budgetMin} max={budgetMax} step={100} value={maxNight ?? budgetMax} onChange={(e) => setParam({ maxNight: e.target.value === String(budgetMax) ? null : e.target.value })} style={{ accentColor: 'var(--bg-action)' }} />
            <div className="row between s"><span className="muted">{money(budgetMin * 100)}</span><span className="link">{money(Number(maxNight ?? budgetMax) * 100)}</span></div>
          </div>
        )}
        <div className="filter-group">
          <h3>Guest rating</h3>
          {RATINGS.map(([v, l]) => (
            <label className="check" key={v}><input type="radio" name="rating" style={{ borderRadius: '50%' }} checked={minRating === v} onChange={() => setParam({ minRating: v })} onClick={() => { if (minRating === v) setParam({ minRating: null }); }} />{l}</label>
          ))}
        </div>
        {!!meta?.facets.types.length && (
          <div className="filter-group">
            <h3>Property type</h3>
            {meta.facets.types.map((f) => (
              <label className="filter-row check" key={f.key}><span className="row"><input type="checkbox" checked={types.includes(f.key)} onChange={() => toggle('types', types, f.key)} />{titleCase(f.label)}</span><span className="s faint">{f.count}</span></label>
            ))}
          </div>
        )}
        {!!meta?.facets.amenities.length && (
          <div className="filter-group">
            <h3>Facilities</h3>
            {meta.facets.amenities.map((f) => (
              <label className="filter-row check" key={f.key}><span className="row"><input type="checkbox" checked={amenities.includes(f.key)} onChange={() => toggle('amenities', amenities, f.key)} />{f.label}</span><span className="s faint">{f.count}</span></label>
            ))}
          </div>
        )}
      </div>
      <button className="btn lg block filters-close" onClick={() => setFiltersOpen(false)}>Show {plural(meta?.total ?? 0, 'stay')}</button>
    </div>
  );

  return (
    <>
      <div className="nav" style={{ paddingBottom: 0 }}>
        <div className="page" style={{ paddingBottom: 12, marginBottom: -28, position: 'relative', zIndex: 10 }}>
          <SearchBar key={params.toString()} initial={stay} onSearch={carry} />
        </div>
      </div>
      <div className="page" style={{ paddingTop: 44 }}>
        <nav className="row s hide-m" aria-label="Breadcrumb"><Link to="/">Home</Link><Icon name="chevron-right" size={14} /><span className="muted">{term}</span><Icon name="chevron-right" size={14} /><span className="muted">Search results</span></nav>
        <div className="search-layout">
          {filters}
          <div className="stack md" style={{ minWidth: 0 }}>
            <div>
              <h1 className="h2">{term}: {plural(meta?.total ?? 0, 'stay')} match{meta?.total === 1 ? 'es' : ''}</h1>
              <p className="s ok" style={{ fontSize: 14 }}>{nights ? `Prices are totals for ${plural(nights, 'night')}, ${plural(stay.adults, 'adult')}, with taxes included` : ''}</p>
            </div>
            <div className="row show-m">
              <button className="btn secondary grow" onClick={() => setFiltersOpen(true)}><Icon name="sliders" size={18} />Filters</button>
              <Link className="btn secondary grow" to={`/map?${params}`}><Icon name="map" size={18} />Map</Link>
            </div>
            <div className="card tight white-ai row" style={{ gap: 12 }}>
              <Icon name="sparkle" className="ai" />
              <div className="grow">
                <div className="s strong ai">Diverse results {diverse ? 'are on' : 'are off'}</div>
                <div className="s muted">Stays with the same type and rating band are grouped under one card, so the top results aren’t near-duplicates.</div>
              </div>
              <label><span className="sr-only">Diverse results</span><input className="toggle" type="checkbox" checked={diverse} onChange={(e) => setDiverse(e.target.checked)} /></label>
            </div>
            <div className="chips">
              {SORTS.map(([v, l]) => <button key={v} className="chip" aria-pressed={sort === v} onClick={() => setParam({ sort: v === 'relevance' ? null : v })}>{l}</button>)}
            </div>
            {query.error && !results.length ? <ErrorNote error={query.error} retry={() => query.refetch()} /> : query.isLoading ? [0, 1, 2].map((i) => <Skeleton key={i} height={280} />) : results.length === 0 ? (
              <Empty title={`No stays match in ${term}`}>
                <p className="muted">Everything may be sold out for these dates or your filters may be too narrow.</p>
                <button className="btn" onClick={() => setParam({ types: null, amenities: null, minRating: null, maxNight: null })}>Clear filters</button>
              </Empty>
            ) : groups.map(({ lead, similar }) => (
              <div key={lead.id}>
                <ListCard p={lead} stay={stay} why={whyThis(lead, results, stay)} updatedAt={query.dataUpdatedAt} fetching={query.isFetching} failed={query.isError} />
                {similar.length > 0 && (
                  <>
                    <button className="similar" aria-expanded={expanded.has(lead.id)} onClick={() => setExpanded((s) => { const n = new Set(s); if (n.has(lead.id)) n.delete(lead.id); else n.add(lead.id); return n; })}>
                      <Icon name={expanded.has(lead.id) ? 'chevron-down' : 'chevron-right'} size={16} />{plural(similar.length, 'similar stay')} grouped here
                    </button>
                    {expanded.has(lead.id) && <div className="stack md" style={{ marginTop: 16 }}>{similar.map((p) => <ListCard key={p.id} p={p} stay={stay} why={whyThis(p, results, stay)} updatedAt={query.dataUpdatedAt} fetching={query.isFetching} failed={query.isError} />)}</div>}
                  </>
                )}
              </div>
            ))}
            {meta && meta.totalPages > 1 && (
              <div className="row between">
                <button className="btn secondary" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>Previous</button>
                <span className="s muted">Page {page} of {meta.totalPages}</span>
                <button className="btn secondary" disabled={page >= meta.totalPages} onClick={() => setParam({ page: String(page + 1) })}>Next</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
