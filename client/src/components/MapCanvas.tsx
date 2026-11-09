import { useMemo, useState } from 'react';
import type { SearchResult } from '../lib/api';
import { Icon } from './ui';

/**
 * A stylised map from the Figma frame, with no map provider behind it. Pins are placed from each
 * property's real coordinates, scaled to fit, so relative positions are right but not to scale.
 */
export function project(items: { latitude: number; longitude: number }[]) {
  const lats = items.map((i) => i.latitude);
  const lngs = items.map((i) => i.longitude);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;
  return (i: { latitude: number; longitude: number }) => ({
    // Kept left of the details card, which sits in the bottom-right corner.
    left: 44 + ((i.longitude - minLng) / spanLng) * 22,
    top: 14 + ((maxLat - i.latitude) / spanLat) * 62,
  });
}

/** Nudges pins that would cover each other, so every stay stays clickable on small screens. */
export function layoutPins<T extends { id: string; latitude: number; longitude: number }>(items: T[]) {
  const place = project(items);
  const placed: { left: number; top: number }[] = [];
  const out = new Map<string, { left: number; top: number }>();
  const sorted = [...items].sort((a, b) => b.latitude - a.latitude);
  for (const item of sorted) {
    const start = place(item);
    const free = (p: { left: number; top: number }) =>
      !placed.some((q) => Math.abs(q.left - p.left) < 24 && Math.abs(q.top - p.top) < 8);
    // Try below, then in the next column, then above, so nothing piles up at the map's edge.
    const candidates = [0, 1, 2, 3, 4, 5, 6].flatMap((n) => [
      { left: start.left, top: start.top + n * 8 },
      { left: start.left + 25, top: start.top + n * 8 },
      { left: start.left, top: start.top - n * 8 },
    ]);
    const pos = candidates.find((c) => c.top >= 3 && c.top <= 97 && free(c)) ?? start;
    placed.push(pos);
    out.set(item.id, pos);
  }
  return out;
}

export const MapBackground =({ seaLabel }: { seaLabel?: string }) => (
  <svg viewBox="0 0 980 950" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="980" height="950" fill="#0f1c42" />
    <path d="M325 0 C345 120 300 240 305 340 C310 450 280 560 300 680 C310 760 290 860 285 950 H980 V0 Z" fill="#1b2b5a" />
    <path d="M325 0 C345 120 300 240 305 340 C310 450 280 560 300 680 C310 760 290 860 285 950" fill="none" stroke="#2f4580" strokeWidth="14" />
    <circle cx="820" cy="180" r="80" fill="#22356b" />
    <circle cx="640" cy="780" r="110" fill="#22356b" />
    <g fill="none" stroke="rgba(242,237,228,.14)" strokeWidth="6">
      <path d="M520 0 C500 180 510 400 510 560 C510 700 530 830 540 950" />
      <path d="M330 300 C500 310 700 290 980 330" />
      <path d="M520 640 C700 630 850 625 980 610" />
    </g>
    <path d="M700 0 C710 200 720 400 725 600 C730 760 745 860 750 950" fill="none" stroke="rgba(242,237,228,.22)" strokeWidth="8" />
    {seaLabel && <text x="150" y="420" fontSize="17" fill="#8d9ab8">{seaLabel}</text>}
  </svg>
);

export function MapCanvas({ items, selectedId, onSelect, label, short }: {
  items: SearchResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  label: (p: SearchResult) => string;
  short?: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const positions = useMemo(() => layoutPins(items), [items]);
  const isGoa = items[0]?.destination.slug === 'goa';
  return (
    <>
      <div className="map-world" style={{ transform: `scale(${zoom})` }}>
        <MapBackground seaLabel={isGoa ? 'Arabian Sea' : undefined} />
        {items.map((p) => {
          const pos = positions.get(p.id)!;
          const on = p.id === selectedId;
          return (
            <button key={p.id} className={`pin${on ? ' on' : ''}`} style={{ left: `${pos.left}%`, top: `${pos.top}%` }} aria-pressed={on} aria-label={`${p.name}, ${label(p)}`} onClick={() => onSelect(p.id)}>
              {on && <Icon name="shield-check" size={16} />}{label(p)}
            </button>
          );
        })}
      </div>
      {!short && (
        <div className="map-zoom">
          <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2, z + 0.25))}><Icon name="plus" /></button>
          <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z - 0.25))}><Icon name="minus" /></button>
        </div>
      )}
    </>
  );
}
