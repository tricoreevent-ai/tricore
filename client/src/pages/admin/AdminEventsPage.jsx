import { useEffect, useMemo, useState } from 'react';

import {
  getAdminCalendarFeed,
  createEvent,
  deleteEvent,
  getAdminEventCatalog,
  getEventInterests,
  refreshCalendarHolidays,
  sendEventInterestEmail,
  updateEvent
} from '../../api/eventsApi.js';
import AdminCalendarPanel from '../../components/admin/AdminCalendarPanel.jsx';
import AdminFilterPanel from '../../components/admin/AdminFilterPanel.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import AppIcon from '../../components/common/AppIcon.jsx';
import FormAlert from '../../components/common/FormAlert.jsx';
import TypeaheadSelect from '../../components/common/TypeaheadSelect.jsx';
import EventForm from '../../components/events/EventForm.jsx';
import AdminPageShell from '../../components/layout/AdminPageShell.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { createDefaultDateRangeFilters } from '../../utils/dateRange.js';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js';

const createInitialFilters = () => createDefaultDateRangeFilters({
  visibility: 'all'
});

const visibilityOptions = [
  { value: 'all', label: 'All Events' },
  { value: 'visible', label: 'Visible Only' },
  { value: 'hidden', label: 'Hidden Only' }
];

const interestAudienceOptions = [
  { value: 'selected', label: 'Selected Contacts' },
  { value: 'pending', label: 'Pending Auto-Notify' },
  { value: 'all', label: 'All Interested Contacts' }
];

export default function AdminEventsPage() {
  const [draftFilters, setDraftFilters] = useState(createInitialFilters());
  const [activeFilters, setActiveFilters] = useState(createInitialFilters());
  const [catalogData, setCatalogData] = useState({ items: [], totalCount: 0, page: 1, limit: 20 });
  const [calendarFeed, setCalendarFeed] = useState({ items: [], dateFrom: '', dateTo: '' });
  const [catalogView, setCatalogView] = useState('list');
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editFocusToken, setEditFocusToken] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formResetCounter, setFormResetCounter] = useState(0);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [listError, setListError] = useState('');
  const [calendarMessage, setCalendarMessage] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarActionPending, setCalendarActionPending] = useState(false);
  const [actionEventId, setActionEventId] = useState('');
  const [actionType, setActionType] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [interestEvent, setInterestEvent] = useState(null);
  const [interestData, setInterestData] = useState({
    items: [],
    summary: {
      totalCount: 0,
      automatedNotifiedCount: 0,
      manualSentCount: 0,
      pendingCount: 0
    }
  });
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestError, setInterestError] = useState('');
  const [interestMessage, setInterestMessage] = useState('');
  const [selectedInterestIds, setSelectedInterestIds] = useState([]);
  const [manualEmailForm, setManualEmailForm] = useState({
    audience: 'selected',
    customMessage: ''
  });
  const [manualEmailPending, setManualEmailPending] = useState(false);

  const refreshCatalog = async (filters = activeFilters, nextPage = page, nextLimit = limit) => {
    setCatalogLoading(true);

    try {
      const response = await getAdminEventCatalog({
        ...filters,
        page: nextPage,
        limit: nextLimit
      });

      setCatalogData(response);
      setListError('');
    } catch (error) {
      setListError(getApiErrorMessage(error, 'Unable to load the event catalog.'));
    } finally {
      setCatalogLoading(false);
    }
  };

  const refreshCalendarFeed = async (filters = activeFilters) => {
    setCalendarLoading(true);

    try {
      const response = await getAdminCalendarFeed(filters);
      setCalendarFeed(response);
      setListError('');
    } catch (error) {
      setListError(getApiErrorMessage(error, 'Unable to load the planning calendar.'));
    } finally {
      setCalendarLoading(false);
    }
  };

  const loadEventInterests = async (eventItem, options = {}) => {
    setInterestEvent(eventItem);
    setInterestLoading(true);

    if (!options.preserveFlash) {
      setInterestError('');
      setInterestMessage('');
    }

    setSelectedInterestIds([]);

    try {
      const response = await getEventInterests(eventItem._id);
      setInterestData(response);
    } catch (error) {
      setInterestError(getApiErrorMessage(error, 'Unable to load interested contacts.'));
    } finally {
      setInterestLoading(false);
    }
  };

  const toggleInterestSelection = (interestId) => {
    setSelectedInterestIds((current) =>
      current.includes(interestId)
        ? current.filter((id) => id !== interestId)
        : [...current, interestId]
    );
  };

  const selectAllInterestsOnPage = () => {
    setSelectedInterestIds(interestData.items.map((item) => item._id));
  };

  const clearSelectedInterests = () => {
    setSelectedInterestIds([]);
  };

  useEffect(() => {
    if (!hasAppliedFilters) {
      return;
    }

    void refreshCatalog(activeFilters, page, limit);
  }, [hasAppliedFilters, limit, page]);

  useEffect(() => {
    setSelectedInterestIds((current) =>
      current.filter((id) => interestData.items.some((item) => item._id === id))
    );
  }, [interestData.items]);

  const validateFilters = (filters) => {
    if (!filters.dateFrom || !filters.dateTo) {
      return 'Select both From and To dates before loading the event catalog.';
    }

    if (new Date(filters.dateFrom) > new Date(filters.dateTo)) {
      return 'From date must be before or equal to To date.';
    }

    return '';
  };

  const handleApplyFilters = async () => {
    const validationError = validateFilters(draftFilters);

    if (validationError) {
      setListError(validationError);
      return;
    }

    const nextFilters = { ...draftFilters };

    setActiveFilters(nextFilters);
    setHasAppliedFilters(true);
    setPage(1);

    await Promise.all([
      refreshCatalog(nextFilters, 1, limit),
      refreshCalendarFeed(nextFilters)
    ]);
  };

  const handleResetFilters = () => {
    setDraftFilters(createInitialFilters());
    setActiveFilters(createInitialFilters());
    setHasAppliedFilters(false);
    setCatalogData({ items: [], totalCount: 0, page: 1, limit });
    setCalendarFeed({ items: [], dateFrom: '', dateTo: '' });
    setListError('');
    setPage(1);
  };

  const handleRefreshHolidays = async () => {
    setCalendarActionPending(true);
    setCalendarMessage('');
    setListError('');

    try {
      const response = await refreshCalendarHolidays();
      setCalendarMessage(response.message || 'Calendar holidays refreshed.');
      await refreshCalendarFeed(hasAppliedFilters ? activeFilters : createInitialFilters());
    } catch (error) {
      setListError(getApiErrorMessage(error, 'Unable to refresh calendar holidays.'));
    } finally {
      setCalendarActionPending(false);
    }
  };

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      if (editingEvent?._id) {
        await updateEvent(editingEvent._id, payload);
        setFormSuccess('Event updated successfully.');
      } else {
        await createEvent(payload);
        setFormSuccess('Event created successfully.');
      }

      setEditingEvent(null);
      setFormResetCounter((current) => current + 1);

      if (hasAppliedFilters) {
        await Promise.all([
          refreshCatalog(activeFilters, page, limit),
          refreshCalendarFeed(activeFilters)
        ]);
      }
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to save the event.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEvent = (eventItem) => {
    setEditingEvent(eventItem);
    setEditFocusToken((current) => current + 1);
    setFormError('');
    setFormSuccess('');
  };

  const handleDelete = async (eventItem) => {
    if (
      !window.confirm(
        `Delete "${eventItem.name}"? This only works when the event has no payments, registrations, or transactions.`
      )
    ) {
      return;
    }

    setActionEventId(eventItem._id);
    setActionType('delete');

    try {
      await deleteEvent(eventItem._id);
      setFormSuccess('Event deleted successfully.');
      setFormError('');

      if (hasAppliedFilters) {
        await Promise.all([
          refreshCatalog(activeFilters, page, limit),
          refreshCalendarFeed(activeFilters)
        ]);
      }
    } catch (error) {
      setListError(getApiErrorMessage(error, 'Unable to delete the event.'));
    } finally {
      setActionEventId('');
      setActionType('');
    }
  };

  const toggleRegistration = async (eventItem) => {
    setActionEventId(eventItem._id);
    setActionType('registration');

    try {
      await updateEvent(eventItem._id, { registrationEnabled: !eventItem.registrationEnabled });
      setFormSuccess(
        `Registration ${eventItem.registrationEnabled ? 'disabled' : 'enabled'} for ${eventItem.name}.`
      );
      setFormError('');
      setListError('');

      if (hasAppliedFilters) {
        await Promise.all([
          refreshCatalog(activeFilters, page, limit),
          refreshCalendarFeed(activeFilters)
        ]);
      }
    } catch (error) {
      setListError(getApiErrorMessage(error, 'Unable to update registration status.'));
    } finally {
      setActionEventId('');
      setActionType('');
    }
  };

  const toggleHidden = async (eventItem) => {
    setActionEventId(eventItem._id);
    setActionType('visibility');

    try {
      await updateEvent(eventItem._id, { isHidden: !eventItem.isHidden });
      setFormSuccess(
        eventItem.isHidden
          ? `${eventItem.name} is visible on the public website again.`
          : `${eventItem.name} was hidden from the public website and scheduled event listings.`
      );
      setFormError('');
      setListError('');

      if (hasAppliedFilters) {
        await Promise.all([
          refreshCatalog(activeFilters, page, limit),
          refreshCalendarFeed(activeFilters)
        ]);
      }
    } catch (error) {
      setListError(getApiErrorMessage(error, 'Unable to update event visibility.'));
    } finally {
      setActionEventId('');
      setActionType('');
    }
  };

  const handleManualEmailSubmit = async (event) => {
    event.preventDefault();

    if (!interestEvent?._id) {
      return;
    }

    if (manualEmailForm.audience === 'selected' && !selectedInterestIds.length) {
      setInterestError('Select at least one interested contact before sending to selected users.');
      return;
    }

    setManualEmailPending(true);
    setInterestError('');
    setInterestMessage('');

    try {
      const response = await sendEventInterestEmail(interestEvent._id, {
        audience: manualEmailForm.audience,
        interestIds:
          manualEmailForm.audience === 'selected' ? selectedInterestIds : [],
        customMessage: manualEmailForm.customMessage
      });
      setInterestMessage(response.message || 'Event email sent successfully.');
      await loadEventInterests(interestEvent, { preserveFlash: true });
    } catch (error) {
      setInterestError(getApiErrorMessage(error, 'Unable to send event email.'));
    } finally {
      setManualEmailPending(false);
    }
  };

  const catalogColumns = useMemo(
    () => [
      {
        key: 'event',
        header: 'Event',
        accessor: (item) => `${item.name || ''} ${item.sportType || ''} ${item.venue || ''}`,
        cell: (item) => (
          <div>
            <p className="font-semibold text-slate-900">{item.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {item.sportType} • {item.venue}
            </p>
          </div>
        )
      },
      {
        key: 'schedule',
        header: 'Schedule',
        accessor: (item) =>
          `${item.startDate || ''} ${item.endDate || ''} ${item.registrationDeadline || ''} ${item.registrationStartDate || ''}`,
        cell: (item) => (
          <div className="text-sm text-slate-600">
            <p>{formatDate(item.startDate)} to {formatDate(item.endDate)}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
              Opens {item.registrationStartDate ? formatDateTime(item.registrationStartDate) : 'Coming Soon'}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
              Deadline {item.registrationDeadline ? formatDate(item.registrationDeadline) : 'Not Set'}
            </p>
          </div>
        )
      },
      {
        key: 'commercials',
        header: 'Commercials',
        accessor: (item) => `${item.entryFee || 0} ${item.registrationCount || 0}`,
        cell: (item) => (
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{formatCurrency(item.entryFee)}</p>
            <p className="mt-1">
              Registrations: {item.registrationCount || 0}/{item.maxParticipants}
            </p>
            <p className="mt-1">Notify Later: {item.interestCount || 0}</p>
          </div>
        )
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (item) =>
          `${item.isHidden ? 'hidden' : 'visible'} ${item.registrationEnabled ? 'registration-enabled' : 'registration-disabled'}`,
        cell: (item) => (
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${item.isHidden ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {item.isHidden ? 'Hidden' : 'Visible'}
            </span>
            <span className="badge bg-slate-100 text-slate-700">
              Registration {item.registrationEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        )
      },
      {
        key: 'actions',
        header: 'Actions',
        accessor: () => '',
        exportable: false,
        sortable: false,
        cell: (item) => (
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary px-4 py-2" onClick={() => handleEditEvent(item)} type="button">
              Edit
            </button>
            <button
              className="btn-secondary px-4 py-2"
              onClick={() => loadEventInterests(item)}
              type="button"
            >
              Interested Users
            </button>
            <button
              className="btn-secondary px-4 py-2"
              disabled={actionEventId === item._id || item.isHidden}
              onClick={() => toggleRegistration(item)}
              type="button"
            >
              {actionEventId === item._id && actionType === 'registration'
                ? 'Saving...'
                : item.isHidden
                  ? 'Hidden Event'
                  : item.registrationEnabled
                    ? 'Disable Registration'
                    : 'Enable Registration'}
            </button>
            <button
              className="btn-secondary px-4 py-2"
              disabled={actionEventId === item._id}
              onClick={() => toggleHidden(item)}
              type="button"
            >
              {actionEventId === item._id && actionType === 'visibility'
                ? 'Saving...'
                : item.isHidden
                  ? 'Unhide'
                  : 'Hide'}
            </button>
            <button
              className="btn-primary px-4 py-2"
              disabled={actionEventId === item._id}
              onClick={() => handleDelete(item)}
              type="button"
            >
              {actionEventId === item._id && actionType === 'delete' ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        )
      }
    ],
    [actionEventId, actionType]
  );

  const interestColumns = useMemo(
    () => [
      {
        key: 'selected',
        header: 'Select',
        accessor: (item) => selectedInterestIds.includes(item._id),
        exportable: false,
        sortable: false,
        cell: (item) => (
          <input
            checked={selectedInterestIds.includes(item._id)}
            onChange={() => toggleInterestSelection(item._id)}
            type="checkbox"
          />
        )
      },
      {
        key: 'contact',
        header: 'Interested Contact',
        accessor: (item) => `${item.name || ''} ${item.email || ''} ${item.phone || ''}`,
        cell: (item) => (
          <div>
            <p className="font-semibold text-slate-900">{item.name}</p>
            <p className="text-sm text-slate-500">{item.email}</p>
            {item.phone ? <p className="text-sm text-slate-500">{item.phone}</p> : null}
          </div>
        )
      },
      {
        key: 'createdAt',
        header: 'Opted In',
        accessor: (item) => item.createdAt,
        sortValue: (item) => new Date(item.createdAt).getTime(),
        exportValue: (item) => formatDateTime(item.createdAt),
        cell: (item) => <span className="text-sm text-slate-600">{formatDateTime(item.createdAt)}</span>
      },
      {
        key: 'automated',
        header: 'Auto Notify',
        accessor: (item) => item.registrationOpenedNotifiedAt || '',
        exportValue: (item) =>
          item.registrationOpenedNotifiedAt ? formatDateTime(item.registrationOpenedNotifiedAt) : 'Pending',
        cell: (item) => (
          <span
            className={`badge ${
              item.registrationOpenedNotifiedAt
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {item.registrationOpenedNotifiedAt
              ? formatDateTime(item.registrationOpenedNotifiedAt)
              : 'Pending'}
          </span>
        )
      },
      {
        key: 'manual',
        header: 'Manual Email',
        accessor: (item) => item.lastManualEmailSentAt || '',
        exportValue: (item) =>
          item.lastManualEmailSentAt ? formatDateTime(item.lastManualEmailSentAt) : '-',
        cell: (item) => (
          <span className="text-sm text-slate-600">
            {item.lastManualEmailSentAt ? formatDateTime(item.lastManualEmailSentAt) : '-'}
          </span>
        )
      },
      {
        key: 'count',
        header: 'Email Count',
        accessor: (item) => item.notificationCount || 0,
        cell: (item) => <span className="text-sm font-semibold text-slate-900">{item.notificationCount || 0}</span>
      }
    ],
    [selectedInterestIds]
  );

  return (
    <AdminPageShell
      description="Create, update, hide, disable, and review tournaments from a compact catalog that scales to large event volumes."
      title="Event Management"
    >
      <div className="space-y-6 sm:space-y-8">
        <EventForm
          autoFocusToken={editFocusToken}
          errorMessage={formError}
          initialValues={editingEvent}
          key={editingEvent?._id || `new-${formResetCounter}`}
          onCancel={() => {
            setEditingEvent(null);
            setFormResetCounter((current) => current + 1);
            setFormError('');
            setFormSuccess('');
          }}
          onSubmit={handleSubmit}
          submitting={submitting}
          successMessage={formSuccess}
        />

        <AdminFilterPanel
          actions={
            <>
          <button className="btn-secondary w-full sm:w-auto" onClick={handleApplyFilters} type="button">
            Apply Filters
          </button>
          <button className="btn-secondary w-full sm:w-auto" onClick={handleResetFilters} type="button">
            Reset
          </button>
          <button
            className="btn-secondary w-full sm:w-auto"
            onClick={handleRefreshHolidays}
            type="button"
          >
            {calendarActionPending ? 'Updating Holidays...' : 'Update Holidays'}
          </button>
        </>
      }
      description="Use the default 30-day range or refine visibility, then switch between the compact list and the shared planning calendar."
      gridClassName="xl:grid-cols-[1fr_1fr_1fr_220px]"
      title="Event Catalog"
        >
            <div>
              <label className="label" htmlFor="event-date-from">
                From
              </label>
              <input
                className="input"
                id="event-date-from"
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))
                }
                type="date"
                value={draftFilters.dateFrom}
              />
            </div>
            <div>
              <label className="label" htmlFor="event-date-to">
                To
              </label>
              <input
                className="input"
                id="event-date-to"
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, dateTo: event.target.value }))
                }
                type="date"
                value={draftFilters.dateTo}
              />
            </div>
            <div>
              <label className="label" htmlFor="event-visibility">
                Visibility
              </label>
              <TypeaheadSelect
                id="event-visibility"
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, visibility: event.target.value }))
                }
                options={visibilityOptions}
                placeholder="Visibility"
                searchPlaceholder="Search visibility"
                value={draftFilters.visibility}
              />
            </div>
            <div className="xl:self-end">
              <div className="inline-flex w-full rounded-2xl bg-slate-100 p-1">
                <button
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    catalogView === 'list' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
                  }`}
                  onClick={() => setCatalogView('list')}
                  type="button"
                >
                  <span className="inline-flex items-center gap-2">
                    <AppIcon className="h-4 w-4" name="reports" />
                    List
                  </span>
                </button>
                <button
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    catalogView === 'calendar' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
                  }`}
                  onClick={() => setCatalogView('calendar')}
                  type="button"
                >
                  <span className="inline-flex items-center gap-2">
                    <AppIcon className="h-4 w-4" name="calendar" />
                    Calendar
                  </span>
                </button>
              </div>
            </div>
        </AdminFilterPanel>

        <FormAlert message={listError} />
        <FormAlert message={calendarMessage} type="success" />

        {!hasAppliedFilters ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-5 sm:p-8">
            <h3 className="text-xl font-bold text-slate-950">Load a filtered catalog</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
              The default range is already set to today through the next 30 days. Apply it or refine
              it before loading the catalog so large event datasets stay responsive.
            </p>
          </div>
        ) : catalogView === 'list' ? (
          <div>
            <DataTable
              columns={catalogColumns}
              emptyMessage="No events match the selected date range."
              loading={catalogLoading}
              loadingLabel="Loading event catalog..."
              rowKey="_id"
              rows={catalogData.items}
              searchPlaceholder="Search events on this page"
              serverPagination={{
                page: catalogData.page || page,
                pageSize: catalogData.limit || limit,
                totalCount: catalogData.totalCount || 0,
                onPageChange: setPage,
                onPageSizeChange: (nextLimit) => {
                  setLimit(nextLimit);
                  setPage(1);
                }
              }}
              tableClassName="min-w-[1180px]"
            />
          </div>
        ) : (
          <AdminCalendarPanel
            emptyMessage="No events, holidays, or sports fixtures match the current calendar range."
            initialMonth={activeFilters.dateFrom}
            items={calendarFeed.items}
            loading={calendarLoading}
            loadingLabel="Loading planning calendar..."
            title="Planning Calendar"
          />
        )}

        {interestEvent ? (
            <div className="mt-8 space-y-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-4 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    Notify Later Contacts
                  </p>
                  <h3 className="mt-3 text-2xl font-bold text-slate-950">{interestEvent.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    View interested users, export the contact list, and send manual event emails
                    using the configured public registration link.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    className="btn-secondary w-full sm:w-auto"
                    onClick={() => loadEventInterests(interestEvent)}
                    type="button"
                  >
                    Refresh Contacts
                  </button>
                  <button
                    className="btn-secondary w-full sm:w-auto"
                    onClick={() => {
                      setInterestEvent(null);
                      setInterestData({
                        items: [],
                        summary: {
                          totalCount: 0,
                          automatedNotifiedCount: 0,
                          manualSentCount: 0,
                          pendingCount: 0
                        }
                      });
                      setSelectedInterestIds([]);
                      setInterestError('');
                      setInterestMessage('');
                    }}
                    type="button"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Interested</p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">{interestData.summary.totalCount || 0}</p>
                </div>
                <div className="rounded-2xl bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Pending Auto-Notify</p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">{interestData.summary.pendingCount || 0}</p>
                </div>
                <div className="rounded-2xl bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Auto Notified</p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">{interestData.summary.automatedNotifiedCount || 0}</p>
                </div>
                <div className="rounded-2xl bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Manual Emails</p>
                  <p className="mt-3 text-3xl font-bold text-slate-950">{interestData.summary.manualSentCount || 0}</p>
                </div>
              </div>

              <form className="grid gap-4 rounded-[1.75rem] bg-white p-4 sm:p-6 xl:grid-cols-[240px_1fr_auto]" onSubmit={handleManualEmailSubmit}>
                <div>
                  <label className="label" htmlFor="interest-audience">
                    Audience
                  </label>
                  <TypeaheadSelect
                    id="interest-audience"
                    onChange={(event) =>
                      setManualEmailForm((current) => ({
                        ...current,
                        audience: event.target.value
                      }))
                    }
                    options={interestAudienceOptions}
                    placeholder="Audience"
                    searchPlaceholder="Search audience"
                    value={manualEmailForm.audience}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="interest-message">
                    Custom Message (optional)
                  </label>
                  <textarea
                    className="input min-h-28"
                    id="interest-message"
                    onChange={(event) =>
                      setManualEmailForm((current) => ({
                        ...current,
                        customMessage: event.target.value
                      }))
                    }
                    placeholder="Add a short note for the recipients before the event details and registration link."
                    value={manualEmailForm.customMessage}
                  />
                </div>
                <div className="xl:self-end">
                  <button className="btn-primary w-full sm:w-auto" disabled={manualEmailPending} type="submit">
                    {manualEmailPending ? 'Sending...' : 'Send Event Email'}
                  </button>
                </div>
              </form>

              <FormAlert message={interestError} />
              <FormAlert message={interestMessage} type="success" />

              <DataTable
                columns={interestColumns}
                emptyMessage="No users have clicked Notify Later for this event yet."
                exportFileName={`event-interest-${interestEvent._id}.csv`}
                exportable
                loading={interestLoading}
                loadingLabel="Loading interested contacts..."
                rowKey="_id"
                rows={interestData.items}
                searchPlaceholder="Search interested contacts"
                toolbarActions={
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button className="btn-secondary w-full px-4 py-2 sm:w-auto" onClick={selectAllInterestsOnPage} type="button">
                      Select All
                    </button>
                    <button className="btn-secondary w-full px-4 py-2 sm:w-auto" onClick={clearSelectedInterests} type="button">
                      Clear
                    </button>
                  </div>
                }
              />
            </div>
        ) : null}
      </div>
    </AdminPageShell>
  );
}
