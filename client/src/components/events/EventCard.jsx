import { Link } from 'react-router-dom';

import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js';
import { getPublicEventRegistrationStatus, isPastEvent } from '../../utils/eventTimeline.js';

export default function EventCard({ event }) {
  const isPast = isPastEvent(event);
  const registrationStatus = getPublicEventRegistrationStatus(event);
  const statusClass =
    registrationStatus === 'completed'
      ? 'bg-slate-100 text-slate-700'
      : registrationStatus === 'open'
        ? 'bg-emerald-400/20 text-emerald-100'
        : registrationStatus === 'coming_soon'
          ? 'bg-amber-400/20 text-amber-100'
          : 'bg-white/10 text-white';
  const statusLabel =
    registrationStatus === 'completed'
      ? 'Completed'
      : registrationStatus === 'open'
        ? 'Registration Open'
        : registrationStatus === 'coming_soon'
          ? 'Coming Soon'
          : 'Registration Closed';

  return (
    <article className="panel overflow-hidden">
      <div className="bg-gradient-to-br from-brand-blue to-brand-navy p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="badge bg-white/15 text-white">{event.sportType}</span>
            <h3 className="mt-4 text-2xl font-bold text-white">{event.name}</h3>
            <p className="mt-2 max-w-xl text-sm text-blue-100">
              {event.description || 'Tournament-ready event operations with structured registrations and scheduling.'}
            </p>
          </div>
          <span className={`badge ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
      </div>
      <div className="space-y-4 p-6">
        <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">Venue:</span> {event.venue}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Entry Fee:</span> {formatCurrency(event.entryFee)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Dates:</span> {formatDate(event.startDate)} to {formatDate(event.endDate)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Registrations:</span> {event.registrationCount || 0}/{event.maxParticipants}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            {isPast
              ? `Completed: ${formatDate(event.endDate)}`
              : registrationStatus === 'coming_soon'
                ? `Registration opens: ${event.registrationStartDate ? formatDateTime(event.registrationStartDate) : 'Coming Soon'}`
                : event.registrationDeadline
                  ? `Deadline: ${formatDate(event.registrationDeadline)}`
                  : 'Registration window will be announced shortly.'}
          </p>
          <Link className="btn-primary" to={`/events/${event._id}`}>
            {registrationStatus === 'coming_soon' ? 'Notify Later' : 'View Event'}
          </Link>
        </div>
      </div>
    </article>
  );
}
