import { Link } from 'react-router-dom';

import {
  aboutHighlights,
  contactContent,
  corporateEventsHomeFeature,
  corporateTournamentSpotlight,
  eventsContent,
  homeCredibilitySignals,
  homeFinalCta,
  partnerHighlights,
  whyChooseItems
} from '../../data/siteContent.js';
import { getWhatsAppHref } from '../../utils/contactLinks.js';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js';
import { getPublicEventRegistrationStatus } from '../../utils/eventTimeline.js';
import AppIcon from '../common/AppIcon.jsx';
import ImageGallerySection from '../common/ImageGallerySection.jsx';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import PartnerHighlights from '../common/PartnerHighlights.jsx';

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
  const primaryWhatsAppPhone =
    contactContent.whatsAppPhone ||
    contactContent.partners.flatMap((partner) => partner.phones || [])[0] ||
    '';
  const quickWhatsAppHref = getWhatsAppHref(primaryWhatsAppPhone, contactContent.whatsAppMessage);
  const eventsTitle = content?.eventsTitle || 'Upcoming Tournaments';
  const eventsDescription =
    content?.eventsDescription ||
    'Discover the next round of sports tournaments, corporate leagues, and community competitions now open or preparing to open for participation.';

  return (
    <>
      <section className="container-shell mt-16">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="panel p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Built Around People
            </p>
            <h2 className="mt-4 text-4xl font-bold text-slate-950 sm:text-5xl">
              Events feel stronger when partner experience and people-first planning work together.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">{aboutHighlights.sportsBelief}</p>
            <p className="mt-5 text-base leading-8 text-slate-600">
              From workplace leagues and apartment tournaments to community competitions, TriCore
              creates disciplined, high-energy events backed by partners who understand venue flow,
              logistics, communication, and the details that build confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link className="btn-primary" to="/events">
                Register for a Tournament
              </Link>
              <Link className="btn-secondary" to="/contact">
                Request a Quote
              </Link>
            </div>
          </div>

          <div className="panel p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Why TriCore
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-950">
              Partner-backed execution with clear reasons to trust the process
            </h2>
            <div className="mt-6 grid gap-4">
              {whyChooseItems.map((item) => (
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5" key={item.title}>
                  <div className="flex items-start gap-4">
                    <span
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                      style={bulletStyle}
                    >
                      <AppIcon className="h-5 w-5" name={item.icon} />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{item.title}</h3>
                      <p className="mt-2 text-base leading-7 text-slate-700">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-24 bg-slate-100/70 py-16">
        <div className="container-shell">
          <div className="mb-8 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Trust Signals
            </p>
            <h2 className="mt-3 text-4xl font-bold text-slate-950">
              TriCore is a growing brand supported by experienced event operators
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              We keep the public story honest and clear: TriCore is new, and the experience comes
              from the partners, organizers, venues, and delivery network behind it.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {homeCredibilitySignals.map((signal) => (
              <article className="panel h-full p-7" key={signal.title}>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  Credibility
                </p>
                <h3 className="mt-4 text-2xl font-bold text-slate-950">{signal.title}</h3>
                <p className="mt-4 text-base leading-8 text-slate-600">{signal.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell mt-24">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="panel p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              {corporateEventsHomeFeature.badge}
            </p>
            <h2 className="mt-4 text-4xl font-bold text-slate-950">
              {corporateEventsHomeFeature.title}
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              {corporateEventsHomeFeature.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link className="btn-primary" to={corporateEventsHomeFeature.primaryActionHref}>
                {corporateEventsHomeFeature.primaryActionLabel}
              </Link>
              <Link className="btn-secondary" to={corporateEventsHomeFeature.secondaryActionHref}>
                {corporateEventsHomeFeature.secondaryActionLabel}
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] text-white" style={highlightPanelStyle}>
            <div className="p-8 sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
                Corporate planning, without the chaos
              </p>
              <h2 className="mt-4 text-3xl font-bold text-white">
                A sharper corporate offering for teams, leaders, and stakeholders
              </h2>
              <div className="mt-6 grid gap-4">
                {corporateEventsHomeFeature.points.map((item, index) => (
                  <div
                    className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm"
                    key={item}
                  >
                    <div className="flex items-start gap-4">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-sm font-bold text-white">
                        0{index + 1}
                      </span>
                      <p className="text-base leading-7 text-blue-50">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-24 bg-slate-100/70 py-16">
        <div className="container-shell grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
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
              Sport creates a shared space for teams, communities, brands, and trusted partners
            </h2>
            <div className="mt-6 space-y-4">
              {[
                'Corporate teams get a structured, professionally run tournament setting that builds connection beyond the workplace.',
                'Participants get a high-energy environment shaped by communication, clarity, and fair play.',
                'Brand and venue partners get a credible platform supported by organizers who understand live-event execution.'
              ].map((item) => (
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5" key={item}>
                  <p className="text-base leading-7 text-slate-700">{item}</p>
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
            <h2 className="mt-3 text-4xl font-bold text-slate-950">{eventsTitle}</h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              {eventsDescription}
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
                      <p className="mt-4 text-base leading-7 text-slate-600">
                        {event.description ||
                          'Tournament-ready planning, smooth registrations, and a participant experience built around clarity and energy.'}
                      </p>
                      <div className="mt-5 grid gap-3 text-base text-slate-600">
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
                  <p className="text-base leading-7 text-slate-700">{item}</p>
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
                  <p className="mt-3 text-base leading-7 text-blue-50">{step.description}</p>
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
        description="Our trusted partners help strengthen venue quality, event presentation, and delivery confidence across current TriCore experiences."
        partners={partnerHighlights}
        title="Trusted Partners"
      />

      <section className="container-shell mt-24">
        <div className="overflow-hidden rounded-[2rem] text-white shadow-soft" style={highlightPanelStyle}>
          <div className="grid gap-6 p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
                {homeFinalCta.badge}
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-bold text-white">
                {homeFinalCta.title}
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-blue-50">
                {homeFinalCta.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 lg:justify-end">
              <Link
                className="btn-primary bg-white text-slate-950 hover:bg-slate-100"
                to={homeFinalCta.primaryActionHref}
              >
                {homeFinalCta.primaryActionLabel}
              </Link>
              {quickWhatsAppHref ? (
                <a
                  className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20"
                  href={quickWhatsAppHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  {homeFinalCta.secondaryActionLabel}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
