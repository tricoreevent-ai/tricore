import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

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
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/90 backdrop-blur">
      <div className="container-shell flex items-center justify-between py-4">
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

        <button className="btn-secondary md:hidden" onClick={() => setOpen((value) => !value)} type="button">
          Menu
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="container-shell space-y-4 py-4">
            {links.map((link) => (
              <NavLink
                key={link.to}
                className="block text-sm font-medium text-slate-600"
                onClick={() => setOpen(false)}
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <>
                <p className="text-sm text-slate-500">{user?.name}</p>
                <NavLink className="block text-sm font-medium text-slate-600" to="/dashboard">
                  Dashboard
                </NavLink>
                <button className="btn-secondary w-full" onClick={logout} type="button">
                  Logout
                </button>
              </>
            ) : (
              <GoogleLoginButton />
            )}
            <Link className="block text-sm font-semibold text-brand-blue" to="/admin-portal/login">
              Admin Portal
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
