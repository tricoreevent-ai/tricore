import { Link } from 'react-router-dom';

import AppIcon from '../../components/common/AppIcon.jsx';
import SeoMetadata from '../../components/common/SeoMetadata.jsx';
import { contactContent, corporateEventsContent } from '../../data/siteContent.js';

const DEFAULT_SEO_TITLE = 'Corporate Events & Experiences | TriCore Events';
const DEFAULT_SEO_DESCRIPTION =
  'TriCore Events plans meetings, conferences, team-building programs, strategic offsites, AGMs, employee engagement events, and product launches with end-to-end execution.';
const DEFAULT_SEO_KEYWORDS = [
  'corporate event management',
  'corporate conferences',
  'team building programs',
  'strategic offsites',
  'employee engagement events',
  'product launches',
  'brand activations',
  'TriCore Events'
];

const normalizeBaseUrl = (value) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

const getTelephoneHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;

const buildStructuredData = ({ baseUrl, phone }) => [
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Corporate Events & Experiences',
    description: DEFAULT_SEO_DESCRIPTION,
    areaServed: 'IN',
    url: `${baseUrl}/corporate-events`,
    provider: {
      '@type': 'Organization',
      name: 'TriCore Events',
      url: `${baseUrl}/`,
      email: contactContent.email,
      telephone: phone || undefined
    }
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${baseUrl}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Corporate Events',
        item: `${baseUrl}/corporate-events`
      }
    ]
  }
];

export default function CorporateEventsPage() {
  const baseUrl = normalizeBaseUrl(
    contactContent.website ||
      (typeof window !== 'undefined' ? window.location.origin : 'https://www.tricoreevents.online')
  );
  const canonicalUrl = `${baseUrl}/corporate-events`;
  const primaryPhone = contactContent.partners.flatMap((partner) => partner.phones || [])[0] || '';
  const quickContactHref = primaryPhone ? getTelephoneHref(primaryPhone) : '/contact';
  const heroGradient = {
    backgroundImage: 'linear-gradient(135deg, #0A2C66, #0F5FDB, #0EA5E9)'
  };
  const processGradient = {
    backgroundImage: 'linear-gradient(135deg, #08204C, #0F5FDB, #F97316)'
  };

  return (
    <div className="pb-20">
      <SeoMetadata
        canonicalUrl={canonicalUrl}
        description={DEFAULT_SEO_DESCRIPTION}
        keywords={DEFAULT_SEO_KEYWORDS}
        structuredData={buildStructuredData({ baseUrl, phone: primaryPhone })}
        title={DEFAULT_SEO_TITLE}
        url={canonicalUrl}
      />

      <section className="container-shell py-16">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              {corporateEventsContent.heroBadge}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold text-slate-950 sm:text-5xl">
              {corporateEventsContent.heroTitle}
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
              {corporateEventsContent.heroDescription}
            </p>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
              {corporateEventsContent.heroSupportingCopy}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link className="btn-primary" to={corporateEventsContent.primaryActionHref}>
                {corporateEventsContent.primaryActionLabel}
              </Link>
              {quickContactHref.startsWith('tel:') ? (
                <a className="btn-secondary" href={quickContactHref}>
                  Call TriCore
                </a>
              ) : (
                <Link className="btn-secondary" to={corporateEventsContent.secondaryActionHref}>
                  {corporateEventsContent.secondaryActionLabel}
                </Link>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] text-white shadow-soft" style={heroGradient}>
            <div className="p-8 sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
                What we handle
              </p>
              <h2 className="mt-4 text-3xl font-bold text-white">
                Corporate formats designed around clarity, polish, and measurable impact
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {corporateEventsContent.focusAreas.map((item) => (
                  <div
                    className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm"
                    key={item}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                        <AppIcon className="h-4 w-4" name="check" />
                      </span>
                      <p className="text-sm leading-7 text-blue-50">{item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="panel p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              {corporateEventsContent.introTitle}
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-950">
              Strategic event planning with practical execution discipline
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              {corporateEventsContent.introDescription}
            </p>
            <p className="mt-5 text-base leading-8 text-slate-600">
              {corporateEventsContent.introSupportingCopy}
            </p>
          </div>

          <div className="panel p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Why corporate teams call us
            </p>
            <div className="mt-6 space-y-4">
              {[
                'Your event reflects your brand, so we protect the details that shape perception.',
                'Your internal team stays focused on people, messaging, and decisions while we manage execution.',
                'Your attendees experience a professional flow built around comfort, clarity, and confidence.'
              ].map((item) => (
                <div className="rounded-3xl bg-slate-50 p-5" key={item}>
                  <p className="text-sm leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell mt-24">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            {corporateEventsContent.servicesTitle}
          </p>
          <h2 className="mt-3 text-4xl font-bold text-slate-950">
            A full corporate event suite built around your objectives
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600">
            {corporateEventsContent.servicesDescription}
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {corporateEventsContent.services.map((service) => (
            <article className="panel h-full p-7" key={service.title}>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-mist text-brand-blue">
                <AppIcon className="h-5 w-5" name={service.icon} />
              </span>
              <h3 className="mt-5 text-2xl font-bold text-slate-950">{service.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{service.description}</p>
              <div className="mt-6 space-y-3">
                {service.points.map((point) => (
                  <div className="rounded-3xl bg-slate-50 p-4" key={point}>
                    <p className="text-sm leading-7 text-slate-700">{point}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container-shell mt-24">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="panel p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              {corporateEventsContent.credibilityTitle}
            </p>
            <h2 className="mt-4 text-3xl font-bold text-slate-950">
              Real-world event experience, built for high-expectation environments
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-700">
              {corporateEventsContent.credibilityDescription}
            </p>
            <p className="mt-5 text-base leading-8 text-slate-600">
              {corporateEventsContent.credibilitySupportingCopy}
            </p>
          </div>

          <div className="panel p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              {corporateEventsContent.whyChooseTitle}
            </p>
            <div className="mt-6 grid gap-4">
              {corporateEventsContent.whyChooseItems.map((item) => (
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5" key={item}>
                  <div className="flex items-start gap-4">
                    <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-mist text-sm font-bold text-brand-blue">
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
        <div className="overflow-hidden rounded-[2rem] text-white shadow-soft" style={processGradient}>
          <div className="p-8 sm:p-10">
            <div className="max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-100">
                {corporateEventsContent.processTitle}
              </p>
              <h2 className="mt-4 text-4xl font-bold text-white">
                A collaborative process designed to feel clear and stress-free
              </h2>
              <p className="mt-5 text-base leading-8 text-blue-50">
                {corporateEventsContent.processDescription}
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {corporateEventsContent.process.map((step, index) => (
                <div
                  className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm"
                  key={step.title}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                      Step {index + 1}
                    </p>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white">
                      <AppIcon className="h-4 w-4" name={step.icon} />
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-blue-50">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell mt-24">
        <div className="panel p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Let's talk
          </p>
          <h2 className="mt-4 text-4xl font-bold text-slate-950">
            {corporateEventsContent.ctaTitle}
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            {corporateEventsContent.ctaDescription}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link className="btn-primary" to={corporateEventsContent.primaryActionHref}>
              {corporateEventsContent.primaryActionLabel}
            </Link>
            {quickContactHref.startsWith('tel:') ? (
              <a className="btn-secondary" href={quickContactHref}>
                Contact Us Today
              </a>
            ) : (
              <Link className="btn-secondary" to={corporateEventsContent.secondaryActionHref}>
                {corporateEventsContent.secondaryActionLabel}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
