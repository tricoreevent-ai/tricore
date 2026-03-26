import { useEffect, useState } from 'react';

import { getEvents } from '../../api/eventsApi.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import EventCard from '../../components/events/EventCard.jsx';
import { eventsContent } from '../../data/siteContent.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { isPastEvent, isUpcomingOrOngoingEvent, sortEventsByStartDate } from '../../utils/eventTimeline.js';

const sportTypes = ['All', 'Cricket', 'Football', 'Badminton', 'Swimming'];

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState('All');
  const [error, setError] = useState('');
  const upcomingEvents = sortEventsByStartDate(events).filter((event) => isUpcomingOrOngoingEvent(event));
  const pastEvents = sortEventsByStartDate(events)
    .filter((event) => isPastEvent(event))
    .reverse();

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
    <div className="container-shell py-16">
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Events</p>
          <h1 className="mt-3 text-4xl font-bold">Fueling the spirit of competition</h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Whether you are a corporation building team spirit or a community creating connection,
            TriCore designs sports and corporate events that bring people closer through healthy
            competition, smooth operations, and memorable shared moments.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {sportTypes.map((sport) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedSport === sport ? 'bg-brand-blue text-white' : 'bg-white text-slate-600 shadow-soft'}`}
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
        <div className="space-y-12">
          <section>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                  Upcoming Events
                </p>
                <h2 className="mt-3 text-3xl font-bold">Open for discovery and registration</h2>
              </div>
              <p className="text-sm text-slate-500">
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

          <section>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                  Past Events
                </p>
                <h2 className="mt-3 text-3xl font-bold">Completed tournaments and earlier editions</h2>
              </div>
              <p className="text-sm text-slate-500">
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

      <div className="mb-12 mt-12 grid gap-8 lg:grid-cols-2">
        <section className="panel p-8">
          <h2 className="text-2xl font-bold">Sports Events</h2>
          <div className="mt-6 space-y-4">
            {eventsContent.sports.map((item) => (
              <div className="rounded-3xl bg-slate-50 p-5" key={item}>
                <p className="text-sm leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-8">
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

      <section className="panel p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Our Process
          </p>
          <h2 className="mt-3 text-3xl font-bold">A blueprint for success</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          {eventsContent.process.map((step, index) => (
            <div className="rounded-3xl bg-slate-50 p-5" key={step.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">
                Step {index + 1}
              </p>
              <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm leading-7 text-slate-600">{eventsContent.difference}</p>
      </section>
    </div>
  );
}
