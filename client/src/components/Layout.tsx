import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { initials } from '../lib/format';
import { useAuth } from '../lib/session';
import { DemoTag, Icon } from './ui';
import type { IconName } from './icons';

export const Logo = () => <Link to="/" className="logo"><Icon name="wave" size={26} /><b style={{ fontWeight: 600 }}>Booking<span>.com</span></b></Link>;

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
      <button className="user-pill" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <span className="avatar accent">{initials(user.firstName, user.lastName)}</span>
        <span className="hide-m s" style={{ fontWeight: 500 }}>{user.firstName}</span>
      </button>
      {open && (
        <div className="pop" role="menu" style={{ left: 'auto', right: 0, minWidth: 200, padding: 8 }}>
          <ul onClick={() => setOpen(false)}>
            <li><button role="menuitem" onClick={() => nav('/trips')}><Icon name="briefcase" size={18} />My trips</button></li>
            <li><button role="menuitem" onClick={() => nav('/saved')}><Icon name="heart" size={18} />Saved</button></li>
            <li><button role="menuitem" onClick={() => nav('/messages')}><Icon name="message" size={18} />Messages</button></li>
            <li><button role="menuitem" onClick={() => nav('/account')}><Icon name="user" size={18} />Account</button></li>
            {user.role === 'ADMIN' && <li><button role="menuitem" onClick={() => nav('/admin')}><Icon name="sliders" size={18} />Admin dashboard</button></li>}
            <li><button role="menuitem" onClick={() => logout.mutate()}><Icon name="external" size={18} />Sign out</button></li>
          </ul>
        </div>
      )}
    </div>
  );
}

const NAV_LINKS = [
  { to: '/', label: 'Stays', match: (p: string) => p === '/' || p.startsWith('/search') || p.startsWith('/stays') || p.startsWith('/map') },
  { to: '/destinations', label: 'Destinations', match: (p: string) => p.startsWith('/destinations') },
  { to: '/planner', label: 'Trip planner', match: (p: string) => p.startsWith('/planner') },
  { to: '/trips', label: 'My trips', match: (p: string) => p.startsWith('/trips') || p.startsWith('/bookings') },
  { to: '/saved', label: 'Saved', match: (p: string) => p.startsWith('/saved') },
];

function NavBar() {
  const { pathname } = useLocation();
  return (
    <header className="nav">
      <div className="nav-top">
        <Logo />
        <nav className="nav-pill" aria-label="Main">
          {NAV_LINKS.map((l) => <Link key={l.to} to={l.to} className={l.match(pathname) ? 'on' : ''}>{l.label}</Link>)}
        </nav>
        <div className="nav-right">
          <Link to="/messages" className="round-cream" aria-label="Messages"><Icon name="bell" size={18} /></Link>
          <UserMenu />
        </div>
      </div>
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
      <div className="page footer-grid">
        <div className="stack" style={{ gap: 12 }}>
          <Logo />
          <p className="s muted" style={{ maxWidth: 300 }}>Verified stays across India, priced all-in.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <div className="stack"><b>Explore</b><Link to="/destinations">Destinations</Link><Link to="/planner">Trip planner</Link><Link to="/saved">Saved stays</Link></div>
          <div className="stack"><b>Hosts</b><Link to="/host">List your property</Link></div>
          <div className="stack"><b>Support</b><Link to="/help">Help centre</Link><Link to="/trips">My trips</Link><Link to="/about">About</Link></div>
        </nav>
      </div>
      <div className="page footer-base">
        <span className="row wrap"><DemoTag label="Prototype" title="Hackathon prototype. No real bookings or payments." />No real stays are booked and no payment is taken.</span>
      </div>
    </footer>
  );
}

/** Full-height screens (map, planner, messages) drop the footer, as they do in Figma. */
export function Shell({ footer = true }: { tabs?: boolean; footer?: boolean }) {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <NavBar />
      {/* Keyed by path, so each new page replays the entrance; filter and sort changes don't. */}
      <main key={pathname} className="route-in"><Outlet /></main>
      {footer && <Footer />}
      <TabBar />
    </>
  );
}
