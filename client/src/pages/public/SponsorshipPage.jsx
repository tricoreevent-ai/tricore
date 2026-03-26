import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getPublicHomePageContent } from '../../api/publicSettingsApi.js';
import { homePageContentFallback } from '../../data/siteContent.js';
import { sponsorshipTiers } from '../../data/sponsorshipTiers.js';

const visibilityHighlights = [
  'On-Site Branding: Venue banners and prominent ground branding.',
  'Promotional Materials: Logo placement on all tournament posters and creatives.',
  'Digital Coverage: Featured in social media posts, event coverage, and match announcements.',
  'Live Recognition: Brand mentions during commentary and match announcements.'
];

const audienceGroups = [
  'Corporate employees and professionals',
  'Passionate cricket lovers',
  'Local apartment residents',
  'Families and event spectators'
];

const brandAssociationValues = [
  'Teamwork and camaraderie',
  'Energy and enthusiasm',
  'Community participation',
  'Health and active living'
];

const strategicCards = [
  {
    eyebrow: 'Brand Visibility',
    title: 'Multi-channel exposure before, during, and after the tournament.',
    points: visibilityHighlights
  },
  {
    eyebrow: 'Audience Engagement',
    title: 'Real-world interaction with a diverse and active sports-first audience.',
    points: audienceGroups
  },
  {
    eyebrow: 'Brand Association',
    title: 'Align your brand with values communities already want to support.',
    points: brandAssociationValues
  },
  {
    eyebrow: 'Community Connect',
    title: 'Build trust on the ground through direct, local, face-to-face visibility.',
    points: [
      'Apartment communities are part of the event ecosystem, not just observers.',
      'Sponsors gain a friendlier and more human setting than traditional advertising.',
      'On-ground visibility helps build familiarity, goodwill, and repeat recall.'
    ]
  }
];

export default function SponsorshipPage() {
  const [contentConfig, setContentConfig] = useState(homePageContentFallback);

  useEffect(() => {
    let ignore = false;

    const loadContentConfig = async () => {
      try {
        const response = await getPublicHomePageContent();

        if (!ignore && response) {
          setContentConfig({
            ...homePageContentFallback,
            ...response
          });
        }
      } catch {
        if (!ignore) {
          setContentConfig(homePageContentFallback);
        }
      }
    };

    loadContentConfig();

    return () => {
      ignore = true;
    };
  }, []);

  // Reuse the configurable public theme colors so the sponsorship page stays visually aligned.
  const pageTheme = useMemo(
    () => ({
      primary: contentConfig.themePrimaryColor || homePageContentFallback.themePrimaryColor,
      secondary: contentConfig.themeSecondaryColor || homePageContentFallback.themeSecondaryColor,
      highlight: contentConfig.themeHighlightColor || homePageContentFallback.themeHighlightColor
    }),
    [contentConfig]
  );

  const eventName =
    contentConfig.sponsorshipEventName ||
    homePageContentFallback.sponsorshipEventName ||
    'Corporate Cricket Tournament 2026';

  return (
    <div className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_48%,#ffffff_100%)] pb-20">
      <div
        className="absolute inset-x-0 top-0 h-[420px] opacity-95"
        style={{
          backgroundImage: `radial-gradient(circle at top left, ${pageTheme.highlight}33, transparent 34%), linear-gradient(135deg, ${pageTheme.secondary}, ${pageTheme.primary}, ${pageTheme.highlight})`
        }}
      />
      <div className="absolute left-[-120px] top-[260px] h-72 w-72 rounded-full bg-white/35 blur-3xl" />
      <div className="absolute right-[-80px] top-[160px] h-72 w-72 rounded-full bg-white/25 blur-3xl" />

      <div className="container-shell relative z-10 py-16">
        <section className="overflow-hidden rounded-[2.5rem] border border-white/50 bg-white/92 shadow-soft backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="px-8 py-10 sm:px-10 lg:px-12 lg:py-14">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-orange">
                Sponsorship Details
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
                Sponsor {eventName} with visibility that feels active, local, and memorable.
              </h1>
              <div className="mt-6 max-w-3xl rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
                <p className="text-base leading-8 text-slate-800">
                  TriCore Sports, in partnership with Spark 7 Sports Arena and Sarva Horizon, is proud
                  to present {eventName}. The tournament is built to bring together corporate teams and
                  cricket enthusiasts through teamwork, competition, and community spirit.
                </p>
                <p className="mt-4 text-base leading-8 text-slate-700">
                  Sports events offer a rare environment for brands to connect with players, spectators,
                  and families in a setting that feels more genuine than conventional advertising.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link className="btn-primary" to="/contact">
                  Let&apos;s Partner
                </Link>
                <Link className="btn-secondary" to="/events">
                  View Events
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    Audience
                  </p>
                  <p className="mt-3 text-2xl font-bold text-slate-950">Corporate + Community</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Professionals, cricket lovers, families, and local residents.
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    Value
                  </p>
                  <p className="mt-3 text-2xl font-bold text-slate-950">Trust + Recall</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    On-ground interactions create stronger memory than passive exposure.
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-orange">
                    Fit
                  </p>
                  <p className="mt-3 text-2xl font-bold text-slate-950">Custom Packages</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Structured packages plus custom plans to match campaign goals.
                  </p>
                </div>
              </div>
            </div>

            <div
              className="relative flex flex-col justify-between px-8 py-10 text-white sm:px-10 lg:px-12"
              style={{
                backgroundImage: `linear-gradient(160deg, ${pageTheme.secondary}, ${pageTheme.primary}, ${pageTheme.highlight})`
              }}
            >
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-100">
                  Event Snapshot
                </p>
                <h2 className="mt-4 text-3xl font-bold leading-tight">{eventName}</h2>
                <p className="mt-5 text-sm leading-7 text-blue-50">
                  Designed to bring together corporate teams, cricket enthusiasts, and community-led
                  audiences in one professionally managed sporting environment.
                </p>
              </div>

              <div className="mt-10 space-y-4">
                <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                    Visibility Channels
                  </p>
                  <p className="mt-3 text-xl font-bold">Venue, digital, commentary, and match-day announcements</p>
                </div>
                <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                    Partners
                  </p>
                  <p className="mt-3 text-lg font-bold">Spark 7 Sports Arena • Sarva Horizon</p>
                  <p className="mt-2 text-sm leading-6 text-blue-50">
                    Venue and event partnership support for a sharper sponsor experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <article className="panel p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              About the Event
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-950">
              A professionally managed cricket experience built around teamwork and community.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              {eventName} is structured to bring together corporate teams and cricket enthusiasts in
              a vibrant sporting environment that celebrates teamwork, competition, and community spirit.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              The format creates meaningful sponsor visibility while keeping the atmosphere energetic,
              warm, and participation-led throughout the tournament.
            </p>
          </article>

          <article className="panel p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Why Sponsor With Us?
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-950">
              Connect with people in a dynamic setting where attention feels earned.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Our tournament gives brands a platform for genuine interaction with players, spectators,
              and families. That creates a stronger and more natural brand impression than traditional
              static advertising.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Supporting this event also aligns your brand with positive values like active living,
              community participation, camaraderie, and enthusiasm.
            </p>
          </article>
        </section>

        <section className="mt-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Sponsorship Value
            </p>
            <h2 className="mt-4 text-4xl font-bold text-slate-950">
              Why this tournament works as a brand platform
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Sponsors benefit from visibility, audience relevance, community trust, and a strong
              on-ground presence that feels authentic rather than forced.
            </p>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            {strategicCards.map((card, index) => (
              <article
                className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft ${
                  index % 2 === 0 ? '' : 'xl:translate-y-8'
                }`}
                key={card.eyebrow}
              >
                <div
                  className="h-3"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${pageTheme.primary}, ${pageTheme.highlight})`
                  }}
                />
                <div className="p-8">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                    {card.eyebrow}
                  </p>
                  <h3 className="mt-4 text-2xl font-bold text-slate-950">{card.title}</h3>
                  <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                    {card.points.map((point) => (
                      <li className="flex gap-3" key={point}>
                        <span className="mt-2 h-2.5 w-2.5 rounded-full bg-brand-orange" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                Sponsorship Packages
              </p>
              <h2 className="mt-4 text-4xl font-bold text-slate-950">
                Structured packages with room for custom plans
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                We offer multiple sponsorship packages to suit different brand goals and investment
                levels, and we can also tailor a custom plan around your objectives.
              </p>
            </div>
            <div className="rounded-full bg-white px-5 py-3 shadow-soft">
              <p className="text-sm font-semibold text-slate-700">Customized plans available on request</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            {sponsorshipTiers.map((tier, index) => {
              const useLightHeaderText = tier.headerContrast !== 'dark';

              return (
              <article
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft"
                key={tier.name}
              >
                <div className={`bg-gradient-to-r ${tier.tone} px-7 py-7 text-white`}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p
                        className={`text-sm font-semibold uppercase tracking-[0.2em] ${
                          useLightHeaderText ? 'text-white/80' : 'text-slate-900/70'
                        }`}
                      >
                        Package {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3
                        className={`mt-3 text-3xl font-bold ${
                          useLightHeaderText ? 'text-white' : 'text-slate-950'
                        }`}
                      >
                        {tier.name}
                      </h3>
                    </div>
                    <div
                      className={`rounded-full px-4 py-2 text-sm font-semibold backdrop-blur ${
                        useLightHeaderText
                          ? 'border border-white/25 bg-white/15 text-white'
                          : 'border border-slate-900/10 bg-white/45 text-slate-900 shadow-sm'
                      }`}
                    >
                      {tier.price}
                    </div>
                  </div>
                  <div
                    className={`mt-4 max-w-2xl rounded-2xl px-4 py-3 text-sm leading-7 backdrop-blur-sm ${
                      useLightHeaderText
                        ? 'border border-white/15 bg-white/10 text-white'
                        : 'border border-slate-900/10 bg-white/50 text-slate-900 shadow-sm'
                    }`}
                  >
                    {tier.summary}
                  </div>
                </div>
                <div className="p-7">
                  <ul className="space-y-3 text-sm leading-7 text-slate-600">
                    {tier.benefits.map((benefit) => (
                      <li className="flex gap-3" key={benefit}>
                        <span
                          className="mt-2 h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: pageTheme.primary }}
                        />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
              );
            })}
          </div>
        </section>

        <section className="mt-20 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-soft">
          <div
            className="px-8 py-10 sm:px-10 lg:px-12"
            style={{
              backgroundImage: `linear-gradient(135deg, ${pageTheme.secondary}, ${pageTheme.primary}, ${pageTheme.highlight})`
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-100">
              Let&apos;s Partner
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-bold text-white">
              Partner with {eventName} and meet your audience in an active, high-energy setting.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-blue-50">
              We believe this is a strong opportunity for your brand to connect with an engaged
              audience through sport, community participation, and on-ground presence. Let us know
              which package fits, or we can shape a custom plan around your campaign goals.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                to="/contact"
              >
                Contact TriCore
              </Link>
              <Link
                className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                to="/events"
              >
                Explore Events
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
