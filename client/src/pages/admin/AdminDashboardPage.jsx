import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getAdminDashboard } from '../../api/dashboardApi.js';
import AdminCalendarPanel from '../../components/admin/AdminCalendarPanel.jsx';
import AppIcon from '../../components/common/AppIcon.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import FormAlert from '../../components/common/FormAlert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import AdminPageShell from '../../components/layout/AdminPageShell.jsx';
import { adminPermissions } from '../../data/adminAccess.js';
import useAdminAuth from '../../hooks/useAdminAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js';

function RevenueTrendChart({ items = [] }) {
  const maxValue = Math.max(...items.map((item) => item.totalRevenue || 0), 1);

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      {items.length ? (
        items.map((item) => {
          const heightPercent = Math.max(18, Math.round(((item.totalRevenue || 0) / maxValue) * 100));

          return (
            <div className="flex flex-col items-center gap-3" key={item.month}>
              <div className="flex h-44 w-full items-end rounded-[1.75rem] bg-slate-50 p-3">
                <div
                  className="w-full rounded-[1.25rem] bg-[linear-gradient(180deg,#0f5fdb,#38bdf8,#f97316)]"
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatCurrency(item.totalRevenue)}
                </p>
              </div>
            </div>
          );
        })
      ) : (
        <p className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Revenue trend data will appear after confirmed payments are recorded.
        </p>
      )}
    </div>
  );
}

function HorizontalBarList({ items = [] }) {
  const maxValue = Math.max(...items.map((item) => item.totalRegistrations || 0), 1);

  return (
    <div className="space-y-4">
      {items.length ? (
        items.map((item) => (
          <div className="rounded-3xl bg-slate-50 p-4" key={item.sportType}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-950">{item.sportType}</p>
              <p className="text-sm font-medium text-slate-500">{item.totalRegistrations} registrations</p>
            </div>
            <div className="mt-3 h-3 rounded-full bg-white">
              <div
                className="h-3 rounded-full bg-[linear-gradient(90deg,#0f5fdb,#38bdf8)]"
                style={{
                  width: `${Math.max(12, Math.round(((item.totalRegistrations || 0) / maxValue) * 100))}%`
                }}
              />
            </div>
          </div>
        ))
      ) : (
        <p className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Sport-wise registration data will appear once events start receiving entries.
        </p>
      )}
    </div>
  );
}

function QuickActionTile({ description, icon, title, to }) {
  return (
    <Link
      className="group rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-brand-blue/30 sm:p-5"
      to={to}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue transition group-hover:bg-brand-blue group-hover:text-white">
          <AppIcon className="h-5 w-5" name={icon} />
        </div>
        <AppIcon className="h-4 w-4 text-slate-400" name="chevronRight" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}

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

export default function AdminDashboardPage() {
  const { hasPermission } = useAdminAuth();
  const [dashboard, setDashboard] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const sponsorLink =
    typeof window === 'undefined'
      ? '/partner-access'
      : `${window.location.origin}/partner-access`;

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const response = await getAdminDashboard();
        setDashboard(response);
        setError('');
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load the admin overview.'));
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const recentPaymentsColumns = useMemo(
    () => [
      {
        key: 'user',
        header: 'User',
        accessor: (payment) => `${payment.userId?.name || ''} ${payment.userId?.email || ''}`,
        cell: (payment) => (
          <div>
            <p className="font-semibold text-slate-900">{payment.userId?.name || 'Unknown user'}</p>
            <p className="text-slate-500">{payment.userId?.email || '-'}</p>
          </div>
        )
      },
      {
        key: 'event',
        header: 'Event',
        accessor: (payment) => payment.eventId?.name || '',
        cell: (payment) => <span className="text-slate-600">{payment.eventId?.name || '-'}</span>
      },
      {
        key: 'amount',
        header: 'Amount',
        accessor: (payment) => payment.amount || 0,
        exportValue: (payment) => formatCurrency(payment.amount),
        cell: (payment) => <span className="text-slate-600">{formatCurrency(payment.amount)}</span>
      },
      {
        key: 'date',
        header: 'Date',
        accessor: (payment) => payment.createdAt,
        sortValue: (payment) => new Date(payment.createdAt).getTime(),
        exportValue: (payment) => formatDate(payment.createdAt),
        cell: (payment) => <span className="text-slate-600">{formatDate(payment.createdAt)}</span>
      }
    ],
    []
  );

  const quickActions = [
    {
      to: '/admin-portal/events',
      title: 'Event Control',
      icon: 'events',
      permission: adminPermissions.events,
      description: 'Publish tournaments, edit schedules, and manage registration visibility.'
    },
    {
      to: '/admin-portal/registrations',
      title: 'Registration Review',
      icon: 'registrations',
      permission: adminPermissions.registrations,
      description: 'Confirm teams, review payment proofs, and update participant details.'
    },
    {
      to: '/admin-portal/accounting',
      title: 'Transaction Ledger',
      icon: 'accounting',
      permission: adminPermissions.accountingTransactions,
      description: 'Record income and expense movement without mixing it with reporting views.'
    },
    {
      to: '/admin-portal/reports',
      title: 'Reports Hub',
      icon: 'reports',
      permission: hasPermission(adminPermissions.reports)
        ? adminPermissions.reports
        : adminPermissions.accountingReports,
      description: 'Open finance reports, activity history, and critical alerts from one workspace.'
    }
  ].filter((action) => hasPermission(action.permission));

  if (loading) {
    return <LoadingSpinner label="Loading admin overview..." />;
  }

  return (
    <AdminPageShell
      description="A visual command center for event health, revenue movement, critical alerts, and the next action your team should take."
      title="Admin Overview"
    >
      <FormAlert message={error} />

      {dashboard ? (
        <>
          <div className="grid gap-6 xl:grid-cols-4">
            <StatCard
              helper="Published"
              icon="events"
              subtitle="Active tournament entries in the current catalog."
              title="Total Events"
              tone="blue"
              value={dashboard.totalEvents}
            />
            <StatCard
              helper="Participants"
              icon="registrations"
              subtitle="All registrations recorded across events."
              title="Total Registrations"
              tone="emerald"
              value={dashboard.totalRegistrations}
            />
            <StatCard
              helper="Confirmed"
              icon="revenue"
              subtitle="Confirmed payment revenue only."
              title="Total Revenue"
              tone="orange"
              value={formatCurrency(dashboard.totalRevenue)}
            />
            <StatCard
              helper="Alerts"
              icon="warning"
              subtitle="Open contact, payment, and system alerts waiting for review."
              title="Open Alerts"
              tone={(dashboard.openAlerts || dashboard.openSecurityAlerts) ? 'rose' : 'slate'}
              value={dashboard.openAlerts || dashboard.openSecurityAlerts || 0}
            />
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="panel p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    Revenue Momentum
                  </p>
                  <h2 className="mt-3 text-2xl font-bold">Confirmed payment trend</h2>
                </div>
                <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                  <AppIcon className="h-5 w-5" name="chart" />
                </div>
              </div>
              <div className="mt-6">
                <RevenueTrendChart items={dashboard.monthlyRevenueTrend || []} />
              </div>
            </section>

            <section className="panel p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    Participation Mix
                  </p>
                  <h2 className="mt-3 text-2xl font-bold">Registrations by sport</h2>
                </div>
                <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                  <AppIcon className="h-5 w-5" name="reports" />
                </div>
              </div>
              <div className="mt-6">
                <HorizontalBarList items={dashboard.sportRegistrationBreakdown || []} />
              </div>
            </section>
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="panel p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    Quick Navigation
                  </p>
                  <h2 className="mt-3 text-2xl font-bold">Jump into the next task</h2>
                </div>
                <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                  <AppIcon className="h-5 w-5" name="sparkle" />
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {quickActions.map((action) => (
                  <QuickActionTile key={action.to} {...action} />
                ))}
              </div>
            </section>

            <section className="panel p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    Payment States
                  </p>
                  <h2 className="mt-3 text-2xl font-bold">Status distribution</h2>
                </div>
                <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                  <AppIcon className="h-5 w-5" name="security" />
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  ['Confirmed', dashboard.paymentStatusCounts?.Confirmed || 0, 'bg-emerald-500'],
                  ['Pending', dashboard.paymentStatusCounts?.Pending || 0, 'bg-slate-400'],
                  ['Under Review', dashboard.paymentStatusCounts?.['Under Review'] || 0, 'bg-amber-500'],
                  ['Failed', dashboard.paymentStatusCounts?.Failed || 0, 'bg-rose-500']
                ].map(([label, count, tone]) => (
                  <div className="rounded-3xl bg-slate-50 p-4" key={label}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">{label}</p>
                      <p className="text-sm font-medium text-slate-500">{count}</p>
                    </div>
                    <div className="mt-3 h-3 rounded-full bg-white">
                      <div
                        className={`h-3 rounded-full ${tone}`.trim()}
                        style={{
                          width: `${Math.max(
                            10,
                            Math.round(
                              ((count || 0) /
                                Math.max(
                                  1,
                                  (dashboard.paymentStatusCounts?.Confirmed || 0) +
                                    (dashboard.paymentStatusCounts?.Pending || 0) +
                                    (dashboard.paymentStatusCounts?.['Under Review'] || 0) +
                                    (dashboard.paymentStatusCounts?.Failed || 0)
                                )) *
                                100
                            )
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="panel mt-8 p-4 sm:p-6">
            <AdminCalendarPanel
              emptyMessage="No events, holidays, or sports fixtures fall inside the current 30-day overview window."
              initialMonth={dashboard.calendarFeed?.dateFrom}
              items={dashboard.calendarFeed?.items || []}
              title="30-Day Planning Calendar"
            />
          </section>

          <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="panel p-4 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Recent Payments</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    The latest confirmed payment movement across all events.
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <DataTable
                  columns={recentPaymentsColumns}
                  emptyMessage="No confirmed payments have been recorded yet."
                  exportFileName="recent-payments.csv"
                  initialPageSize={5}
                  pageSizeOptions={[5, 10, 20]}
                  rowKey="_id"
                  rows={dashboard.recentPayments || []}
                  searchPlaceholder="Search recent payments"
                />
              </div>
            </section>

            <div className="space-y-8">
              <section className="panel p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Recent Alerts</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      The most recent critical events that may need admin follow-up.
                    </p>
                  </div>
                  <Link className="btn-secondary w-full gap-2 sm:w-auto" to="/admin-portal/reports?tab=security">
                    <AppIcon className="h-4 w-4" name="bell" />
                    Open Alerts
                  </Link>
                </div>
                <div className="mt-6 space-y-4">
                  {(dashboard.latestAlerts || []).length ? (
                    dashboard.latestAlerts.map((alert) => (
                      <div className="rounded-3xl bg-slate-50 p-4" key={alert._id}>
                        <div className="flex items-start gap-3">
                          <div
                            className={`rounded-2xl p-3 ${
                              alert.severity === 'critical'
                                ? 'bg-red-100 text-red-600'
                                : alert.severity === 'high'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-sky-100 text-sky-700'
                            }`}
                          >
                            <AppIcon className="h-5 w-5" name={getAlertIconName(alert)} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-950">{alert.title}</p>
                              <span className="badge bg-white text-slate-600">
                                {alert.category || 'security'}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-500">{alert.message}</p>
                            <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                              {formatDateTime(alert.lastSeenAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No open alerts are waiting right now.
                    </p>
                  )}
                </div>
              </section>

              <section className="panel p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Sponsorship Share Link</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Keep this direct link for partner outreach instead of exposing it in the public menu.
                    </p>
                  </div>
                  <button
                    className="btn-secondary w-full gap-2 sm:w-auto"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(sponsorLink);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 2000);
                      } catch {
                        setCopied(false);
                      }
                    }}
                    type="button"
                  >
                    <AppIcon className="h-4 w-4" name="copy" />
                    {copied ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
                <div className="mt-5 rounded-3xl bg-slate-50 p-5">
                  <p className="break-all text-sm font-medium text-slate-700">{sponsorLink}</p>
                </div>
              </section>

              <section className="panel p-4 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Upcoming Event Window</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      The next events that likely need registrations, scheduling, or accounting attention.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-brand-mist p-3 text-brand-blue">
                    <AppIcon className="h-5 w-5" name="calendar" />
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {(dashboard.upcomingEvents || []).length ? (
                    dashboard.upcomingEvents.map((event) => (
                      <div className="rounded-3xl bg-slate-50 p-4" key={event._id}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-950">{event.name}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {event.sportType} • {event.venue}
                            </p>
                          </div>
                          <span className="badge bg-white text-slate-700">
                            {event.registrationCount || 0}/{event.maxParticipants || '-'}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                          <p>
                            <span className="font-semibold text-slate-900">Start:</span>{' '}
                            {formatDate(event.startDate)}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-900">Registration Deadline:</span>{' '}
                            {event.registrationDeadline
                              ? formatDate(event.registrationDeadline)
                              : 'Coming Soon / Not Set'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-3xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No upcoming events are scheduled right now.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </>
      ) : null}
    </AdminPageShell>
  );
}
