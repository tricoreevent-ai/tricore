import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import useAuth from '../../hooks/useAuth.js';
import GoogleLoginButton from '../auth/GoogleLoginButton.jsx';
import TriCoreLogo from '../common/TriCoreLogo.jsx';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/events', label: 'Events' },
  { to: '/contact', label: 'Contact' }
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const mobileIdentity = user?.name || user?.email || 'Signed in';

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/90 backdrop-blur">
      <div className="container-shell flex items-center justify-between py-3 sm:py-4">
        <Link className="flex items-center gap-3" to="/">
          <TriCoreLogo
            markClassName="h-12 w-12"
            titleClassName="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-[1.85rem]"
            subtitleClassName="text-xs text-slate-500 sm:text-sm"
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition ${isActive ? 'text-brand-blue' : 'text-slate-600 hover:text-slate-950'}`
              }
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <>
              <NavLink className="text-sm font-medium text-slate-600 hover:text-slate-950" to="/dashboard">
                Dashboard
              </NavLink>
              <button className="btn-secondary" onClick={logout} type="button">
                Logout
              </button>
            </>
          ) : (
            <GoogleLoginButton />
          )}
          <Link className="text-sm font-semibold text-brand-blue" to="/admin-portal/login">
            Admin Portal
          </Link>
        </nav>

        <button
          aria-expanded={open}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-blue/20 bg-white text-brand-blue transition hover:bg-brand-mist md:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <span className="relative h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition ${open ? 'translate-y-[7px] rotate-45' : ''}`.trim()}
            />
            <span
              className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition ${open ? 'opacity-0' : ''}`.trim()}
            />
            <span
              className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition ${open ? '-translate-y-[7px] -rotate-45' : ''}`.trim()}
            />
          </span>
        </button>
      </div>

      {isAuthenticated ? (
        <div className="border-t border-slate-200/80 bg-white/95 md:hidden">
          <div className="container-shell flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-blue">
                Logged in
              </p>
              <p className="truncate text-sm font-semibold text-slate-900">{mobileIdentity}</p>
            </div>
            <Link className="btn-secondary shrink-0 px-4 py-2 text-xs" to="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="border-t border-slate-200 bg-white/98 shadow-soft md:hidden">
          <div className="container-shell space-y-4 py-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                onClick={() => setOpen(false)}
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <>
                <div className="rounded-2xl bg-brand-mist px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-blue">
                    Signed in
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{mobileIdentity}</p>
                </div>
                <NavLink className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700" to="/dashboard">
                  Dashboard
                </NavLink>
                <button className="btn-secondary w-full" onClick={logout} type="button">
                  Logout
                </button>
              </>
            ) : (
              <GoogleLoginButton />
            )}
            <Link className="block rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-brand-blue" to="/admin-portal/login">
              Admin Portal
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
