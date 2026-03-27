import { useEffect, useMemo, useState } from 'react';

import {
  exportAudienceUsers,
  getAudienceUsers,
  sendAudienceCampaign
} from '../../api/audienceApi.js';
import AppIcon from '../common/AppIcon.jsx';
import DataTable from '../common/DataTable.jsx';
import FormAlert from '../common/FormAlert.jsx';
import StatCard from '../common/StatCard.jsx';
import TypeaheadSelect from '../common/TypeaheadSelect.jsx';
import { downloadBlob } from '../../utils/download.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatDate, formatDateTime } from '../../utils/formatters.js';

const segmentOptions = [
  { value: 'all', label: 'All Contacts' },
  { value: 'registered', label: 'Registered Users' },
  { value: 'current', label: 'Current Participants' },
  { value: 'previous', label: 'Previous Participants' },
  { value: 'interested', label: 'Interested Users' }
];

const sortOptions = [
  { value: 'recent', label: 'Most Recent Activity' },
  { value: 'name', label: 'Name A-Z' }
];

const createInitialFilters = () => ({
  search: '',
  segment: 'all',
  eventId: '',
  sort: 'recent'
});

const createInitialReminderForm = () => ({
  subject: 'TriCore Events reminder',
  message:
    'We wanted to share the latest event update with you. Review the active tournaments and complete your registration if you plan to join.',
  ctaLabel: 'View Events',
  ctaUrl: '/events'
});

const formatEventDateRange = (event) => {
  if (!event?.startDate) {
    return '';
  }

  const start = formatDate(event.startDate);

  if (!event?.endDate || event.endDate === event.startDate) {
    return start;
  }

  return `${start} - ${formatDate(event.endDate)}`;
};

function EventSummaryList({ items, emptyLabel, limit = 2 }) {
  if (!items?.length) {
    return <span className="text-slate-400">{emptyLabel}</span>;
  }

  const visibleItems = items.slice(0, limit);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div className="space-y-2">
      {visibleItems.map((item) => (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2" key={`${item.eventId}-${item.source}-${item.eventName}`}>
          <p className="font-semibold text-slate-900">{item.eventName}</p>
          <p className="mt-1 text-xs text-slate-500">
            {item.venue ? `${item.venue} • ` : ''}
            {formatEventDateRange(item)}
          </p>
        </div>
      ))}
      {hiddenCount > 0 ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          +{hiddenCount} more event{hiddenCount > 1 ? 's' : ''}
        </p>
      ) : null}
    </div>
  );
}

function AudienceDetailPanel({ user, onClose }) {
  if (!user) {
    return null;
  }

  const infoItems = [
    { label: 'Email', value: user.email || '-' },
    { label: 'Contact', value: user.contactNumber || '-' },
    { label: 'Auth Provider', value: user.authProvider || 'Manual interest' },
    {
      label: 'Last Login',
      value: user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'
    },
    {
      label: 'Last Engagement',
      value: user.lastEngagementAt ? formatDateTime(user.lastEngagementAt) : 'No activity yet'
    },
    {
      label: 'Campaign Status',
      value: user.preferences?.emailOptOut ? 'Unsubscribed from campaigns' : 'Email campaigns enabled'
    }
  ];

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            User Detail
          </p>
          <h3 className="mt-3 text-2xl font-bold">{user.name}</h3>
          <p className="mt-2 text-sm text-slate-500">{user.email}</p>
        </div>
        <button className="btn-secondary gap-2 px-4 py-2" onClick={onClose} type="button">
          <AppIcon className="h-4 w-4" name="close" />
          Close
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {infoItems.map((item) => (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4" key={item.label}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
            Current Events
          </p>
          <div className="mt-4">
            <EventSummaryList emptyLabel="No current events." items={user.currentEvents} limit={5} />
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
            Previous Events
          </p>
          <div className="mt-4">
            <EventSummaryList emptyLabel="No previous events." items={user.previousEvents} limit={5} />
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
            Interested Events
          </p>
          <div className="mt-4">
            <EventSummaryList emptyLabel="No interest records." items={user.interestedEvents} limit={5} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AudienceUsersWorkspace() {
  const [filters, setFilters] = useState(createInitialFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    totalAudience: 0,
    currentParticipants: 0,
    pastParticipants: 0,
    interestedContacts: 0,
    emailOptOutCount: 0
  });
  const [eventOptions, setEventOptions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeUser, setActiveUser] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [reminderForm, setReminderForm] = useState(createInitialReminderForm);
  const [reminderError, setReminderError] = useState('');
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadAudience = async () => {
      setLoading(true);

      try {
        const response = await getAudienceUsers({
          ...filters,
          page,
          limit: pageSize
        });

        if (cancelled) {
          return;
        }

        setRows(response.items || []);
        setSummary(response.summary || {});
        setEventOptions(response.filters?.eventOptions || []);
        setTotalCount(response.totalCount || 0);
        setError('');
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiErrorMessage(requestError, 'Unable to load audience users.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAudience();

    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize]);

  const eventSelectOptions = useMemo(
    () => [{ value: '', label: 'All Events' }, ...eventOptions],
    [eventOptions]
  );

  const selectedEventLabel =
    eventSelectOptions.find((option) => option.value === filters.eventId)?.label || 'All events';

  const tableColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        sortable: false,
        accessor: (row) => row.name,
        searchValue: (row) => `${row.name} ${row.email}`,
        cell: (row) => (
          <div>
            <p className="font-semibold text-slate-900">{row.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              {row.authProvider === 'google' ? 'Google account' : row.userId ? 'Registered account' : 'Lead contact'}
            </p>
          </div>
        )
      },
      {
        key: 'email',
        header: 'Email',
        sortable: false,
        accessor: (row) => row.email,
        cell: (row) => (
          <div>
            <p className="font-medium text-slate-700">{row.email}</p>
            <p className="mt-1 text-xs text-slate-500">{row.contactNumber || 'No contact number'}</p>
          </div>
        )
      },
      {
        key: 'currentEvents',
        header: 'Current Events',
        sortable: false,
        accessor: (row) => row.currentEvents.length,
        exportValue: (row) => row.currentEvents.map((item) => item.eventName).join(' | '),
        cell: (row) => <EventSummaryList emptyLabel="No current events" items={row.currentEvents} />
      },
      {
        key: 'previousEvents',
        header: 'Previous Events',
        sortable: false,
        accessor: (row) => row.previousEvents.length,
        exportValue: (row) => row.previousEvents.map((item) => item.eventName).join(' | '),
        cell: (row) => <EventSummaryList emptyLabel="No previous events" items={row.previousEvents} />
      },
      {
        key: 'interestedEvents',
        header: 'Interested Events',
        sortable: false,
        accessor: (row) => row.interestedEvents.length,
        exportValue: (row) => row.interestedEvents.map((item) => item.eventName).join(' | '),
        cell: (row) => <EventSummaryList emptyLabel="No interest saved" items={row.interestedEvents} />
      },
      {
        key: 'status',
        header: 'Campaign Status',
        sortable: false,
        accessor: (row) => (row.preferences?.emailOptOut ? 'Unsubscribed' : 'Subscribed'),
        exportValue: (row) => (row.preferences?.emailOptOut ? 'Unsubscribed' : 'Subscribed'),
        cell: (row) => (
          <div>
            <span
              className={`badge ${
                row.preferences?.emailOptOut
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {row.preferences?.emailOptOut ? 'Unsubscribed' : 'Subscribed'}
            </span>
            <p className="mt-2 text-xs text-slate-500">
              {row.preferences?.lastCampaignAt
                ? `Last campaign ${formatDateTime(row.preferences.lastCampaignAt)}`
                : 'No campaign sent yet'}
            </p>
          </div>
        )
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        exportable: false,
        accessor: () => '',
        cell: (row) => (
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary min-h-9 gap-2 px-3 py-2 text-xs"
              onClick={() => {
                setActiveUser(row);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              type="button"
            >
              <AppIcon className="h-4 w-4" name="info" />
              Details
            </button>
          </div>
        )
      }
    ],
    []
  );

  const handleFilterChange = (field, value) => {
    setFilters((current) => ({
      ...current,
      [field]: value
    }));
    setPage(1);
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const response = await exportAudienceUsers(filters);
      downloadBlob(response.blob, response.filename);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to export audience users.'));
    } finally {
      setExporting(false);
    }
  };

  const handleSendReminder = async (event) => {
    event.preventDefault();
    setSendingReminder(true);
    setReminderError('');
    setReminderMessage('');

    try {
      const response = await sendAudienceCampaign({
        name: `Audience Reminder ${new Date().toISOString().slice(0, 10)}`,
        subject: reminderForm.subject,
        previewText: `Reminder for ${selectedEventLabel}`,
        message: reminderForm.message,
        ctaLabel: reminderForm.ctaLabel,
        ctaUrl: reminderForm.ctaUrl,
        targetMode: 'filtered',
        filters,
        channels: {
          email: true,
          sms: false,
          whatsapp: false
        }
      });

      setReminderMessage(
        response.failedCount
          ? `Sent ${response.sentCount} reminder email(s). ${response.failedCount} failed.`
          : `Sent ${response.sentCount} reminder email(s) to the current filtered audience.`
      );
    } catch (requestError) {
      setReminderError(getApiErrorMessage(requestError, 'Unable to send reminder.'));
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          helper="Filtered total"
          icon="users"
          subtitle="Audience contacts loaded from registrations, interests, and user accounts."
          title="Audience Users"
          value={summary.totalAudience || 0}
        />
        <StatCard
          helper="Current"
          icon="calendar"
          subtitle="Users who are part of events that are still active."
          title="Current Participants"
          tone="emerald"
          value={summary.currentParticipants || 0}
        />
        <StatCard
          helper="Previous"
          icon="history"
          subtitle="Users who took part in earlier completed events."
          title="Past Participants"
          tone="slate"
          value={summary.pastParticipants || 0}
        />
        <StatCard
          helper="Interest pool"
          icon="sparkle"
          subtitle="Contacts who asked to be notified about event openings."
          title="Interested Users"
          tone="orange"
          value={summary.interestedContacts || 0}
        />
        <StatCard
          helper="Opt-out"
          icon="mailOff"
          subtitle="Audience contacts who unsubscribed from campaign emails."
          title="Email Opt Outs"
          tone="rose"
          value={summary.emailOptOutCount || 0}
        />
      </div>

      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Audience Directory
            </p>
            <h2 className="mt-3 text-2xl font-bold">Registered and interested users</h2>
            <p className="mt-2 text-sm text-slate-500">
              Results load in chunks with pagination, so the admin portal stays responsive even as the audience grows.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="btn-secondary gap-2"
              disabled={loading}
              onClick={() => {
                setPage(1);
                setFilters(createInitialFilters());
              }}
              type="button"
            >
              <AppIcon className="h-4 w-4" name="refresh" />
              Reset Filters
            </button>
            <button
              className="btn-secondary gap-2"
              disabled={exporting}
              onClick={handleExport}
              type="button"
            >
              <AppIcon className="h-4 w-4" name="export" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        <FormAlert message={error} />

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="audience-search">
              Search Users
            </label>
            <input
              className="input"
              id="audience-search"
              onChange={(event) => handleFilterChange('search', event.target.value)}
              placeholder="Search name, email, phone, or event"
              value={filters.search}
            />
          </div>
          <div>
            <label className="label" htmlFor="audience-segment">
              Audience Segment
            </label>
            <TypeaheadSelect
              id="audience-segment"
              onChange={(event) => handleFilterChange('segment', event.target.value)}
              options={segmentOptions}
              placeholder="Select segment"
              searchPlaceholder="Search segments"
              value={filters.segment}
            />
          </div>
          <div>
            <label className="label" htmlFor="audience-event">
              Event
            </label>
            <TypeaheadSelect
              id="audience-event"
              onChange={(event) => handleFilterChange('eventId', event.target.value)}
              options={eventSelectOptions}
              placeholder="Select event"
              searchPlaceholder="Search events"
              value={filters.eventId}
            />
          </div>
          <div>
            <label className="label" htmlFor="audience-sort">
              Sort Order
            </label>
            <TypeaheadSelect
              id="audience-sort"
              onChange={(event) => handleFilterChange('sort', event.target.value)}
              options={sortOptions}
              placeholder="Select sort order"
              searchPlaceholder="Search sort order"
              value={filters.sort}
            />
          </div>
        </div>

        <div className="mt-6">
          <DataTable
            columns={tableColumns}
            emptyMessage="No audience users match the current filters."
            exportable={false}
            loading={loading}
            loadingLabel="Loading audience users..."
            rowKey="audienceKey"
            rows={rows}
            searchable={false}
            serverPagination={{
              page,
              pageSize,
              totalCount,
              onPageChange: setPage,
              onPageSizeChange: (value) => {
                setPageSize(value);
                setPage(1);
              }
            }}
            showMobileCards
          />
        </div>
      </section>

      <AudienceDetailPanel onClose={() => setActiveUser(null)} user={activeUser} />

      <section className="panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Quick Reminder
            </p>
            <h2 className="mt-3 text-2xl font-bold">Send a reminder to the filtered audience</h2>
            <p className="mt-2 text-sm text-slate-500">
              This sends a campaign-style email to the currently filtered result set, with unsubscribe support and one-email-per-recipient delivery.
            </p>
          </div>
          <div className="rounded-3xl bg-brand-mist px-4 py-3 text-sm font-semibold text-brand-blue">
            {totalCount} matching contact{totalCount === 1 ? '' : 's'}
          </div>
        </div>

        <FormAlert message={reminderError} />
        <FormAlert message={reminderMessage} type="success" />

        <form className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]" onSubmit={handleSendReminder}>
          <div className="space-y-4">
            <div>
              <label className="label" htmlFor="reminder-subject">
                Email Subject
              </label>
              <input
                className="input"
                id="reminder-subject"
                onChange={(event) =>
                  setReminderForm((current) => ({
                    ...current,
                    subject: event.target.value
                  }))
                }
                required
                value={reminderForm.subject}
              />
            </div>
            <div>
              <label className="label" htmlFor="reminder-message">
                Message
              </label>
              <textarea
                className="input min-h-40"
                id="reminder-message"
                onChange={(event) =>
                  setReminderForm((current) => ({
                    ...current,
                    message: event.target.value
                  }))
                }
                required
                value={reminderForm.message}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
            <div>
              <label className="label" htmlFor="reminder-cta-label">
                CTA Label
              </label>
              <input
                className="input"
                id="reminder-cta-label"
                onChange={(event) =>
                  setReminderForm((current) => ({
                    ...current,
                    ctaLabel: event.target.value
                  }))
                }
                value={reminderForm.ctaLabel}
              />
            </div>
            <div>
              <label className="label" htmlFor="reminder-cta-url">
                CTA URL
              </label>
              <input
                className="input"
                id="reminder-cta-url"
                onChange={(event) =>
                  setReminderForm((current) => ({
                    ...current,
                    ctaUrl: event.target.value
                  }))
                }
                placeholder="/events"
                value={reminderForm.ctaUrl}
              />
            </div>
            <div className="rounded-3xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
                Current Target
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-900">{selectedEventLabel}</p>
              <p className="mt-2 text-sm text-slate-500">
                Segment: {segmentOptions.find((item) => item.value === filters.segment)?.label || 'All Contacts'}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Search: {filters.search ? `"${filters.search}"` : 'No search filter'}
              </p>
            </div>
            <button className="btn-primary w-full gap-2" disabled={sendingReminder || !totalCount} type="submit">
              <AppIcon className="h-4 w-4" name="send" />
              {sendingReminder ? 'Sending Reminder...' : 'Send Reminder'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
