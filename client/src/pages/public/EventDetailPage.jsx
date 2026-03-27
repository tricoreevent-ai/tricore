import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { getMatchesByEvent } from '../../api/dashboardApi.js';
import { getEventById } from '../../api/eventsApi.js';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import NotifyInterestPanel from '../../components/events/NotifyInterestPanel.jsx';
import RegistrationForm from '../../components/dashboards/RegistrationForm.jsx';
import useAuth from '../../hooks/useAuth.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js';
import {
  getPublicEventRegistrationStatus,
  isRegistrationComingSoonForEvent,
  isRegistrationOpenForEvent
} from '../../utils/eventTimeline.js';

const registrationStatusClasses = {
  open: 'bg-emerald-50 text-emerald-700',
  coming_soon: 'bg-amber-50 text-amber-700',
  completed: 'bg-slate-100 text-slate-700',
  closed: 'bg-slate-100 text-slate-700'
};

const registrationStatusLabels = {
  open: 'Registration Open',
  coming_soon: 'Coming Soon',
  completed: 'Event Completed',
  closed: 'Registration Closed'
};

const infoCards = (event) => [
  {
    label: 'Venue',
    value: event.venue
  },
  {
    label: 'Entry Fee',
    value: formatCurrency(event.entryFee)
  },
  {
    label: 'Dates',
    value: `${formatDate(event.startDate)} to ${formatDate(event.endDate)}`
  },
  {
    label: 'Registration Deadline',
    value: event.registrationDeadline ? formatDate(event.registrationDeadline) : 'Coming Soon'
  },
  {
    label: 'Registration Opens',
    value: event.registrationStartDate
      ? formatDateTime(event.registrationStartDate)
      : event.registrationDeadline
        ? 'Already open'
        : 'Coming Soon'
  },
  {
    label: 'Team Size',
    value: event.teamSize
  },
  {
    label: 'Player Limit',
    value: event.playerLimit
  }
];

export default function EventDetailPage() {
  const { eventId } = useParams();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [event, setEvent] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const previewEvent = location.state?.eventPreview || null;
  const lockedStatus = previewEvent ? getPublicEventRegistrationStatus(previewEvent) : 'closed';

  useEffect(() => {
    let ignore = false;

    const loadDetail = async () => {
      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        setLoading(false);
        setError('');
        setMatches([]);
        setEvent(previewEvent);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [eventResponse, matchesResponse] = await Promise.all([
          getEventById(eventId),
          getMatchesByEvent(eventId)
        ]);

        if (ignore) {
          return;
        }

        setEvent(eventResponse);
        setMatches(matchesResponse);
      } catch (requestError) {
        if (!ignore) {
          setError(getApiErrorMessage(requestError, 'Unable to load event details right now.'));
          setEvent(null);
          setMatches([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      ignore = true;
    };
  }, [authLoading, eventId, isAuthenticated, previewEvent]);

  const registrationStatus = useMemo(() => {
    if (!event) {
      return lockedStatus;
    }

    return getPublicEventRegistrationStatus(event);
  }, [event, lockedStatus]);

  if (authLoading || loading) {
    return <LoadingSpinner label={authLoading ? 'Checking your sign-in...' : 'Loading event details...'} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="container-shell py-6 sm:py-10">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="panel overflow-hidden">
            <div className="bg-gradient-to-br from-brand-blue via-brand-navy to-sky-500 p-5 text-white sm:p-8">
              <span className="badge bg-white/15 text-white">
                {previewEvent?.sportType || 'Event access'}
              </span>
              <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
                {previewEvent?.name || 'Sign in to view this event'}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
                Google login is required before a user can open event details, see the full schedule,
                or start registration.
              </p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
              <div className="rounded-[1.5rem] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Access
                </p>
                <p className="mt-2 text-base font-bold text-slate-950">Google sign-in required</p>
              </div>
              <div className="rounded-[1.5rem] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-base font-bold text-slate-950">
                  {registrationStatusLabels[lockedStatus] || registrationStatusLabels.closed}
                </p>
              </div>
            </div>
          </section>

          <aside className="panel p-5 sm:p-6">
            <span className={`badge ${registrationStatusClasses[lockedStatus] || registrationStatusClasses.closed}`}>
              {registrationStatusLabels[lockedStatus] || registrationStatusLabels.closed}
            </span>
            <h2 className="mt-4 text-2xl font-bold text-slate-950">Unlock event details</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Sign in with Google to see the full event page, review the schedule, confirm your
              account email, and register from the same screen.
            </p>

            <div className="mt-5 rounded-[1.75rem] border border-dashed border-brand-blue/20 bg-brand-mist/50 p-4 sm:p-5">
              <p className="mb-3 text-sm font-medium text-slate-700">
                Continue with your Google account to access this event.
              </p>
              <GoogleLoginButton />
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-[1.5rem] bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Why sign in first?</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  It keeps registrations tied to one account, shows your email during form filling,
                  and lets you return later to add more players to the same registration.
                </p>
              </div>
              <div className="rounded-[1.5rem] bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Best on mobile too</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Once you sign in, the detail page switches to a tighter mobile layout with stacked
                  cards, touch-friendly actions, and a fixed account bar at the top.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-shell py-6 sm:py-10">
        <div className="panel p-6 text-center sm:p-8">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Unable to load event</h1>
          <p className="mt-3 text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container-shell py-6 sm:py-10">
        <div className="panel p-6 text-center sm:p-8">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Event not found</h1>
        </div>
      </div>
    );
  }

  const isRegistrationOpen = isRegistrationOpenForEvent(event);
  const isComingSoon = isRegistrationComingSoonForEvent(event);

  return (
    <div className="container-shell py-5 sm:py-8 lg:py-10">
      <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] xl:gap-8">
        <section className="space-y-5">
          <div className="panel overflow-hidden">
            <div className="bg-gradient-to-br from-brand-blue via-brand-navy to-sky-500 p-5 text-white sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="badge bg-white/15 text-white">{event.sportType}</span>
                  <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">{event.name}</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100 sm:text-base">
                    {event.description || 'Set up registrations, collect payments, and manage fixtures from a single dashboard.'}
                  </p>
                </div>
                <span className={`badge w-fit ${registrationStatusClasses[registrationStatus] || registrationStatusClasses.closed}`}>
                  {registrationStatusLabels[registrationStatus] || registrationStatusLabels.closed}
                </span>
              </div>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
              {infoCards(event).map((item) => (
                <div className="rounded-[1.5rem] bg-slate-50 p-4" key={item.label}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-bold leading-6 text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-4 sm:p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-slate-950">Match Schedule</h2>
              <p className="mt-2 text-sm text-slate-500">
                Participants can review the published fixtures for this event.
              </p>
            </div>

            {matches.length ? (
              <>
                <div className="space-y-3 md:hidden">
                  {matches.map((match) => (
                    <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={match._id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {match.roundLabel || 'Knockout'}
                          </p>
                          <p className="mt-2 text-base font-bold text-slate-950">
                            {match.teamA} vs {match.teamB}
                          </p>
                        </div>
                        <span className="badge bg-white text-slate-700 shadow-soft">
                          {match.time || 'TBD'}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-900">Date:</span> {match.date || 'TBD'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Venue:</span> {match.venue || 'TBD'}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="pb-3 pr-4">Round</th>
                        <th className="pb-3 pr-4">Match</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Time</th>
                        <th className="pb-3">Venue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((match) => (
                        <tr className="border-b border-slate-100" key={match._id}>
                          <td className="py-4 pr-4 text-slate-600">{match.roundLabel || 'Knockout'}</td>
                          <td className="py-4 pr-4 font-medium text-slate-900">
                            {match.teamA} vs {match.teamB}
                          </td>
                          <td className="py-4 pr-4 text-slate-600">{match.date || 'TBD'}</td>
                          <td className="py-4 pr-4 text-slate-600">{match.time || 'TBD'}</td>
                          <td className="py-4 text-slate-600">{match.venue || 'TBD'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Schedule has not been published yet.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="panel p-4 sm:p-6">
            <span className={`badge ${registrationStatusClasses[registrationStatus] || registrationStatusClasses.closed}`}>
              {registrationStatusLabels[registrationStatus] || registrationStatusLabels.closed}
            </span>
            <h2 className="mt-4 text-2xl font-bold text-slate-950">Participation</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {isRegistrationOpen
                ? 'Registrations are open. Sign in, confirm your Google account details, and submit or update the roster from this page.'
                : isComingSoon
                  ? 'Registrations have not opened yet. Join the notify-later list so you are contacted as soon as the event goes live.'
                  : registrationStatus === 'completed'
                    ? 'This event has already been completed and no longer accepts new registrations.'
                    : 'Registrations are currently unavailable for this event.'}
            </p>
          </div>

          {isRegistrationOpen ? (
            <RegistrationForm event={event} />
          ) : isComingSoon ? (
            <div className="panel p-4 sm:p-6">
              <NotifyInterestPanel event={event} />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
