import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { api, ApiError, type Quote } from '../lib/api';
import { lastFreeCancelDay, money, dayMonth, plural } from '../lib/format';
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
 * Availability rechecks quietly in the background. This renders nothing unless that recheck
 * fails, so a stale price or room count never passes silently.
 */
export function SyncStatus({ failed }: { failed?: boolean }) {
  // Availability still rechecks in the background; the UI only speaks up when that fails.
  if (failed) return <span className="sync failed" role="status">Couldn’t refresh availability</span>;
  return null;
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

/**
 * A themed replacement for <select>. The native menu is drawn by the OS and can't match the
 * glass theme, so this renders its own listbox with the same keyboard behaviour.
 */
export function Select<T extends string | number>({ value, options, onChange, icon, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; icon?: IconName; label: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const current = options.find((o) => o.value === value);
  const show = () => { setActive(Math.max(0, options.findIndex((o) => o.value === value))); setOpen(true); };
  const choose = (i: number) => { onChange(options[i]!.value); setOpen(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
  };
  return (
    <div ref={ref} className="select">
      <button type="button" className="input select-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${current?.label ?? ''}`}
        aria-controls={id} onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}>
        {icon && <Icon name={icon} />}
        <span className="grow">{current?.label}</span>
        <Icon name="chevron-down" size={18} className={open ? 'flip' : undefined} />
      </button>
      {open && (
        <ul className="pop select-pop" role="listbox" id={id} aria-label={label}>
          {options.map((o, i) => (
            <li key={String(o.value)} role="option" aria-selected={o.value === value}>
              <button type="button" tabIndex={-1} className={i === active ? 'active' : undefined} onMouseEnter={() => setActive(i)} onClick={() => choose(i)}>
                <span className="grow">{o.label}</span>
                {o.value === value && <Icon name="check" size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const copyUrl =() => navigator.clipboard?.writeText(window.location.href);
export { api };
