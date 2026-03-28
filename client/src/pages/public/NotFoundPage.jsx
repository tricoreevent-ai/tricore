import { Link } from 'react-router-dom';

import SeoMetadata from '../../components/common/SeoMetadata.jsx';
import { contactContent } from '../../data/siteContent.js';
import { getWhatsAppHref } from '../../utils/contactLinks.js';

const normalizeBaseUrl = (value) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

export default function NotFoundPage() {
  const baseUrl = normalizeBaseUrl(
    contactContent.website ||
      (typeof window !== 'undefined' ? window.location.origin : 'https://www.tricoreevents.online')
  );
  const whatsAppHref = getWhatsAppHref(contactContent.whatsAppPhone, contactContent.whatsAppMessage);

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-16 sm:px-6">
      <SeoMetadata
        canonicalUrl={`${baseUrl}/404`}
        description="The requested TriCore page could not be found. Explore events, corporate services, or contact the team for help."
        robots="noindex,nofollow"
        title="Page Not Found | TriCore Events"
      />
      <div className="container-shell">
        <div className="panel mx-auto max-w-5xl p-8 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                404
              </p>
              <h1 className="mt-4 text-4xl font-bold text-slate-950 sm:text-5xl">
                This page isn&apos;t available, but the next step is easy.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                The link may be outdated or the page may have moved. You can head back to the
                homepage, browse current events, review corporate services, or contact TriCore for
                help finding the right page.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link className="btn-primary" to="/">
                  Return Home
                </Link>
                <Link className="btn-secondary" to="/events">
                  View Events
                </Link>
                {whatsAppHref ? (
                  <a className="btn-whatsapp" href={whatsAppHref} rel="noreferrer" target="_blank">
                    Chat on WhatsApp
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-[2rem] bg-slate-50 p-6 sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                Helpful links
              </p>
              <div className="mt-5 grid gap-3">
                <Link
                  className="rounded-2xl bg-white px-4 py-4 text-base font-semibold text-slate-900 shadow-soft transition hover:text-brand-blue"
                  to="/corporate-events"
                >
                  Corporate Events
                </Link>
                <Link
                  className="rounded-2xl bg-white px-4 py-4 text-base font-semibold text-slate-900 shadow-soft transition hover:text-brand-blue"
                  to="/about"
                >
                  About TriCore
                </Link>
                <Link
                  className="rounded-2xl bg-white px-4 py-4 text-base font-semibold text-slate-900 shadow-soft transition hover:text-brand-blue"
                  to="/contact"
                >
                  Contact the Team
                </Link>
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-500">
                Need help quickly? Email{' '}
                <a className="font-semibold text-brand-blue" href={`mailto:${contactContent.email}`}>
                  {contactContent.email}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
