import { useEffect, useMemo, useState } from 'react';

import { getAdminEvents } from '../../api/eventsApi.js';
import {
  confirmRegistrationPayment,
  downloadAdminRegistrations,
  getAdminRegistrations,
  updateAdminRegistration
} from '../../api/registrationApi.js';
import AdminFilterPanel from '../../components/admin/AdminFilterPanel.jsx';
import FormAlert from '../../components/common/FormAlert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import TypeaheadSelect from '../../components/common/TypeaheadSelect.jsx';
import AdminPageShell from '../../components/layout/AdminPageShell.jsx';
import { copyTextToClipboard } from '../../utils/clipboard.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { createDefaultDateRangeFilters } from '../../utils/dateRange.js';
import { downloadBlob } from '../../utils/download.js';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js';

const paymentModes = ['online', 'cash', 'upi', 'bank'];
const paymentStateOptions = [
  { value: '', label: 'All Payment States' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Under Review', label: 'Under Review' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Failed', label: 'Failed' }
];
const pageSizeOptions = [10, 20, 30, 50].map((value) => ({
  value,
  label: String(value)
}));

const createInitialFilters = () => createDefaultDateRangeFilters({
  eventId: '',
  status: ''
});

const getPaymentBadgeClass = (status) => {
  if (status === 'Confirmed') return 'badge bg-emerald-50 text-emerald-700';
  if (status === 'Under Review') return 'badge bg-amber-50 text-amber-700';
  if (status === 'Failed') return 'badge bg-red-50 text-red-600';
  return 'badge bg-slate-100 text-slate-600';
};

const createDraft = (registration) => ({
  name: registration.name || '',
  teamName: registration.teamName || '',
  captainName: registration.captainName || '',
  email: registration.email || '',
  phone1: registration.phone1 || '',
  phone2: registration.phone2 || '',
  address: registration.address || '',
  players: (registration.players || []).map((player) => ({
    name: player.name || '',
    phone: player.phone || '',
    address: player.address || ''
  }))
});

const buildClipboardTable = (items) =>
  [
    ['Event', 'Team', 'Captain', 'Email', 'Phone 1', 'Phone 2', 'Payment', 'Status', 'Amount', 'Players'],
    ...items.map((item) => [
      item.eventId?.name || '',
      item.teamName || item.name || '',
      item.captainName || '',
      item.email || '',
      item.phone1 || '',
      item.phone2 || '',
      item.paymentId?.status || '',
      item.status || '',
      item.paymentId?.amount || 0,
      (item.players || []).map((player) => `${player.name} (${player.phone})`).join('; ')
    ])
  ]
    .map((row) => row.join('\t'))
    .join('\n');

export default function AdminRegistrationsPage() {
  const [events, setEvents] = useState([]);
  const [draftFilters, setDraftFilters] = useState(createInitialFilters());
  const [activeFilters, setActiveFilters] = useState(createInitialFilters());
  const [data, setData] = useState({ items: [], totalCount: 0, page: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [drafts, setDrafts] = useState({});
  const [confirmForms, setConfirmForms] = useState({});
  const [savingId, setSavingId] = useState('');
  const [confirmingId, setConfirmingId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [copying, setCopying] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const eventFilterOptions = [
    { value: '', label: 'All Events' },
    ...events.map((event) => ({
      value: event._id,
      label: event.name
    }))
  ];

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data.totalCount || 0) / limit)), [data.totalCount, limit]);

  const loadRegistrations = async (nextFilters = activeFilters, nextPage = page, nextLimit = limit) => {
    try {
      const response = await getAdminRegistrations({ ...nextFilters, page: nextPage, limit: nextLimit });
      setData(response);
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to load registrations.'));
    }
  };

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        setEvents(await getAdminEvents());
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load events.'));
      } finally {
        setEventsLoading(false);
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    if (!hasAppliedFilters) {
      setLoading(false);
      return;
    }

    let ignore = false;

    const loadPage = async () => {
      setLoading(true);
      await loadRegistrations(activeFilters, page, limit);
      if (!ignore) {
        setLoading(false);
      }
    };

    void loadPage();

    return () => {
      ignore = true;
    };
  }, [limit, page]);

  const handleApplyFilters = async () => {
    if (!draftFilters.dateFrom || !draftFilters.dateTo) {
      setError('Select both From and To dates before loading registrations.');
      return;
    }

    if (new Date(draftFilters.dateFrom) > new Date(draftFilters.dateTo)) {
      setError('From date must be before or equal to To date.');
      return;
    }

    setLoading(true);
    setPage(1);
    setActiveFilters({ ...draftFilters });
    setHasAppliedFilters(true);
    await loadRegistrations({ ...draftFilters }, 1, limit);
    setLoading(false);
  };

  const handleResetFilters = () => {
    setDraftFilters(createInitialFilters());
    setActiveFilters(createInitialFilters());
    setHasAppliedFilters(false);
    setPage(1);
    setData({ items: [], totalCount: 0, page: 1, limit });
    setError('');
    setSuccess('');
  };

  const updateConfirmForm = (registrationId, field, value) => {
    setConfirmForms((current) => ({
      ...current,
      [registrationId]: {
        manualReference: current[registrationId]?.manualReference || '',
        paymentMode: current[registrationId]?.paymentMode || 'upi',
        [field]: value
      }
    }));
  };

  const startEdit = (registration) => {
    setEditingId(registration._id);
    setExpandedId(registration._id);
    setDrafts((current) => ({ ...current, [registration._id]: createDraft(registration) }));
  };

  const updateDraft = (registrationId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [registrationId]: { ...current[registrationId], [field]: value }
    }));
  };

  const updatePlayer = (registrationId, index, field, value) => {
    setDrafts((current) => ({
      ...current,
      [registrationId]: {
        ...current[registrationId],
        players: current[registrationId].players.map((player, playerIndex) =>
          playerIndex === index ? { ...player, [field]: value } : player
        )
      }
    }));
  };

  const addPlayer = (registrationId) => {
    setDrafts((current) => ({
      ...current,
      [registrationId]: {
        ...current[registrationId],
        players: [...(current[registrationId]?.players || []), { name: '', phone: '', address: '' }]
      }
    }));
  };

  const removePlayer = (registrationId, index) => {
    setDrafts((current) => ({
      ...current,
      [registrationId]: {
        ...current[registrationId],
        players: current[registrationId].players.filter((_, playerIndex) => playerIndex !== index)
      }
    }));
  };

  const saveRegistration = async (registrationId) => {
    setSavingId(registrationId);
    setError('');
    setSuccess('');
    try {
      await updateAdminRegistration(registrationId, drafts[registrationId]);
      setEditingId('');
      setSuccess('Registration details updated successfully.');
      if (hasAppliedFilters) {
        await loadRegistrations(activeFilters, page, limit);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to update registration details.'));
    } finally {
      setSavingId('');
    }
  };

  const confirmPayment = async (registration) => {
    const form = confirmForms[registration._id] || { manualReference: '', paymentMode: 'upi' };
    setConfirmingId(registration._id);
    setError('');
    setSuccess('');
    try {
      await confirmRegistrationPayment(registration._id, form);
      setSuccess(`Payment confirmed for ${registration.teamName || registration.name}.`);
      if (hasAppliedFilters) {
        await loadRegistrations(activeFilters, page, limit);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to confirm payment.'));
    } finally {
      setConfirmingId('');
    }
  };

  const exportRegistrations = async () => {
    if (!hasAppliedFilters) {
      setError('Apply a valid date range before exporting registrations.');
      return;
    }

    setExporting(true);
    try {
      downloadBlob(await downloadAdminRegistrations(activeFilters), 'registrations.csv');
      setError('');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to export registrations.'));
    } finally {
      setExporting(false);
    }
  };

  const copyRegistrations = async () => {
    if (!hasAppliedFilters) {
      setError('Apply a valid date range before copying registrations.');
      return;
    }

    setCopying(true);
    try {
      await copyTextToClipboard(buildClipboardTable(data.items));
      setSuccess('Current page copied in an Excel-friendly format.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to copy registrations.'));
    } finally {
      setCopying(false);
    }
  };

  return (
    <AdminPageShell
      description="Review registrations, confirm payments, and keep participant details compact, paginated, and export-friendly."
      title="Registrations"
    >
      <AdminFilterPanel
        actions={
          <>
            <button className="btn-secondary" onClick={() => void handleApplyFilters()} type="button">
              Apply Filters
            </button>
            <button className="btn-secondary" onClick={handleResetFilters} type="button">
              Reset
            </button>
            <button className="btn-secondary" disabled={copying} onClick={copyRegistrations} type="button">
              {copying ? 'Copying...' : 'Copy Excel Rows'}
            </button>
            <button className="btn-primary" disabled={exporting} onClick={exportRegistrations} type="button">
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </>
        }
        description="The date range defaults to today through the next 30 days. Apply it or refine it before loading registrations."
        title="Registration Filters"
      >
            <div>
              <label className="label" htmlFor="registration-date-from">
                From
              </label>
              <input
                className="input"
                id="registration-date-from"
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))
                }
                type="date"
                value={draftFilters.dateFrom}
              />
            </div>
            <div>
              <label className="label" htmlFor="registration-date-to">
                To
              </label>
              <input
                className="input"
                id="registration-date-to"
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, dateTo: event.target.value }))
                }
                type="date"
                value={draftFilters.dateTo}
              />
            </div>
            <div>
              <label className="label" htmlFor="registration-event">
                Event
              </label>
              <TypeaheadSelect
                disabled={eventsLoading}
                id="registration-event"
                onChange={(event) => {
                  setDraftFilters((current) => ({ ...current, eventId: event.target.value }));
                }}
                options={eventFilterOptions}
                placeholder="All Events"
                searchPlaceholder="Search events"
                value={draftFilters.eventId}
              />
            </div>
            <div>
              <label className="label" htmlFor="registration-status">
                Payment State
              </label>
              <TypeaheadSelect
                id="registration-status"
                onChange={(event) => {
                  setDraftFilters((current) => ({ ...current, status: event.target.value }));
                }}
                options={paymentStateOptions}
                placeholder="All Payment States"
                searchPlaceholder="Search payment states"
                value={draftFilters.status}
              />
            </div>
      </AdminFilterPanel>

      <div className="panel mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p>
            {hasAppliedFilters
              ? `Showing ${(page - 1) * limit + (data.items.length ? 1 : 0)}-${Math.min(page * limit, data.totalCount || 0)} of ${data.totalCount || 0} registrations`
              : 'Choose a date range and apply filters to load registrations.'}
          </p>
          <div className="flex items-center gap-3">
            <label htmlFor="registration-limit">Rows</label>
            <TypeaheadSelect
              className="min-w-[96px]"
              compact
              id="registration-limit"
              onChange={(event) => {
                setLimit(Number.parseInt(event.target.value, 10) || 10);
                setPage(1);
              }}
              options={pageSizeOptions}
              placeholder="Rows"
              searchPlaceholder="Rows"
              value={limit}
            />
          </div>
        </div>

        <div className="mt-4">
          <FormAlert message={error} />
          <FormAlert message={success} type="success" />
        </div>

        {loading ? <LoadingSpinner compact label="Loading registrations..." /> : null}

        {!loading && hasAppliedFilters && data.items.length ? (
          <div className="mt-6 space-y-4">
            {data.items.map((registration) => {
              const confirmForm = confirmForms[registration._id] || { manualReference: registration.paymentId?.manualReference || '', paymentMode: registration.paymentId?.method === 'manual' ? 'upi' : 'online' };
              const isExpanded = expandedId === registration._id;
              const isEditing = editingId === registration._id;
              const draft = drafts[registration._id] || createDraft(registration);
              const isConfirmed = registration.paymentId?.status === 'Confirmed';

              return (
                <article className="rounded-3xl border border-slate-200 bg-white p-5" key={registration._id}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-950">{registration.teamName || registration.name}</h2>
                        <span className={getPaymentBadgeClass(registration.paymentId?.status)}>{registration.paymentId?.status || 'Pending'}</span>
                        <span className={registration.status === 'Confirmed' ? 'badge bg-emerald-50 text-emerald-700' : 'badge bg-slate-100 text-slate-600'}>{registration.status}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                        <span>{registration.eventId?.name}</span><span>{registration.email}</span><span>{registration.phone1}</span><span>{registration.players?.length || 0} players</span><span>{formatDate(registration.createdAt)}</span>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fee</p><p className="mt-2 font-bold text-slate-950">{formatCurrency(registration.paymentId?.amount)}</p></div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Method</p><p className="mt-2 font-bold text-slate-950">{registration.paymentId?.method || '-'}</p></div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Confirmed</p><p className="mt-2 font-bold text-slate-950">{registration.paymentId?.confirmedAt ? formatDateTime(registration.paymentId.confirmedAt) : '-'}</p></div>
                      <button className="btn-secondary h-full px-4 py-3" onClick={() => setExpandedId((current) => current === registration._id ? '' : registration._id)} type="button">{isExpanded ? 'Hide Details' : 'View Details'}</button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-3xl bg-slate-50 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Registration Details</p><p className="mt-2 text-sm text-slate-600">Compact details with editable player accordions.</p></div>
                          <div className="flex flex-wrap gap-2">
                            {isEditing ? (
                              <>
                                <button className="btn-secondary px-4 py-2" onClick={() => setEditingId('')} type="button">Cancel</button>
                                <button className="btn-primary px-4 py-2" disabled={savingId === registration._id} onClick={() => saveRegistration(registration._id)} type="button">{savingId === registration._id ? 'Saving...' : 'Save Details'}</button>
                              </>
                            ) : (
                              <button className="btn-secondary px-4 py-2" onClick={() => startEdit(registration)} type="button">Edit Details</button>
                            )}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          {['teamName', 'captainName', 'email', 'phone1', 'phone2', 'name'].map((field) => (
                            <input key={field} className="input" disabled={!isEditing} onChange={(event) => updateDraft(registration._id, field, event.target.value)} placeholder={field} value={draft[field]} />
                          ))}
                          <textarea className="input min-h-24 md:col-span-2" disabled={!isEditing} onChange={(event) => updateDraft(registration._id, 'address', event.target.value)} placeholder="address" value={draft.address} />
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Players</p>
                          {isEditing ? <button className="btn-secondary px-4 py-2" onClick={() => addPlayer(registration._id)} type="button">Add Player</button> : null}
                        </div>
                        <div className="mt-4 space-y-3">
                          {(isEditing ? draft.players : registration.players || []).map((player, index) => (
                            <details className="rounded-2xl border border-slate-200 bg-white p-4" key={`${registration._id}-${index}`} open={index === 0}>
                              <summary className="cursor-pointer text-sm font-semibold text-slate-900">Player {index + 1}: {player.name || 'New player'}</summary>
                              {isEditing ? (
                                <div className="mt-4 grid gap-4 md:grid-cols-3">
                                  <input className="input" onChange={(event) => updatePlayer(registration._id, index, 'name', event.target.value)} placeholder="name" value={player.name} />
                                  <input className="input" onChange={(event) => updatePlayer(registration._id, index, 'phone', event.target.value)} placeholder="phone" value={player.phone} />
                                  <input className="input" onChange={(event) => updatePlayer(registration._id, index, 'address', event.target.value)} placeholder="address" value={player.address} />
                                  <button className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 md:col-span-3" onClick={() => removePlayer(registration._id, index)} type="button">Remove Player</button>
                                </div>
                              ) : (
                                <div className="mt-3 text-sm text-slate-600"><p>{player.phone}</p><p className="mt-1">{player.address}</p></div>
                              )}
                            </details>
                          ))}
                          {!((isEditing ? draft.players : registration.players || []).length) ? <p className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-500">No players saved yet.</p> : null}
                        </div>
                      </div>

                      <div className="rounded-3xl bg-slate-50 p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Payment Review</p>
                        {registration.paymentId?.receipt ? <img alt="Payment proof" className="mt-4 max-h-72 w-full rounded-3xl object-contain" src={registration.paymentId.receipt} /> : <p className="mt-4 rounded-2xl bg-white px-4 py-5 text-sm text-slate-500">No receipt screenshot uploaded yet.</p>}
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <div><label className="label" htmlFor={`paymentMode-${registration._id}`}>Accounting Mode</label><TypeaheadSelect id={`paymentMode-${registration._id}`} onChange={(event) => updateConfirmForm(registration._id, 'paymentMode', event.target.value)} options={paymentModes.map((mode) => ({ value: mode, label: mode }))} placeholder="Accounting Mode" searchPlaceholder="Search accounting modes" value={confirmForm.paymentMode} /></div>
                          <div><label className="label" htmlFor={`manualReference-${registration._id}`}>Reference</label><input className="input" id={`manualReference-${registration._id}`} onChange={(event) => updateConfirmForm(registration._id, 'manualReference', event.target.value)} value={confirmForm.manualReference} /></div>
                        </div>
                        <button className="btn-primary mt-5" disabled={isConfirmed || confirmingId === registration._id} onClick={() => confirmPayment(registration)} type="button">{isConfirmed ? 'Already Confirmed' : confirmingId === registration._id ? 'Confirming...' : 'Confirm Payment'}</button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {!loading && !hasAppliedFilters ? (
          <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
            Select a date range and apply filters to load registrations.
          </p>
        ) : null}

        {!loading && hasAppliedFilters && !data.items.length ? <p className="mt-6 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">No registrations match the selected filters.</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6">
          <p className="text-sm text-slate-600">Page {page} of {totalPages}</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary px-4 py-2" disabled={!hasAppliedFilters || page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Previous</button>
            <button className="btn-secondary px-4 py-2" disabled={!hasAppliedFilters || page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Next</button>
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
