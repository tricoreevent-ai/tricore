import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getEvents } from '../../api/eventsApi.js';
import CompactMonthCalendar from '../../components/calendar/CompactMonthCalendar.jsx';
import AppIcon from '../../components/common/AppIcon.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import EventCard from '../../components/events/EventCard.jsx';
import { eventsContent } from '../../data/siteContent.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js';
import {
  getPublicEventRegistrationStatus,
  isPastEvent,
  isUpcomingOrOngoingEvent,
  isVisiblePublicEvent,
  sortEventsByStartDate,
  sortPublicUpcomingEvents
} from '../../utils/eventTimeline.js';

const sportTypes = ['All', 'Cricket', 'Football', 'Badminton', 'Swimming'];
const registrationStatusClasses = {
  open: 'bg-emerald-50 text-emerald-700',
  coming_soon: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-700',
  closed: 'bg-slate-100 text-slate-700'
};

const registrationDotClasses = {
  open: 'bg-emerald-400',
  coming_soon: 'bg-amber-400',
  completed: 'bg-slate-400',
  closed: 'bg-slate-400'
};

const registrationStatusLabels = {
  open: 'Registration Open',
  coming_soon: 'Coming Soon',
  completed: 'Completed',
  closed: 'Registration Closed'
};

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('All');
  const [error, setError] = useState('');
  const publicEvents = events.filter((event) => isVisiblePublicEvent(event));
  const upcomingEvents = sortPublicUpcomingEvents(
    publicEvents.filter((event) => isUpcomingOrOngoingEvent(event))
  );
  const pastEvents = sortEventsByStartDate(publicEvents)
    .filter((event) => isPastEvent(event))
    .reverse();
  const mobileCalendarEvents = useMemo(
    () => sortEventsByStartDate(publicEvents),
    [publicEvents]
  );
  const mobileCalendarInitialMonth = useMemo(
    () => mobileCalendarEvents[0]?.startDate || new Date(),
    [mobileCalendarEvents]
  );

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);

      try {
        const response = await getEvents(selectedSport === 'All' ? {} : { sportType: selectedSport });
        setEvents(response);
        setError('');
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load events right now.'));
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [selectedSport]);

  return (
    <div className="container-shell py-6 sm:py-10 lg:py-14">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Events</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Fueling the spirit of competition</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Whether you are a corporation building team spirit or a community creating connection,
            TriCore designs sports and corporate events that bring people closer through healthy
            competition, smooth operations, and memorable shared moments.
          </p>
        </div>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
          {sportTypes.map((sport) => (
            <button
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${selectedSport === sport ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 shadow-soft'}`}
              key={sport}
              onClick={() => setSelectedSport(sport)}
              type="button"
            >
              {sport}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading events..." />
      ) : error ? (
        <div className="panel p-8">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : events.length ? (
        <div className="space-y-10">
          <section className="md:hidden">
            <CompactMonthCalendar
              emptyDayMessage="No event registrations are scheduled on this date for the current filter."
              getItemDotClass={(event) =>
                registrationDotClasses[getPublicEventRegistrationStatus(event)] || 'bg-brand-blue'
              }
              getItemId={(event) => event._id}
              initialMonth={mobileCalendarInitialMonth}
              items={mobileCalendarEvents}
              renderSelectedItem={(event) => {
                const registrationStatus = getPublicEventRegistrationStatus(event);

                return (
                  <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-slate-950">{event.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{event.sportType} registration</p>
                      </div>
                      <span className={`badge ${registrationStatusClasses[registrationStatus] || registrationStatusClasses.closed}`}>
                        {registrationStatusLabels[registrationStatus] || registrationStatusLabels.closed}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600">
                      <p>
                        <span className="font-semibold text-slate-900">Dates:</span>{' '}
                        {formatDate(event.startDate)} to {formatDate(event.endDate)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Entry Fee:</span>{' '}
                        {formatCurrency(event.entryFee)}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Registration Opens:</span>{' '}
                        {event.registrationStartDate
                          ? formatDateTime(event.registrationStartDate)
                          : event.registrationDeadline
                            ? 'Already open'
                            : 'Coming Soon'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-900">Registration Deadline:</span>{' '}
                        {event.registrationDeadline ? formatDate(event.registrationDeadline) : 'Coming Soon'}
                      </p>
                    </div>

                    <Link
                      className="btn-primary mt-4 w-full"
                      state={{ eventPreview: event }}
                      to={`/events/${event._id}`}
                    >
                      {registrationStatus === 'coming_soon' ? 'Open Notify View' : 'View Registration'}
                    </Link>
                  </article>
                );
              }}
              subtitle="Android-style month view for mobile. Tap a date to see only the registration details for that day."
              title="Event Calendar"
            />
          </section>

          <section className="hidden md:block">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                  Upcoming Events
                </p>
                <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Open for discovery and registration</h2>
              </div>
              <p className="text-sm leading-6 text-slate-500">
                Register for the next TriCore tournaments, leagues, and community events.
              </p>
            </div>

            {upcomingEvents.length ? (
              <div className="grid gap-6 xl:grid-cols-2">
                {upcomingEvents.map((event) => (
                  <EventCard event={event} key={event._id} />
                ))}
              </div>
            ) : (
              <div className="panel p-8">
                <p className="text-sm text-slate-500">
                  No upcoming events match the selected sport right now. Check back soon for new
                  registrations.
                </p>
              </div>
            )}
          </section>

          <section className="hidden md:block">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                  Past Events
                </p>
                <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Completed tournaments and earlier editions</h2>
              </div>
              <p className="text-sm leading-6 text-slate-500">
                Look back at the events TriCore has already delivered across sports and corporate
                participation.
              </p>
            </div>

            {pastEvents.length ? (
              <div className="grid gap-6 xl:grid-cols-2">
                {pastEvents.map((event) => (
                  <EventCard event={event} key={event._id} />
                ))}
              </div>
            ) : (
              <div className="panel p-8">
                <p className="text-sm text-slate-500">
                  No past events are available for this filter yet.
                </p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="panel p-8">
          <p className="text-sm text-slate-500">
            No events are published yet. Once the admin team creates tournaments, they will appear here for registration.
          </p>
        </div>
      )}

      <div className="mb-10 mt-10 hidden gap-5 md:grid lg:grid-cols-2">
        <section className="panel p-5 sm:p-8">
          <h2 className="text-2xl font-bold">Sports Events</h2>
          <div className="mt-6 space-y-4">
            {eventsContent.sports.map((item) => (
              <div className="rounded-3xl bg-slate-50 p-5" key={item}>
                <p className="text-sm leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5 sm:p-8">
          <h2 className="text-2xl font-bold">Corporate Events</h2>
          <div className="mt-6 space-y-4">
            {eventsContent.corporate.map((item) => (
              <div className="rounded-3xl bg-slate-50 p-5" key={item}>
                <p className="text-sm leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="hidden panel p-5 md:block md:p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Our Process
          </p>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">A blueprint for success</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          {eventsContent.process.map((step, index) => (
            <div
              className="group rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_60%,#eef4ff_100%)] p-5 shadow-soft transition hover:-translate-y-1"
              key={step.title}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">
                  Step {index + 1}
                </span>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-mist text-brand-blue">
                  <AppIcon className="h-5 w-5" name={step.icon} />
                </span>
              </div>
              <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm leading-7 text-slate-600">{eventsContent.difference}</p>
      </section>
    </div>
  );
}
