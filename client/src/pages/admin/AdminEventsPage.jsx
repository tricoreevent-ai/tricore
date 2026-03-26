import { useEffect, useMemo, useState } from 'react';

import {
  createEvent,
  deleteEvent,
  getAdminEventCatalog,
  getAdminEvents,
  updateEvent
} from '../../api/eventsApi.js';
import DataTable from '../../components/common/DataTable.jsx';
import AppIcon from '../../components/common/AppIcon.jsx';
import FormAlert from '../../components/common/FormAlert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import TypeaheadSelect from '../../components/common/TypeaheadSelect.jsx';
import EventForm from '../../components/events/EventForm.jsx';
import AdminPageShell from '../../components/layout/AdminPageShell.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

const createInitialFilters = () => ({
  dateFrom: '',
  dateTo: '',
  visibility: 'all'
});

const visibilityOptions = [
  { value: 'all', label: 'All Events' },
  { value: 'visible', label: 'Visible Only' },
  { value: 'hidden', label: 'Hidden Only' }
];

const shiftMonth = (date, offset) => {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + offset);
  return nextDate;
};

const buildCalendarDays = (monthDate) => {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
};

const eventOverlapsDay = (event, day) => {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate || event.startDate);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  return start <= dayEnd && end >= dayStart;
};

export default function AdminEventsPage() {
  const [draftFilters, setDraftFilters] = useState(createInitialFilters());
  const [activeFilters, setActiveFilters] = useState(createInitialFilters());
  const [catalogData, setCatalogData] = useState({ items: [], totalCount: 0, page: 1, limit: 20 });
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [catalogView, setCatalogView] = useState('list');
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formResetCounter, setFormResetCounter] = useState(0);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [listError, setListError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [actionEventId, setActionEventId] = useState('');
  const [actionType, setActionType] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

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

  const refreshCalendarEvents = async (filters = activeFilters) => {
    setCalendarLoading(true);

    try {
      const response = await getAdminEvents(filters);
      setCalendarEvents(response);
      setSelectedCalendarEvent((current) => {
        if (!current) {
          return response[0] || null;
        }

        return response.find((item) => item._id === current._id) || response[0] || null;
      });
      setListError('');
    } catch (error) {
      setListError(getApiErrorMessage(error, 'Unable to load calendar events.'));
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (!hasAppliedFilters) {
      return;
    }

    void refreshCatalog(activeFilters, page, limit);
  }, [hasAppliedFilters, limit, page]);

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
    setCalendarMonth(new Date(`${nextFilters.dateFrom}T00:00:00`));

    await Promise.all([
      refreshCatalog(nextFilters, 1, limit),
      refreshCalendarEvents(nextFilters)
    ]);
  };

  const handleResetFilters = () => {
    setDraftFilters(createInitialFilters());
    setActiveFilters(createInitialFilters());
    setHasAppliedFilters(false);
    setCatalogData({ items: [], totalCount: 0, page: 1, limit });
    setCalendarEvents([]);
    setSelectedCalendarEvent(null);
    setListError('');
    setPage(1);
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
          refreshCalendarEvents(activeFilters)
        ]);
      }
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to save the event.'));
    } finally {
      setSubmitting(false);
    }
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
          refreshCalendarEvents(activeFilters)
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
          refreshCalendarEvents(activeFilters)
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
          refreshCalendarEvents(activeFilters)
        ]);
      }
    } catch (error) {
      setListError(getApiErrorMessage(error, 'Unable to update event visibility.'));
    } finally {
      setActionEventId('');
      setActionType('');
    }
  };

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

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
        accessor: (item) => `${item.startDate || ''} ${item.endDate || ''} ${item.registrationDeadline || ''}`,
        cell: (item) => (
          <div className="text-sm text-slate-600">
            <p>{formatDate(item.startDate)} to {formatDate(item.endDate)}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
              Deadline {formatDate(item.registrationDeadline)}
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
            <button className="btn-secondary px-4 py-2" onClick={() => setEditingEvent(item)} type="button">
              Edit
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

  return (
    <AdminPageShell
      description="Create, update, hide, disable, and review tournaments from a compact catalog that scales to large event volumes."
      title="Event Management"
    >
      <div className="space-y-8">
        <EventForm
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

        <section className="panel p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Event Catalog</h2>
              <p className="mt-2 text-sm text-slate-500">
                Load a scoped date range first, then switch between the dense list view and a
                calendar view for planning.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-secondary" onClick={handleApplyFilters} type="button">
                Apply Filters
              </button>
              <button className="btn-secondary" onClick={handleResetFilters} type="button">
                Reset
              </button>
            </div>
          </div>

          <FormAlert message={listError} />

          <div className="mt-6 grid gap-4 xl:grid-cols-4">
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
          </div>

          {!hasAppliedFilters ? (
            <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-8">
              <h3 className="text-xl font-bold text-slate-950">Load a filtered catalog</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                Select a date range to load the event catalog. This keeps the page responsive even
                when the system contains a large number of events.
              </p>
            </div>
          ) : catalogView === 'list' ? (
            <div className="mt-6">
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
            <div className="mt-6 space-y-6">
              {calendarLoading ? <LoadingSpinner compact label="Loading event calendar..." /> : null}

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-2xl font-bold">
                    {new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(calendarMonth)}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Click an event chip to inspect its schedule, visibility, and registration state.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary gap-2" onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))} type="button">
                    <AppIcon className="h-4 w-4" name="chevronLeft" />
                    Previous Month
                  </button>
                  <button className="btn-secondary gap-2" onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))} type="button">
                    Next Month
                    <AppIcon className="h-4 w-4" name="chevronRight" />
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-7">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" key={day}>
                    {day}
                  </div>
                ))}
                {calendarDays.map((day) => {
                  const dayEvents = calendarEvents.filter((event) => eventOverlapsDay(event, day));
                  const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();

                  return (
                    <div
                      className={`min-h-[156px] rounded-[1.5rem] border p-3 ${
                        isCurrentMonth
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-100 bg-slate-50/70'
                      }`}
                      key={day.toISOString()}
                    >
                      <p className={`text-sm font-semibold ${isCurrentMonth ? 'text-slate-900' : 'text-slate-400'}`}>
                        {day.getDate()}
                      </p>
                      <div className="mt-3 space-y-2">
                        {dayEvents.slice(0, 3).map((event) => (
                          <button
                            className={`w-full rounded-2xl px-3 py-2 text-left text-xs font-semibold transition ${
                              selectedCalendarEvent?._id === event._id
                                ? 'bg-brand-blue text-white'
                                : event.isHidden
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'bg-brand-mist text-brand-blue hover:bg-blue-100'
                            }`}
                            key={`${day.toISOString()}-${event._id}`}
                            onClick={() => setSelectedCalendarEvent(event)}
                            type="button"
                          >
                            {event.name}
                          </button>
                        ))}
                        {dayEvents.length > 3 ? (
                          <p className="px-1 text-xs text-slate-400">+{dayEvents.length - 3} more</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedCalendarEvent ? (
                <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                        Selected Event
                      </p>
                      <h4 className="mt-3 text-2xl font-bold text-slate-950">{selectedCalendarEvent.name}</h4>
                      <p className="mt-2 text-sm text-slate-500">
                        {selectedCalendarEvent.sportType} • {selectedCalendarEvent.venue}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`badge ${selectedCalendarEvent.isHidden ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {selectedCalendarEvent.isHidden ? 'Hidden On Website' : 'Visible On Website'}
                      </span>
                      <span className="badge bg-slate-100 text-slate-700">
                        Registration {selectedCalendarEvent.registrationEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Dates</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatDate(selectedCalendarEvent.startDate)} to {formatDate(selectedCalendarEvent.endDate)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Deadline</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatDate(selectedCalendarEvent.registrationDeadline)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Entry Fee</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {formatCurrency(selectedCalendarEvent.entryFee)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Registrations</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {selectedCalendarEvent.registrationCount || 0}/{selectedCalendarEvent.maxParticipants}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  No events match the current calendar month.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </AdminPageShell>
  );
}
