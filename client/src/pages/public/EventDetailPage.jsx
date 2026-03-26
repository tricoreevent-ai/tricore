import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { getMatchesByEvent } from '../../api/dashboardApi.js';
import { getEventById } from '../../api/eventsApi.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import NotifyInterestPanel from '../../components/events/NotifyInterestPanel.jsx';
import RegistrationForm from '../../components/dashboards/RegistrationForm.jsx';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js';
import {
  getPublicEventRegistrationStatus,
  isRegistrationComingSoonForEvent,
  isRegistrationOpenForEvent
} from '../../utils/eventTimeline.js';

export default function EventDetailPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);

      try {
        const [eventResponse, matchesResponse] = await Promise.all([
          getEventById(eventId),
          getMatchesByEvent(eventId)
        ]);

        setEvent(eventResponse);
        setMatches(matchesResponse);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [eventId]);

  if (loading) {
    return <LoadingSpinner label="Loading event details..." />;
  }

  if (!event) {
    return (
      <div className="container-shell py-16">
        <div className="panel p-8 text-center">
          <h1 className="text-3xl font-bold">Event not found</h1>
        </div>
      </div>
    );
  }

  const registrationStatus = getPublicEventRegistrationStatus(event);
  const isRegistrationOpen = isRegistrationOpenForEvent(event);
  const isComingSoon = isRegistrationComingSoonForEvent(event);

  return (
    <div className="container-shell py-16">
      <div className="grid gap-10 2xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-8">
          <div className="panel overflow-hidden">
            <div className="bg-gradient-to-br from-brand-blue via-brand-navy to-sky-500 p-8 text-white">
              <span className="badge bg-white/15 text-white">{event.sportType}</span>
              <h1 className="mt-4 text-4xl font-bold text-white">{event.name}</h1>
              <p className="mt-4 max-w-2xl text-blue-100">
                {event.description || 'Set up registrations, collect payments, and manage fixtures from a single dashboard.'}
              </p>
            </div>
            <div className="grid gap-4 p-8 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">Venue</p>
                <p className="mt-2 text-lg font-bold text-slate-950">{event.venue}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">Entry Fee</p>
                <p className="mt-2 text-lg font-bold text-slate-950">{formatCurrency(event.entryFee)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">Dates</p>
                <p className="mt-2 text-lg font-bold text-slate-950">
                  {formatDate(event.startDate)} to {formatDate(event.endDate)}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">Registration Deadline</p>
                <p className="mt-2 text-lg font-bold text-slate-950">
                  {event.registrationDeadline ? formatDate(event.registrationDeadline) : 'Coming Soon'}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">Registration Opens</p>
                <p className="mt-2 text-lg font-bold text-slate-950">
                  {event.registrationStartDate
                    ? formatDateTime(event.registrationStartDate)
                    : event.registrationDeadline
                      ? 'Already open'
                      : 'Coming Soon'}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">Team Size</p>
                <p className="mt-2 text-lg font-bold text-slate-950">{event.teamSize}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">Player Limit</p>
                <p className="mt-2 text-lg font-bold text-slate-950">{event.playerLimit}</p>
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">Match Schedule</h2>
              <p className="mt-2 text-sm text-slate-500">Participants can review the published fixtures for this event.</p>
            </div>
            <div className="overflow-x-auto">
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
                  {matches.length ? (
                    matches.map((match) => (
                      <tr className="border-b border-slate-100" key={match._id}>
                        <td className="py-4 pr-4 text-slate-600">{match.roundLabel || 'Knockout'}</td>
                        <td className="py-4 pr-4 font-medium text-slate-900">
                          {match.teamA} vs {match.teamB}
                        </td>
                        <td className="py-4 pr-4 text-slate-600">{match.date || 'TBD'}</td>
                        <td className="py-4 pr-4 text-slate-600">{match.time || 'TBD'}</td>
                        <td className="py-4 text-slate-600">{match.venue || 'TBD'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-6 text-slate-500" colSpan="5">
                        Schedule has not been published yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <div className="panel p-6">
            <span
              className={`badge ${
                registrationStatus === 'open'
                  ? 'bg-emerald-50 text-emerald-700'
                  : registrationStatus === 'coming_soon'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-700'
              }`}
            >
              {registrationStatus === 'open'
                ? 'Registration Open'
                : registrationStatus === 'coming_soon'
                  ? 'Coming Soon'
                  : registrationStatus === 'completed'
                    ? 'Event Completed'
                    : 'Registration Closed'}
            </span>
            <h2 className="mt-4 text-2xl font-bold text-slate-950">Participation</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {isRegistrationOpen
                ? 'Registrations are currently open. Complete the form below to reserve your slot.'
                : isComingSoon
                  ? 'Registrations have not opened yet. Join the notify-later list to receive the registration link the moment the event goes live.'
                  : registrationStatus === 'completed'
                    ? 'This event has already been completed and no longer accepts new registrations.'
                    : 'Registrations are currently unavailable for this event.'}
            </p>
          </div>

          {isRegistrationOpen ? (
            <RegistrationForm event={event} />
          ) : isComingSoon ? (
            <div className="panel p-6">
              <NotifyInterestPanel event={event} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
