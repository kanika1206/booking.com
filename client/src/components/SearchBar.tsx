import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { addDays, nightsBetween, plural, todayIso, weekdayDayMonth } from '../lib/format';
import { stayToParams, type Stay } from '../lib/stay';
import { Icon } from './ui';

function usePopover() {
  const [open, setOpen] = useState<null | 'dest' | 'dates' | 'guests'>(null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);
  return { open, setOpen, ref };
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="stepper">
      <span>{label}</span>
      <span className="row" style={{ gap: 12 }}>
        <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}><Icon name="minus" size={16} /></button>
        <span aria-live="polite" style={{ minWidth: 20, textAlign: 'center' }}>{value}</span>
        <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Icon name="plus" size={16} /></button>
      </span>
    </div>
  );
}

const Label = ({ label, value }: { label: string; value: ReactNode }) => (
  <span style={{ minWidth: 0 }}><span className="sb-label">{label}</span><span className="sb-value">{value}</span></span>
);

export function SearchBar({ initial, onSearch }: { initial: Stay; onSearch?: (s: Stay) => void }) {
  const [stay, setStay] = useState(initial);
  const { open, setOpen, ref } = usePopover();
  const nav = useNavigate();
  const suggestions = useQuery({
    queryKey: ['destinations', stay.destination],
    queryFn: () => api.destinations({ q: stay.destination.split(',')[0]!.trim(), limit: 6 }),
    enabled: open === 'dest',
    staleTime: 60_000,
  });
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const set = (patch: Partial<Stay>) => setStay((s) => ({ ...s, ...patch }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(null);
    if (onSearch) onSearch(stay);
    else nav(`/search?${stayToParams(stay)}`);
  };
  return (
    <form ref={ref} className="searchbar" onSubmit={submit} role="search">
      <div className="sb-field">
        <Icon name="bed" size={24} />
        <label style={{ minWidth: 0, flex: 1 }}>
          <span className="sb-label">Destination</span>
          <input
            className="sb-value"
            value={stay.destination}
            placeholder="City, property or landmark"
            required
            autoComplete="off"
            onFocus={() => setOpen('dest')}
            onChange={(e) => { set({ destination: e.target.value }); setOpen('dest'); }}
          />
        </label>
        {open === 'dest' && !!suggestions.data?.length && (
          <ul className="pop" style={{ padding: 8, width: '100%' }}>
            {suggestions.data.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => { set({ destination: `${d.name}, ${d.country}` }); setOpen(null); }}>
                  <Icon name="map-pin" size={18} />
                  <span><span className="strong">{d.name}</span> <span className="muted s">{d.country} · {plural(d.propertyCount, 'stay')}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ position: 'relative', display: 'grid' }}>
        <button type="button" className="sb-field" aria-expanded={open === 'dates'} onClick={() => setOpen(open === 'dates' ? null : 'dates')}>
          <Icon name="calendar" size={24} />
          <Label label="Check-in — Check-out" value={`${weekdayDayMonth(stay.checkIn)} — ${weekdayDayMonth(stay.checkOut)} · ${plural(nights, 'night')}`} />
        </button>
        {open === 'dates' && (
          <div className="pop stack md">
            <label className="field">Check-in
              <span className="input"><input type="date" min={todayIso()} value={stay.checkIn} onChange={(e) => {
                const v = e.target.value;
                if (v) set({ checkIn: v, checkOut: stay.checkOut > v ? stay.checkOut : addDays(v, 1) });
              }} /></span>
            </label>
            <label className="field">Check-out
              <span className="input"><input type="date" min={addDays(stay.checkIn, 1)} value={stay.checkOut} onChange={(e) => { if (e.target.value) set({ checkOut: e.target.value }); }} /></span>
            </label>
          </div>
        )}
      </div>

      <div style={{ position: 'relative', display: 'grid' }}>
        <button type="button" className="sb-field" aria-expanded={open === 'guests'} onClick={() => setOpen(open === 'guests' ? null : 'guests')}>
          <Icon name="users" size={24} />
          <Label label="Guests" value={`${plural(stay.adults, 'adult')} · ${plural(stay.children, 'child', 'children')} · ${plural(stay.rooms, 'room')}`} />
        </button>
        {open === 'guests' && (
          <div className="pop">
            <Stepper label="Adults" value={stay.adults} min={1} max={30} onChange={(adults) => set({ adults })} />
            <Stepper label="Children" value={stay.children} min={0} max={20} onChange={(children) => set({ children })} />
            <Stepper label="Rooms" value={stay.rooms} min={1} max={8} onChange={(rooms) => set({ rooms })} />
          </div>
        )}
      </div>

      <button className="btn sb-go" type="submit"><Icon name="search" />Search</button>
    </form>
  );
}
