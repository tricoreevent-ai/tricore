import { useEffect, useMemo, useState } from 'react';

import AppIcon from '../common/AppIcon.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

const entryOverlapsDay = (item, day) => {
  const start = new Date(item.startDate);
  const end = new Date(item.endDate || item.startDate);
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  return start <= dayEnd && end >= dayStart;
};

const toneClasses = {
  'holiday-national': 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  'holiday-religious': 'bg-rose-50 text-rose-600 hover:bg-rose-100',
  'holiday-regional': 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
  'sports-fixture': 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  'event-live': 'bg-brand-mist text-brand-blue hover:bg-blue-100',
  'event-closed': 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  'event-hidden': 'bg-rose-50 text-rose-600 hover:bg-rose-100'
};

const categoryFilters = [
  {
    key: 'nationalHoliday',
    label: 'National Holiday',
    tone: 'holiday-national',
    matches: (item) => item.entryType === 'holiday' && item.holidayType === 'national'
  },
  {
    key: 'religiousObservance',
    label: 'Religious Observance',
    tone: 'holiday-religious',
    matches: (item) => item.entryType === 'holiday' && item.holidayType === 'religious'
  },
  {
    key: 'regionalHoliday',
    label: 'Regional Holiday',
    tone: 'holiday-regional',
    matches: (item) => item.entryType === 'holiday' && item.holidayType === 'regional'
  },
  {
    key: 'sportsFixture',
    label: 'Sports Fixture',
    tone: 'sports-fixture',
    matches: (item) => item.entryType === 'sports_fixture'
  },
  {
    key: 'publishedEvent',
    label: 'Published Event',
    tone: 'event-live',
    matches: (item) => item.entryType === 'event' && !item.isHidden
  },
  {
    key: 'hiddenEvent',
    label: 'Hidden Event',
    tone: 'event-hidden',
    matches: (item) => item.entryType === 'event' && Boolean(item.isHidden)
  }
];

const defaultVisibleCategories = Object.fromEntries(
  categoryFilters.map((filterDefinition) => [filterDefinition.key, true])
);

const getEntryBadgeClass = (item) =>
  toneClasses[item.colorTone || item.key] || 'bg-slate-100 text-slate-700';

const getEntryTypeLabel = (item) => {
  if (item.entryType === 'holiday') {
    return item.holidayType === 'national'
      ? 'National Holiday'
      : item.holidayType === 'religious'
        ? 'Religious Observance'
        : 'Regional Holiday';
  }

  if (item.entryType === 'sports_fixture') {
    return 'Sports Fixture';
  }

  return 'TriCore Event';
};

const normalizeMonth = (value) => {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export default function AdminCalendarPanel({
  emptyMessage = 'No calendar items match the selected range.',
  initialMonth,
  items = [],
  loading = false,
  loadingLabel = 'Loading calendar...',
  title = 'Calendar'
}) {
  const [calendarMonth, setCalendarMonth] = useState(() => normalizeMonth(initialMonth));
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [visibleCategories, setVisibleCategories] = useState(defaultVisibleCategories);

  useEffect(() => {
    setCalendarMonth(normalizeMonth(initialMonth));
  }, [initialMonth]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        categoryFilters.some(
          (filterDefinition) =>
            visibleCategories[filterDefinition.key] && filterDefinition.matches(item)
        )
      ),
    [items, visibleCategories]
  );

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedEntryId('');
      return;
    }

    setSelectedEntryId((current) =>
      filteredItems.some((item) => item.entryId === current) ? current : filteredItems[0].entryId
    );
  }, [filteredItems]);

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const monthLabel = useMemo(
    () =>
      calendarMonth.toLocaleString('en-IN', {
        month: 'long',
        year: 'numeric'
      }),
    [calendarMonth]
  );
  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.entryId === selectedEntryId) || null,
    [filteredItems, selectedEntryId]
  );

  return (
    <div className="space-y-6">
      {loading ? <LoadingSpinner compact label={loadingLabel} /> : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-2xl font-bold">{title}</h3>
          <p className="mt-2 text-sm text-slate-500">
            Events, holidays, and sports fixtures share the same planning calendar.
          </p>
          <div className="mt-4 inline-flex flex-col rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Viewing Month
            </span>
            <span className="mt-2 text-2xl font-bold text-slate-950">{monthLabel}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary gap-2"
            onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
            type="button"
          >
            <AppIcon className="h-4 w-4" name="chevronLeft" />
            Previous Month
          </button>
          <button
            className="btn-secondary gap-2"
            onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
            type="button"
          >
            Next Month
            <AppIcon className="h-4 w-4" name="chevronRight" />
          </button>
        </div>
      </div>

      <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
              Calendar Visibility
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Use the checkboxes to show or hide holidays, fixtures, and TriCore event types.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary px-4 py-2"
              onClick={() => setVisibleCategories(defaultVisibleCategories)}
              type="button"
            >
              Show All
            </button>
            <button
              className="btn-secondary px-4 py-2"
              onClick={() =>
                setVisibleCategories((current) =>
                  Object.fromEntries(
                    Object.keys(current).map((key) => [key, false])
                  )
                )
              }
              type="button"
            >
              Hide All
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {categoryFilters.map((filterDefinition) => {
            const checked = Boolean(visibleCategories[filterDefinition.key]);

            return (
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                  checked
                    ? 'border-slate-300 bg-white text-slate-800 shadow-soft'
                    : 'border-slate-200 bg-white/60 text-slate-500'
                }`}
                key={filterDefinition.key}
              >
                <input
                  checked={checked}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                  onChange={() =>
                    setVisibleCategories((current) => ({
                      ...current,
                      [filterDefinition.key]: !current[filterDefinition.key]
                    }))
                  }
                  type="checkbox"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${getEntryBadgeClass({ key: filterDefinition.tone })}`}>
                      {filterDefinition.label}
                    </span>
                  </span>
                  <span className="mt-2 block text-xs uppercase tracking-[0.16em] text-slate-400">
                    {checked ? 'Visible on calendar' : 'Hidden from calendar'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-7">
        {weekdayLabels.map((day) => (
          <div className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" key={day}>
            {day}
          </div>
        ))}
        {calendarDays.map((day) => {
          const dayItems = filteredItems.filter((item) => entryOverlapsDay(item, day));
          const isCurrentMonth = day.getMonth() === calendarMonth.getMonth();
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const dayClasses = isCurrentMonth
            ? isWeekend
              ? 'border-amber-100 bg-amber-50/70'
              : 'border-slate-200 bg-white'
            : isWeekend
              ? 'border-amber-100 bg-amber-50/40'
              : 'border-slate-100 bg-slate-50/70';

          return (
            <div
              className={`min-h-[156px] rounded-[1.5rem] border p-3 ${dayClasses}`}
              key={day.toISOString()}
            >
              <p className={`text-sm font-semibold ${isCurrentMonth ? 'text-slate-900' : 'text-slate-400'}`}>
                {day.getDate()}
              </p>
              {isWeekend ? (
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                  Weekend
                </p>
              ) : null}
              <div className="mt-3 space-y-2">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    className={`w-full rounded-2xl px-3 py-2 text-left text-xs font-semibold transition ${getEntryBadgeClass(item)}`}
                    key={`${day.toISOString()}-${item.entryId}`}
                    onClick={() => setSelectedEntryId(item.entryId)}
                    type="button"
                  >
                    {item.title}
                  </button>
                ))}
                {dayItems.length > 3 ? (
                  <p className="px-1 text-xs text-slate-400">+{dayItems.length - 3} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {selectedItem ? (
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                Selected Calendar Item
              </p>
              <h4 className="mt-3 text-2xl font-bold text-slate-950">{selectedItem.title}</h4>
              <p className="mt-2 text-sm text-slate-500">
                {selectedItem.subtitle || getEntryTypeLabel(selectedItem)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`badge ${getEntryBadgeClass(selectedItem)}`}>
                {getEntryTypeLabel(selectedItem)}
              </span>
              {selectedItem.isTentative ? (
                <span className="badge bg-white text-amber-700">Tentative Date</span>
              ) : null}
              {selectedItem.entryType === 'event' ? (
                <span className="badge bg-white text-slate-700">
                  Registration {selectedItem.registrationEnabled ? 'Enabled' : 'Disabled'}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Dates</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatDate(selectedItem.startDate)} to {formatDate(selectedItem.endDate || selectedItem.startDate)}
              </p>
            </div>
            {selectedItem.entryType === 'event' ? (
              <>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Venue</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedItem.venue || '-'}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Registrations</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {selectedItem.registrationCount || 0}/{selectedItem.maxParticipants || '-'}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Notify Later</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedItem.interestCount || 0}</p>
                </div>
              </>
            ) : null}
            {selectedItem.entryType === 'sports_fixture' ? (
              <>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Sport</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedItem.sportType || 'Other'}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Location</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedItem.location || '-'}</p>
                </div>
              </>
            ) : null}
            {selectedItem.entryType === 'holiday' ? (
              <>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Category</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedItem.holidayType || '-'}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Observance</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedItem.observanceType || '-'}</p>
                </div>
              </>
            ) : null}
          </div>

          {selectedItem.entryType === 'event' ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Registration Opens</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedItem.registrationStartDate
                    ? formatDateTime(selectedItem.registrationStartDate)
                    : 'Coming Soon / Not Scheduled'}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Registration Deadline</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedItem.registrationDeadline
                    ? formatDate(selectedItem.registrationDeadline)
                    : 'Not Set'}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Details</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {selectedItem.description || emptyMessage}
            </p>
            {selectedItem.entryType === 'event' ? (
              <p className="mt-4 text-sm font-semibold text-slate-900">
                Entry Fee: {formatCurrency(selectedItem.entryFee)}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-8">
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
