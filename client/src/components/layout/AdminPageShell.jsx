import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getSecurityAlerts } from '../../api/securityAlertApi.js';
import useAdminAuth from '../../hooks/useAdminAuth.js';
import useAdminTheme from '../../hooks/useAdminTheme.js';
import { adminPermissions, getAdminRoleLabel } from '../../data/adminAccess.js';
import AppIcon from '../common/AppIcon.jsx';
import AdminNav from './AdminNav.jsx';
import TriCoreLogo from '../common/TriCoreLogo.jsx';
import { formatDateTime } from '../../utils/formatters.js';

const getAlertIconName = (alert) => {
  if (alert?.category === 'contact') {
    return 'users';
  }

  if (alert?.category === 'registration') {
    return 'registrations';
  }

  if (alert?.category === 'payment') {
    return 'accounting';
  }

  return 'security';
};

export default function AdminPageShell({ children, description, title }) {
  const { hasAnyPermission, logout, user } = useAdminAuth();
  const { isDarkTheme, theme } = useAdminTheme();
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [alertSummary, setAlertSummary] = useState({ items: [], openCount: 0 });
  const canSeeSecurityAlerts = hasAnyPermission([
    adminPermissions.overview,
    adminPermissions.reports,
    adminPermissions.settings
  ]);

  useEffect(() => {
    if (!canSeeSecurityAlerts) {
      setAlertSummary({ items: [], openCount: 0 });
      return undefined;
    }

    let ignore = false;

    const loadAlerts = async () => {
      try {
        const response = await getSecurityAlerts({ status: 'open', limit: 5 });

        if (!ignore) {
          setAlertSummary({
            items: response.items || [],
            openCount: response.openCount || 0
          });
        }
      } catch {
        if (!ignore) {
          setAlertSummary({ items: [], openCount: 0 });
        }
      }
    };

    loadAlerts();
    const intervalId = window.setInterval(loadAlerts, 45000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [canSeeSecurityAlerts]);

  return (
    <div
      className={`min-h-screen ${
        isDarkTheme
          ? 'admin-theme-dark bg-[radial-gradient(circle_at_top_left,#1e293b,transparent_26%),linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)]'
          : 'admin-theme-light bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_28%),linear-gradient(180deg,#f8fbff_0%,#f1f5f9_45%,#eef2ff_100%)]'
      }`}
      data-admin-theme={theme}
    >
      <div
        className={`sticky top-0 z-[80] border-b backdrop-blur ${
          isDarkTheme
            ? 'border-slate-800 bg-slate-950/90'
            : 'border-slate-200 bg-white/90'
        }`}
      >
        <div className="container-shell relative z-[90] flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? 'Close admin navigation menu' : 'Open admin navigation menu'}
            className={`absolute right-0 top-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition md:hidden ${
              isDarkTheme
                ? 'border-slate-700 bg-slate-900 text-white hover:bg-slate-800'
                : 'border-brand-blue/20 bg-white text-brand-blue hover:bg-brand-mist'
            }`}
            onClick={() => {
              setMobileNavOpen((current) => !current);
              setAlertsOpen(false);
            }}
            type="button"
          >
            <span className="relative h-4 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition ${
                  mobileNavOpen ? 'translate-y-[7px] rotate-45' : ''
                }`.trim()}
              />
              <span
                className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition ${
                  mobileNavOpen ? 'opacity-0' : ''
                }`.trim()}
              />
              <span
                className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition ${
                  mobileNavOpen ? '-translate-y-[7px] -rotate-45' : ''
                }`.trim()}
              />
            </span>
          </button>
          <div className="flex items-start gap-4 pr-16 md:pr-0">
            <TriCoreLogo
              markClassName="h-12 w-12"
              subtitle="Operations Console"
              subtitleClassName="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange"
            />
            <div className="min-w-0">
              <p className={`break-words text-sm ${isDarkTheme ? 'text-slate-300' : 'text-slate-500'}`}>
                Signed in as {user?.name} ({user?.username})
                {user?.role ? ` • ${getAdminRoleLabel(user)}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {canSeeSecurityAlerts ? (
              <div className="relative z-[100]">
                <button
                  className="btn-secondary w-full gap-2 sm:w-auto"
                  onClick={() => {
                    setAlertsOpen((current) => !current);
                    setMobileNavOpen(false);
                  }}
                  type="button"
                >
                  <AppIcon className="h-4 w-4" name="bell" />
                  Alerts
                  {alertSummary.openCount ? (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {alertSummary.openCount}
                    </span>
                  ) : null}
                </button>
                {alertsOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[140] w-[min(92vw,340px)] rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-soft">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                          Critical Alerts
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {alertSummary.openCount || 0} open notifications
                        </p>
                      </div>
                      <Link
                        className="text-sm font-semibold text-brand-blue"
                        onClick={() => setAlertsOpen(false)}
                        to="/admin-portal/reports?tab=security"
                      >
                        Open
                      </Link>
                    </div>
                    <div className="mt-4 space-y-3">
                      {alertSummary.items.length ? (
                        alertSummary.items.map((alert) => (
                          <div className="rounded-3xl bg-slate-50 p-4" key={alert._id}>
                            <div className="flex items-start gap-3">
                              <div
                                className={`rounded-2xl p-2 ${
                                  alert.severity === 'critical'
                                    ? 'bg-red-100 text-red-600'
                                    : alert.severity === 'high'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-sky-100 text-sky-700'
                                }`}
                              >
                                <AppIcon className="h-4 w-4" name={getAlertIconName(alert)} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-950">{alert.title}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{alert.message}</p>
                                <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                                  {formatDateTime(alert.lastSeenAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                          No open admin alerts right now.
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <button className="btn-secondary w-full gap-2 sm:w-auto" onClick={logout} type="button">
              <AppIcon className="h-4 w-4" name="logout" />
              Logout
            </button>
          </div>
        </div>
        <AdminNav
          className="container-shell pb-4 md:hidden"
          mobileOpen={mobileNavOpen}
          onMobileOpenChange={setMobileNavOpen}
          showDesktop={false}
          showMobile
          showMobileTrigger={false}
        />
      </div>
      <div className="container-shell py-6 sm:py-10 lg:py-16">
        <div
          className={`mb-6 rounded-[2rem] border p-5 shadow-soft backdrop-blur sm:mb-8 sm:p-8 ${
            isDarkTheme
              ? 'border-slate-800 bg-slate-900/80'
              : 'border-slate-200 bg-white/75'
          }`}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-orange">
                Admin Portal
              </p>
              <h1 className="mt-4 text-4xl font-bold">{title}</h1>
              <p className={`mt-4 max-w-2xl ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
                {description}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`rounded-3xl px-5 py-4 ${isDarkTheme ? 'bg-slate-800' : 'bg-brand-mist'}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
                  Signed In Role
                </p>
                <p className="mt-2 text-lg font-bold text-slate-950">{getAdminRoleLabel(user)}</p>
              </div>
              <div className={`rounded-3xl px-5 py-4 ${isDarkTheme ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Open Alerts
                </p>
                <p className="mt-2 text-lg font-bold text-slate-950">{alertSummary.openCount || 0}</p>
              </div>
            </div>
          </div>
        </div>
        <AdminNav showMobile={false} />
        {children}
      </div>
    </div>
  );
}
