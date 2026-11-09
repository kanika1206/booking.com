import { Link } from 'react-router-dom';
import type { TrustInfo } from '../demo/fixtures';
import type { PropertyCard, SearchResult } from '../lib/api';
import { money, plural } from '../lib/format';
import { useFavorites } from '../lib/session';
import { splitRoomName, stayToParams, type Stay } from '../lib/stay';
import { cancellationText, DemoTag, Icon, Rating, Stars, SyncStatus } from './ui';

export function FavoriteButton({ id, name, className = 'fav' }: { id: string; name: string; className?: string }) {
  const { isFavorite, toggle } = useFavorites();
  const on = isFavorite(id);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); }}
    >
      <Icon name="heart" size={20} />
    </button>
  );
}

export const VerifiedBadge = () => (
  <span className="badge ok" title="Demo data: no verification system exists in this prototype">
    <Icon name="shield-check" size={16} />Verified property <small>(demo)</small>
  </span>
);

export const stayHref = (slug: string, stay?: Stay, suffix = '') =>
  `/stays/${slug}${suffix}${stay ? `?${stayToParams(stay)}` : ''}`;

export function ListCard({ p, stay, why, failed }: {
  p: SearchResult; stay: Stay; why: string; updatedAt?: number; fetching?: boolean; failed: boolean;
}) {
  const href = stayHref(p.slug, stay);
  return (
    <article className="pcard">
      <Link to={href} className="pcard-img" aria-label={p.name}>
        {p.imageUrl && <img className="scene" src={p.imageUrl} alt={p.imageAlt} loading="lazy" />}
        <FavoriteButton id={p.id} name={p.name} />
      </Link>
      <div className="stack pcard-mid" style={{ minWidth: 0, gap: 10 }}>
        <div>
          <div className="row wrap" style={{ gap: 10 }}>
            <Link to={href} className="pname">{p.name}</Link>
            <Stars count={p.stars} size={14} />
          </div>
          <div className="s muted" style={{ marginTop: 2 }}>{p.address}</div>
        </div>
        <div>
          <div className="s strong">{splitRoomName(p.room.name).category}</div>
          <div className="s muted">{p.room.bedType} · {p.room.sizeSqm} m²</div>
        </div>
        <div className={`s ${p.room.refundable ? 'ok' : 'muted'}`}>{cancellationText(p.room.refundable, stay.checkIn)}</div>
        <p className="s why-line"><Icon name="sparkle" size={14} />{why.charAt(0).toUpperCase() + why.slice(1)}</p>
        {failed && <SyncStatus failed />}
      </div>
      <div className="pcard-right">
        <div className="row" style={{ gap: 10 }}>
          <span className="s muted">{plural(p.reviewCount, 'review')}</span>
          <Rating value={p.ratingAvg} />
        </div>
        <div className="stack" style={{ gap: 2, alignItems: 'inherit' }}>
          <div className="price-m">{money(p.quote?.total ?? p.startingPrice ?? 0, p.quote?.currency)}</div>
          <div className="s muted">{p.quote ? `${plural(p.quote.nights, 'night')}, all-in` : 'per night, all-in'}</div>
        </div>
        <Link to={href} className="btn">See rooms</Link>
      </div>
    </article>
  );
}

/** Whole-stay totals are only known with dates, so grid cards show the nightly rate with GST. */
export function GridCard({ p, tag, stay }: { p: PropertyCard; tag?: string; stay?: Stay }) {
  const nightly = p.startingPrice === null ? null : Math.round(p.startingPrice * 1.12);
  return (
    <Link to={stayHref(p.slug, stay)} className="gcard">
      <div className="gcard-img">
        {p.imageUrl && <img className="scene" src={p.imageUrl} alt={p.imageAlt} loading="lazy" />}
        {tag && <span className="badge ai"><Icon name="sparkle" size={14} />{tag}</span>}
        <FavoriteButton id={p.id} name={p.name} />
      </div>
      <div className="stack" style={{ padding: 16, gap: 6 }}>
        <div className="row between">
          <span className="strong" style={{ fontSize: 16 }}>{p.name}</span>
          <Rating value={p.ratingAvg} />
        </div>
        <div className="s muted">{p.address.split(',')[0]} · {p.destination.name}</div>
        {nightly !== null && (
          <div className="row"><span className="strong" style={{ fontSize: 17 }}>{money(nightly)}</span><span className="s muted">/ night, all-in</span></div>
        )}
      </div>
    </Link>
  );
}

export function TrustPanel({ trust }: { trust: TrustInfo }) {
  return (
    <section className="card stack md" aria-label="Listing authenticity">
      <div className="row between wrap">
        <h2 className="row h4" style={{ fontSize: 20 }}><Icon name="shield-check" size={26} className="ok" />Listing authenticity</h2>
        <DemoTag />
      </div>
      <div className="row wrap">
        <span className="strong ok" style={{ fontSize: 17 }}>Trust score {trust.score}/100</span>
      </div>
      <ul className="stack" style={{ gap: 12 }}>
        {trust.checks.map((c) => <li className="row s" key={c} style={{ fontSize: 14 }}><Icon name="check" size={18} className="ok" />{c}</li>)}
      </ul>
    </section>
  );
}
