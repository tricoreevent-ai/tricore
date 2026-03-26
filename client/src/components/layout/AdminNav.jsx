import { NavLink } from 'react-router-dom';

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

export default function AdminNav() {
  const { user } = useAdminAuth();
  const visibleLinks = adminLinks.filter((link) =>
    hasAnyAdminPermission(user, link.permissions)
  );
  const combinedLinks = [...visibleLinks, ...alwaysVisibleLinks];

  return (
    <div className="mb-8">
      <div className="grid gap-2 rounded-[2rem] border border-slate-200 bg-white/85 p-2 shadow-soft backdrop-blur sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
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
    </div>
  );
}
