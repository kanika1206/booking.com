import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DEMO_GENIUS_LEVEL } from '../demo/fixtures';
import { api } from '../lib/api';
import { initials } from '../lib/format';
import { useAuth } from '../lib/session';
import { DemoTag, Icon } from './ui';
import type { IconName } from './icons';

export const Logo = () => <Link to="/" className="logo">Booking<span>.com</span></Link>;

function UserMenu() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => { qc.clear(); nav('/'); },
  });
  if (!user) return <Link to="/login" className="btn secondary">Sign in</Link>;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="user-pill" style={{ border: 0, color: '#fff' }} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <span className="avatar accent">{initials(user.firstName, user.lastName)}</span>
        <span className="hide-m" style={{ textAlign: 'left' }}>
          <span className="s" style={{ display: 'block', fontWeight: 600 }}>{user.firstName}</span>
          <span className="sub" title="Demo loyalty level, no real programme behind it">{DEMO_GENIUS_LEVEL} (demo)</span>
        </span>
      </button>
      {open && (
        <div className="pop" role="menu" style={{ left: 'auto', right: 0, minWidth: 200, padding: 8 }}>
          <ul onClick={() => setOpen(false)}>
            <li><button role="menuitem" onClick={() => nav('/trips')}><Icon name="briefcase" size={18} />My trips</button></li>
            <li><button role="menuitem" onClick={() => nav('/saved')}><Icon name="heart" size={18} />Saved</button></li>
            <li><button role="menuitem" onClick={() => nav('/messages')}><Icon name="message" size={18} />Messages</button></li>
            <li><button role="menuitem" onClick={() => nav('/account')}><Icon name="user" size={18} />Account</button></li>
            <li><button role="menuitem" onClick={() => logout.mutate()}><Icon name="external" size={18} />Sign out</button></li>
          </ul>
        </div>
      )}
    </div>
  );
}

const notBuilt = 'Not part of this prototype';

function NavBar({ tabs }: { tabs: boolean }) {
  const loc = useLocation();
  return (
    <header className="nav">
      <div className="nav-top">
        <Logo />
        <div className="grow" />
        <span className="nav-item hide-m"><Icon name="globe" />INR · EN</span>
        <button className="nav-item hide-m" disabled title={notBuilt}><Icon name="home" />List your property</button>
        <Link to="/messages" className="nav-item" aria-label="Messages"><Icon name="bell" size={24} /></Link>
        <UserMenu />
      </div>
      {tabs && (
        <nav className="nav-tabs" aria-label="Travel products">
          <Link to="/" className={`nav-tab${loc.pathname === '/' ? ' on' : ''}`}><Icon name="bed" />Stays</Link>
          <button className="nav-tab" disabled title={notBuilt}><Icon name="plane" />Flights</button>
          <button className="nav-tab" disabled title={notBuilt}><Icon name="car" />Car rental</button>
          <button className="nav-tab" disabled title={notBuilt}><Icon name="compass" />Attractions</button>
          <Link to="/planner" className="nav-tab ai"><Icon name="sparkle" />AI Trip Planner</Link>
        </nav>
      )}
    </header>
  );
}

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Search', icon: 'search' },
  { to: '/planner', label: 'Planner', icon: 'sparkle' },
  { to: '/trips', label: 'Trips', icon: 'briefcase' },
  { to: '/saved', label: 'Saved', icon: 'heart' },
  { to: '/account', label: 'Account', icon: 'user' },
];

function TabBar() {
  return (
    <nav className="tabbar no-print" aria-label="Main">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>
          <span className="ic"><Icon name={t.icon} size={22} /></span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="page">
        <Logo />
        <span className="row wrap">
          <DemoTag label="Prototype" title="Hackathon prototype. No real bookings or payments." />
          Hackathon prototype. No real stays are booked and no payment is taken.
        </span>
      </div>
    </footer>
  );
}

/** Full-height screens (map, planner, messages) drop the footer, as they do in Figma. */
export function Shell({ tabs = false, footer = true }: { tabs?: boolean; footer?: boolean }) {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <NavBar tabs={tabs} />
      <main><Outlet /></main>
      {footer && <Footer />}
      <TabBar />
    </>
  );
}
