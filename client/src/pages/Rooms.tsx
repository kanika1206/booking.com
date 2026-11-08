import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { stayHref } from '../components/Cards';
import { cancellationText, Empty, ErrorNote, Icon, NoPaymentNote, PriceBreakdown, Skeleton, SyncStatus } from '../components/ui';
import { api, type RoomAvailability } from '../lib/api';
import { dateRange, money, plural, weekdayDayMonth } from '../lib/format';
import { groupRooms, includesBreakfast, rateLabel, recommendRate, splitRoomName, stayFromParams, stayToParams } from '../lib/stay';

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ['Choose room', 'Your details', 'Confirmed'];
  return (
    <ol className="steps" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {steps.map((s, i) => (
        <li key={s} className={`step${i + 1 <= current ? ' on' : ''}`} aria-current={i + 1 === current ? 'step' : undefined}>
          <i>{i + 1 < current ? <Icon name="check" size={16} /> : i + 1}</i>{s}
        </li>
      ))}
    </ol>
  );
}

export function RoomsPage() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const stay = stayFromParams(params);
  const [plansMayChange, setPlans] = useState(true);
  const [breakfast, setBreakfast] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);

  const property = useQuery({ queryKey: ['property', slug], queryFn: () => api.property(slug) });
  const avail = useQuery({
    queryKey: ['availability', property.data?.id, stay.checkIn, stay.checkOut, stay.adults, stay.children, stay.rooms],
    enabled: !!property.data,
    queryFn: () => api.availability({ propertyId: property.data!.id, checkIn: stay.checkIn, checkOut: stay.checkOut, adults: stay.adults, children: stay.children, rooms: stay.rooms }),
    refetchInterval: 15_000,
  });
  useEffect(() => {
    document.body.classList.add('has-mobile-bar');
    return () => document.body.classList.remove('has-mobile-bar');
  }, []);

  const rooms = useMemo(() => avail.data ?? [], [avail.data]);
  const bookable = rooms.filter((r) => r.available);
  const recommended = recommendRate(bookable, { plansMayChange, breakfast });
  const selected: RoomAvailability | undefined = bookable.find((r) => r.id === picked) ?? recommended;
  const cheapestNonRefundable = bookable.filter((r) => !r.refundable && selected && splitRoomName(r.name).category === splitRoomName(selected.name).category)[0];
  const extra = selected && cheapestNonRefundable && selected.refundable ? selected.quote.total - cheapestNonRefundable.quote.total : 0;
  const pickedGone = picked && !bookable.some((r) => r.id === picked);
  const checkoutHref = selected ? `/stays/${slug}/checkout?${new URLSearchParams({ ...Object.fromEntries(stayToParams(stay)), roomId: selected.id })}` : '';

  if (property.error) return <div className="page" style={{ paddingTop: 32 }}><ErrorNote error={property.error} retry={() => property.refetch()} /></div>;

  const groups = groupRooms(rooms);
  const scenes = property.data?.images ?? [];

  return (
    <>
      <div className="flow-head">
        <div className="page">
          <Link to={stayHref(slug, stay)} className="row strong s"><Icon name="chevron-left" size={18} />{property.data?.name ?? 'Back'}</Link>
          <Steps current={1} />
          <SyncStatus updatedAt={avail.dataUpdatedAt} fetching={avail.isFetching} failed={avail.isError} />
        </div>
      </div>
      <div className="page split" style={{ paddingTop: 28 }}>
        <div className="stack md" style={{ minWidth: 0 }}>
          <div>
            <h1 className="h1">Choose your room</h1>
            <p className="muted">{weekdayDayMonth(stay.checkIn)} – {weekdayDayMonth(stay.checkOut)} · {plural(stay.adults, 'adult')} · Every price below is the full total</p>
          </div>

          {bookable.length > 1 && (
            <section className="card ai-card stack md">
              <h2 className="row h4 ai"><span className="icon-tile sm t-ai"><Icon name="sparkle" size={18} /></span>Not sure which rate? Answer 2 questions</h2>
              <div className="row wrap" style={{ gap: 24 }}>
                <div className="stack"><div className="s strong">Could your plans change?</div>
                  <div className="chips"><button className="chip" aria-pressed={plansMayChange} onClick={() => { setPlans(true); setPicked(null); }}>Maybe</button><button className="chip" aria-pressed={!plansMayChange} onClick={() => { setPlans(false); setPicked(null); }}>No, dates are fixed</button></div></div>
                <div className="stack"><div className="s strong">Want breakfast?</div>
                  <div className="chips"><button className="chip" aria-pressed={breakfast} onClick={() => { setBreakfast(true); setPicked(null); }}>Yes</button><button className="chip" aria-pressed={!breakfast} onClick={() => { setBreakfast(false); setPicked(null); }}>We’ll eat out</button></div></div>
              </div>
              {recommended && (
                <div className="tile row" style={{ background: '#fff', fontSize: 14 }}>
                  <Icon name="check" className="ok" />
                  <span>Go {rateLabel(recommended)} at {splitRoomName(recommended.name).category}: {money(recommended.quote.total, recommended.quote.currency)} all-in. {cancellationText(recommended.refundable, stay.checkIn)}.</span>
                </div>
              )}
            </section>
          )}

          {pickedGone && <div className="note warn" role="alert"><Icon name="alert" size={18} />The rate you picked just sold out, so we selected the closest match.</div>}
          {avail.error && <ErrorNote error={avail.error} retry={() => avail.refetch()} />}
          {avail.isLoading && <Skeleton height={400} />}
          {avail.isSuccess && rooms.length > 0 && bookable.length === 0 && (
            <Empty title="No rooms left for these dates" icon="calendar">
              <p className="muted">Try other dates or fewer guests per room.</p>
              <Link className="btn" to={stayHref(slug, stay)}>Change dates</Link>
            </Empty>
          )}

          {groups.map(({ category, rates }, gi) => {
            const units = Math.max(...rates.map((r) => r.availableUnits));
            const first = rates[0]!;
            const image = scenes[gi % Math.max(1, scenes.length)];
            return (
              <section className="card stack md" key={category} aria-label={category}>
                <div className="room-head">
                  {image && <div className="room-img"><img className="scene" src={image.url} alt={image.alt} loading="lazy" /></div>}
                  <div className="stack">
                    <div className="row between wrap top">
                      <h2 className="h3">{category}</h2>
                      {units === 0 && <span className="badge bad">Sold out</span>}
                    </div>
                    <div className="room-pills">
                      <span className="badge">{first.sizeSqm} m²</span><span className="badge">{first.bedType}</span><span className="badge">Sleeps {first.maxGuests}</span>
                      {first.amenities.slice(0, 3).map((a) => <span className="badge" key={a.slug}>{a.name}</span>)}
                    </div>
                  </div>
                </div>
                <div className="stack" style={{ gap: 12 }} role="radiogroup" aria-label={`${category} rates`}>
                  {rates.map((r) => {
                    const on = selected?.id === r.id;
                    return (
                      <button key={r.id} role="radio" aria-checked={on} className={`option${on ? ' selected' : ''}`} disabled={!r.available} onClick={() => setPicked(r.id)}>
                        <span className={`radio-dot${on ? ' on' : ''}`} />
                        <span className="grow stack" style={{ gap: 6 }}>
                          <span className="row wrap">
                            <span className="strong" style={{ fontSize: 16 }}>{rateLabel(r)}</span>
                            {r.id === recommended?.id && <span className="badge ai"><Icon name="sparkle" size={14} />Best for your answers</span>}
                            {/* Each rate is its own room row in the database, so its count is its own. */}
                            {r.availableUnits === 0 ? <span className="badge bad">Sold out</span> : <span className={`badge ${r.availableUnits <= 1 ? 'warn' : 'ok'}`}>{r.availableUnits} left · live</span>}
                          </span>
                          <span className={`rate-row ${r.refundable ? 'ok' : 'muted'}`}><Icon name={r.refundable ? 'check' : 'x'} size={18} />{cancellationText(r.refundable, stay.checkIn)}</span>
                          {includesBreakfast(r) && <span className="rate-row"><Icon name="coffee" size={18} />Breakfast included</span>}
                          {!r.fitsParty && <span className="rate-row bad"><Icon name="alert" size={18} />Too small for your party</span>}
                          {r.fitsParty && r.availableUnits > 0 && r.availableUnits < stay.rooms && <span className="rate-row bad"><Icon name="alert" size={18} />Not enough rooms left for these dates</span>}
                        </span>
                        <span style={{ textAlign: 'right' }}>
                          <span className="price-m" style={{ display: 'block' }}>{money(r.quote.total, r.quote.currency)}</span>
                          <span className="s muted">{money(Math.round(r.quote.total / r.quote.nights), r.quote.currency)} / night · all-in</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="stack md sticky hide-print">
          {selected && (
            <>
              <section className="card stack">
                <h2 className="h4" style={{ fontSize: 20 }}>Your selection</h2>
                <div className="strong s">{splitRoomName(selected.name).category} · {rateLabel(selected)}</div>
                <div className="s muted">{dateRange(stay.checkIn, stay.checkOut)} · {plural(stay.adults, 'adult')}{stay.rooms > 1 ? ` · ${plural(stay.rooms, 'room')}` : ''}</div>
                {extra > 0 && <div className="cap link">+{money(extra)} vs non-refundable</div>}
              </section>
              <PriceBreakdown label={splitRoomName(selected.name).category} quote={selected.quote} />
              <button className="btn lg block hide-m" onClick={() => nav(checkoutHref)}><Icon name="arrow-right" />Continue to details</button>
              <NoPaymentNote />
            </>
          )}
        </aside>
      </div>
      {selected && (
        <div className="mobile-bar no-print">
          <div><div className="price-m">{money(selected.quote.total)}</div><div className="cap ok">{rateLabel(selected)} · all-in</div></div>
          <Link className="btn lg" to={checkoutHref}>Continue</Link>
        </div>
      )}
    </>
  );
}
