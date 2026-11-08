import type { ReactNode } from 'react';
import { api, ApiError, type Quote } from '../lib/api';
import { lastFreeCancelDay, money, dayMonth, plural } from '../lib/format';
import { useSecondsAgo } from '../lib/session';
import { icons, type IconName } from './icons';

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      // Trusted: generated at build time from the Figma export, never from user or API input.
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
}

/** Marks anything simulated. The backend does not provide what this sits next to. */
export function DemoTag({ label = 'Demo data', title }: { label?: string; title?: string }) {
  return <span className="demo-tag" title={title ?? 'Sample content for this prototype. Not from the live system.'}>{label}</span>;
}

export const Stars = ({ count, size = 16 }: { count: number; size?: number }) => (
  <span className="stars" role="img" aria-label={`${count} stars`}>
    {Array.from({ length: count }, (_, i) => <Icon key={i} name="star" size={size} />)}
  </span>
);

export const Rating = ({ value, large }: { value: number; large?: boolean }) => (
  <span className={`rating${large ? ' lg' : ''}`}>{value.toFixed(1)}</span>
);

/**
 * Availability freshness. Unlike the design's fixed "12s ago", this reflects the real last
 * response from the availability or search API, including recheck and failure states.
 */
export function SyncStatus({ updatedAt, fetching, failed, short }: { updatedAt: number; fetching?: boolean; failed?: boolean; short?: boolean }) {
  const ago = useSecondsAgo(updatedAt);
  if (failed) return <span className="sync failed" role="status">Couldn’t refresh availability</span>;
  if (fetching && !updatedAt) return <span className="sync checking" role="status">Checking availability</span>;
  return <span className="sync">{short ? 'Live' : 'Live availability'} · synced {ago}s ago</span>;
}

export function ErrorNote({ error, retry }: { error: unknown; retry?: () => void }) {
  const message = error instanceof ApiError || error instanceof Error ? error.message : 'Something went wrong';
  return (
    <div className="note bad" role="alert">
      <Icon name="alert" size={18} />
      <span className="grow">{message}</span>
      {retry && <button className="btn ghost" onClick={retry}>Try again</button>}
    </div>
  );
}

export const Skeleton = ({ height = 200 }: { height?: number }) => <div className="skeleton" style={{ height }} aria-hidden="true" />;

export function Empty({ icon = 'search', title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="card stack md" style={{ alignItems: 'center', textAlign: 'center', padding: 48 }}>
      <span className="icon-tile t-subtle"><Icon name={icon} /></span>
      <h2 className="h4">{title}</h2>
      {children}
    </div>
  );
}

export function PriceBreakdown({ label, quote }: { label: string; quote: Quote }) {
  const c = quote.currency;
  return (
    <div className="card e">
      <div className="row between" style={{ marginBottom: 16 }}>
        <h2 className="h3" style={{ fontSize: 20 }}>Price details</h2>
      </div>
      <div className="lines">
        <div className="line">
          <span>{label} · {plural(quote.nights, 'night')} × {money(quote.nightlyPrice, c)}{quote.rooms > 1 ? ` × ${quote.rooms} rooms` : ''}</span>
          <b>{money(quote.subtotal, c)}</b>
        </div>
        <div className="line"><span>GST {Math.round(quote.taxRate * 100)}%</span><b>{money(quote.taxes, c)}</b></div>
      </div>
      <div className="total">
        <div><div className="h4">Total</div><div className="cap ok">No hidden fees at check-in</div></div>
        <div className="price-l">{money(quote.total, c)}</div>
      </div>
    </div>
  );
}

export const cancellationText = (refundable: boolean, checkIn: string) =>
  refundable ? `Free cancellation until ${dayMonth(lastFreeCancelDay(checkIn))}` : 'Non-refundable · no changes';

export function NoPaymentNote() {
  return (
    <div className="note plain">
      <Icon name="info" size={18} />
      <span><DemoTag label="Prototype" /> No payment is taken. Your booking is saved and confirmed without any charge.</span>
    </div>
  );
}

export function ConfirmPanel({ title, children, confirmLabel, danger, pending, onConfirm, onCancel }: {
  title: string; children: ReactNode; confirmLabel: string; danger?: boolean; pending?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="card stack md" role="alertdialog" aria-label={title} style={{ borderColor: danger ? 'var(--danger)' : 'var(--bg-ai)' }}>
      <h3 className="h4">{title}</h3>
      <div className="muted">{children}</div>
      <div className="row wrap">
        <button className={`btn ${danger ? 'danger' : 'ai'}`} disabled={pending} onClick={onConfirm}>{pending ? 'Working…' : confirmLabel}</button>
        <button className="btn secondary" disabled={pending} onClick={onCancel}>Keep booking</button>
      </div>
    </div>
  );
}

export const copyUrl = () => navigator.clipboard?.writeText(window.location.href);
export { api };
