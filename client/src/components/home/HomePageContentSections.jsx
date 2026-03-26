import { Link } from 'react-router-dom';

import AppIcon from '../common/AppIcon.jsx';
import ImageGallerySection from '../common/ImageGallerySection.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import PartnerHighlights from '../common/PartnerHighlights.jsx';
import {
  aboutHighlights,
  corporateTournamentSpotlight,
  eventsContent,
  partnerHighlights,
  whyChooseItems
} from '../../data/siteContent.js';
import {
  getPublicEventRegistrationStatus,
  isUpcomingOrOngoingEvent
} from '../../utils/eventTimeline.js';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js';

const defaultTheme = {
  primaryColor: '#0F5FDB',
  secondaryColor: '#0A2C66',
  highlightColor: '#0EA5E9'
};

const hexToRgba = (hex, alpha) => {
  const value = String(hex || '').replace('#', '');

  if (value.length !== 6) {
    return `rgba(15, 95, 219, ${alpha})`;
  }

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export default function HomePageContentSections({ content, events, eventsError, eventsLoading }) {
  const featuredEvents = Array.isArray(events) ? events : [];
  const theme = {
    primaryColor: content?.themePrimaryColor || defaultTheme.primaryColor,
    secondaryColor: content?.themeSecondaryColor || defaultTheme.secondaryColor,
    highlightColor: content?.themeHighlightColor || defaultTheme.highlightColor
  };
  const dateCardStyle = {
    backgroundImage: `linear-gradient(135deg, ${theme.secondaryColor}, ${theme.primaryColor}, ${theme.highlightColor})`
  };
  const highlightPanelStyle = {
    backgroundImage: `linear-gradient(135deg, ${theme.secondaryColor}, ${theme.primaryColor})`
  };
  const bulletStyle = {
    backgroundColor: hexToRgba(theme.primaryColor, 0.1),
    color: theme.primaryColor
  };

  return (
    <>
      <section className="container-shell mt-16">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="panel p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Built Around People
            </p>
            <h2 className="mt-4 text-4xl font-bold text-slate-950 sm:text-5xl">
              Sport has a way of bringing teams, families, and communities closer.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">{aboutHighlights.sportsBelief}</p>
            <p className="mt-5 text-base leading-8 text-slate-600">
              From workplace leagues and apartment tournaments to community competitions, TriCore
              creates disciplined, high-energy events that turn participation into belonging and
              healthy competition into lasting connection.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link className="btn-primary" to="/events">
                Explore upcoming events
              </Link>
              <Link className="btn-secondary" to="/contact">
                Plan with TriCore
              </Link>
            </div>
          </div>

          <div className="panel p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Why TriCore
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-950">
              Event discipline with a people-first mindset
            </h2>
            <div className="mt-6 grid gap-4">
              {whyChooseItems.map((item) => (
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5" key={item}>
                  <div className="flex items-start gap-4">
                    <span
                      className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                      style={bulletStyle}
                    >
                      +
                    </span>
                    <p className="text-sm leading-7 text-slate-700">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell mt-24">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="panel p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              {corporateTournamentSpotlight.badge}
            </p>
            <h2 className="mt-4 text-4xl font-bold text-slate-950">
              {corporateTournamentSpotlight.title}
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              {corporateTournamentSpotlight.description}
            </p>
            <p className="mt-5 text-base leading-8 text-slate-600">
              {corporateTournamentSpotlight.supportingCopy}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link className="btn-primary" to={corporateTournamentSpotlight.primaryActionHref}>
                {corporateTournamentSpotlight.primaryActionLabel}
              </Link>
              <Link className="btn-secondary" to={corporateTournamentSpotlight.secondaryActionHref}>
                {corporateTournamentSpotlight.secondaryActionLabel}
              </Link>
            </div>
          </div>

          <div className="panel p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Why It Matters
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-950">
              Sport creates a shared space for teams, communities, and brands
            </h2>
            <div className="mt-6 space-y-4">
              {[
                'Corporate teams get a structured, professionally run tournament setting that builds connection beyond the workplace.',
                'Cricket lovers and community participants get a high-energy environment that celebrates fair play, healthy competition, and belonging.',
                'Brand partners get a strong touchpoint with an active, enthusiastic audience in a live sporting atmosphere.'
              ].map((item) => (
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5" key={item}>
                  <p className="text-sm leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell mt-24">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Upcoming Tournaments
            </p>
            <h2 className="mt-3 text-4xl font-bold text-slate-950">
              Register for the next TriCore event
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              Discover the next round of sports tournaments, corporate leagues, and community
              competitions now open or preparing to open for participation.
            </p>
          </div>
          <Link className="btn-secondary" to="/events">
            View all events
          </Link>
        </div>

        {eventsLoading ? (
          <div className="panel p-8">
            <LoadingSpinner compact label="Loading upcoming events..." />
          </div>
        ) : eventsError ? (
          <div className="panel p-8">
            <p className="text-sm text-red-600">{eventsError}</p>
          </div>
        ) : featuredEvents.length ? (
          <div
            className={`grid gap-6 ${
              featuredEvents.length === 1
                ? 'mx-auto max-w-3xl'
                : featuredEvents.length === 2
                  ? 'xl:grid-cols-2'
                  : 'xl:grid-cols-3'
            } md:grid-cols-2`}
          >
            {featuredEvents.map((event) => {
              const registrationStatus = getPublicEventRegistrationStatus(event);
              const isRegistrationOpen = registrationStatus === 'open';
              const isComingSoon = registrationStatus === 'coming_soon';

              return (
                <article className="panel h-full overflow-hidden" key={event._id}>
                  <div className="grid min-h-full gap-0 xl:grid-cols-[124px_1fr]">
                    <div
                      className="flex flex-row items-center justify-between gap-4 px-5 py-5 text-white xl:flex-col xl:justify-center xl:px-4 xl:py-8"
                      style={dateCardStyle}
                    >
                      <p className="text-4xl font-bold">
                        {new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(new Date(event.startDate))}
                      </p>
                      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">
                        {new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(
                          new Date(event.startDate)
                        )}
                      </p>
                    </div>

                    <div className="flex h-full flex-col p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="badge" style={bulletStyle}>
                            {event.sportType}
                          </span>
                          <h3 className="mt-4 text-2xl font-bold text-slate-950">{event.name}</h3>
                        </div>
                        <span
                          className={`badge ${
                            isRegistrationOpen
                              ? 'bg-emerald-50 text-emerald-700'
                              : isComingSoon
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isRegistrationOpen ? 'Open' : isComingSoon ? 'Coming Soon' : 'Closed'}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        {event.description ||
                          'Tournament-ready planning, smooth registrations, and a participant experience built around clarity and energy.'}
                      </p>
                      <div className="mt-5 grid gap-3 text-sm text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-900">Venue:</span> {event.venue}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Entry Fee:</span>{' '}
                          {formatCurrency(event.entryFee)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            {isComingSoon ? 'Registration Opens:' : 'Registration Deadline:'}
                          </span>{' '}
                          {isComingSoon && event.registrationStartDate
                            ? formatDateTime(event.registrationStartDate)
                            : event.registrationDeadline
                              ? formatDate(event.registrationDeadline)
                              : 'Coming Soon'}
                        </p>
                      </div>
                      <div className="mt-6">
                        <Link className="btn-primary" to={`/events/${event._id}`}>
                          {isComingSoon ? 'Notify later' : 'View event'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="panel p-8">
            <p className="text-sm text-slate-500">
              No upcoming events are published yet. New tournaments will appear here once the admin
              team publishes them.
            </p>
          </div>
        )}
      </section>

      <section className="container-shell mt-24">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="panel p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              What We Organize
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-950">
              Structured events for sport, business, and community life
            </h2>
            <div className="mt-6 space-y-4">
              {[...eventsContent.sports.slice(0, 2), ...eventsContent.corporate.slice(0, 2)].map((item) => (
                <div className="rounded-3xl bg-slate-50 p-5" key={item}>
                  <p className="text-sm leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] text-white" style={highlightPanelStyle}>
            <div className="grid gap-4 p-8 sm:grid-cols-2 sm:p-10">
              {eventsContent.process.slice(0, 4).map((step, index) => (
                <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm" key={step.title}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                      Step {index + 1}
                    </p>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white">
                      <AppIcon className="h-4 w-4" name={step.icon} />
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-blue-50">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel mt-8 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Our Promise
          </p>
          <p className="mt-4 text-lg leading-8 text-slate-700">{eventsContent.difference}</p>
        </div>
      </section>

      {content?.galleryEnabledHome ? (
        <ImageGallerySection
          description={content.homeGalleryDescription}
          images={content.homeGalleryImages}
          title={content.homeGalleryTitle}
        />
      ) : null}

      <PartnerHighlights
        description="Spark 7 Sports Arena and Sarva Horizon are part of the collaboration story behind TriCore's current tournament direction."
        partners={partnerHighlights}
        title="Featured Partners"
      />
    </>
  );
}
