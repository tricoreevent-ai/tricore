import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import AppIcon from '../common/AppIcon.jsx';
import {
  adminPermissions,
  hasAnyAdminPermission
} from '../../data/adminAccess.js';
import useAdminAuth from '../../hooks/useAdminAuth.js';

const adminLinks = [
  { to: '/admin-portal', label: 'Overview', icon: 'overview', permissions: [adminPermissions.overview] },
  { to: '/admin-portal/events', label: 'Events', icon: 'events', permissions: [adminPermissions.events] },
  {
    to: '/admin-portal/registrations',
    label: 'Registrations',
    icon: 'registrations',
    permissions: [adminPermissions.registrations]
  },
  { to: '/admin-portal/matches', label: 'Matches', icon: 'matches', permissions: [adminPermissions.matches] },
  {
    to: '/admin-portal/accounting',
    label: 'Accounting',
    icon: 'accounting',
    permissions: [adminPermissions.accountingTransactions]
  },
  {
    to: '/admin-portal/reports',
    label: 'Reports',
    icon: 'reports',
    permissions: [adminPermissions.reports, adminPermissions.accountingReports]
  },
  { to: '/admin-portal/users', label: 'Users', icon: 'users', permissions: [adminPermissions.users] },
  { to: '/admin-portal/settings', label: 'Settings', icon: 'settings', permissions: [adminPermissions.settings] }
];

const alwaysVisibleLinks = [{ to: '/admin-portal/user-manual', label: 'User Manual', icon: 'book' }];

export default function AdminNav({
  className = '',
  mobileOpen: controlledMobileOpen,
  onMobileOpenChange,
  showDesktop = true,
  showMobile = true,
  showMobileTrigger = true
}) {
  const [uncontrolledMobileOpen, setUncontrolledMobileOpen] = useState(false);
  const location = useLocation();
  const { user } = useAdminAuth();
  const visibleLinks = adminLinks.filter((link) =>
    hasAnyAdminPermission(user, link.permissions)
  );
  const combinedLinks = [...visibleLinks, ...alwaysVisibleLinks];
  const mobileOpen =
    controlledMobileOpen !== undefined ? controlledMobileOpen : uncontrolledMobileOpen;
  const setMobileOpen = onMobileOpenChange || setUncontrolledMobileOpen;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, user?._id]);

  return (
    <div className={className || 'mb-8'}>
      {showMobile ? (
        <div className="md:hidden">
          {showMobileTrigger ? (
            <button
              aria-expanded={mobileOpen}
              className="flex w-full items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white/90 px-4 py-3 text-left shadow-soft backdrop-blur"
              onClick={() => setMobileOpen(!mobileOpen)}
              type="button"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  Admin Sections
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {mobileOpen ? 'Hide navigation' : 'Open navigation'}
                </p>
              </div>
              <AppIcon
                className="h-5 w-5 text-brand-blue"
                name={mobileOpen ? 'chevronUp' : 'chevronDown'}
              />
            </button>
          ) : null}

          {mobileOpen ? (
            <div
              className={`grid gap-2 rounded-[1.5rem] border border-slate-200 bg-white/90 p-2 shadow-soft backdrop-blur ${
                showMobileTrigger ? 'mt-3' : ''
              }`}
            >
              {combinedLinks.map((link) => (
                <NavLink
                  key={link.to}
                  className={({ isActive }) =>
                    `flex min-h-[52px] items-center justify-start gap-3 rounded-[1.2rem] px-4 py-3 text-left text-sm font-semibold transition ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-sm'
                        : 'text-slate-600 hover:bg-brand-mist hover:text-brand-blue'
                    }`
                  }
                  end={link.to === '/admin-portal'}
                  onClick={() => setMobileOpen(false)}
                  to={link.to}
                >
                  <span className="rounded-full bg-white/15 p-1">
                    <AppIcon className="h-4 w-4" name={link.icon} />
                  </span>
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {showDesktop ? (
        <div className="hidden gap-2 rounded-[2rem] border border-slate-200 bg-white/85 p-2 shadow-soft backdrop-blur md:grid md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
          {combinedLinks.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) =>
                `flex min-h-[52px] items-center justify-center gap-2 rounded-[1.2rem] px-4 py-3 text-center text-sm font-semibold transition ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-slate-600 hover:bg-brand-mist hover:text-brand-blue'
                }`
              }
              end={link.to === '/admin-portal'}
              to={link.to}
            >
              <span className="rounded-full bg-white/15 p-1">
                <AppIcon className="h-4 w-4" name={link.icon} />
              </span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      ) : null}
    </div>
  );
}
