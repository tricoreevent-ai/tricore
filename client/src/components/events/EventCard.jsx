import { Link } from 'react-router-dom';

import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { isDateOnOrAfterToday, isPastEvent } from '../../utils/eventTimeline.js';

export default function EventCard({ event }) {
  const isPast = isPastEvent(event);
  const isRegistrationOpen =
    !isPast && Boolean(event.registrationEnabled) && isDateOnOrAfterToday(event.registrationDeadline);
  const statusClass = isPast
    ? 'bg-slate-100 text-slate-700'
    : isRegistrationOpen
      ? 'bg-emerald-400/20 text-emerald-100'
      : 'bg-white/10 text-white';
  const statusLabel = isPast
    ? 'Completed'
    : isRegistrationOpen
      ? 'Registration Open'
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
            {isPast ? `Completed: ${formatDate(event.endDate)}` : `Deadline: ${formatDate(event.registrationDeadline)}`}
          </p>
          <Link className="btn-primary" to={`/events/${event._id}`}>
            View Event
          </Link>
        </div>
      </div>
    </article>
  );
}
