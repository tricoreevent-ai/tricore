import { Link } from 'react-router-dom';

import AppIcon from '../common/AppIcon.jsx';
import TriCoreLogo from '../common/TriCoreLogo.jsx';
import { contactContent } from '../../data/siteContent.js';
import { getTelephoneHref, getWhatsAppHref } from '../../utils/contactLinks.js';

const quickLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/corporate-events', label: 'Corporate Events' },
  { to: '/events', label: 'Events' },
  { to: '/contact', label: 'Contact' }
];

export default function Footer() {
  const primaryPhone =
    contactContent.whatsAppPhone ||
    contactContent.partners.flatMap((partner) => partner.phones || [])[0] ||
    '';
  const whatsAppHref = getWhatsAppHref(primaryPhone, contactContent.whatsAppMessage);

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-shell grid gap-8 py-8 md:grid-cols-[1.1fr_0.9fr_1fr]">
        <div>
          <TriCoreLogo
            className="items-center"
            markClassName="h-12 w-12"
            subtitle="Event Management & Experiences"
          />
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
            TriCore Events delivers corporate experiences, sports tournaments, registrations, and
            event operations with partner-led execution and a people-first mindset.
          </p>
          <p className="mt-3 max-w-md text-sm leading-7 text-slate-500">
            Backed by partners with 20+ years of collective experience in sports and corporate
            event delivery.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link className="btn-secondary" to="/contact">
              Request a Quote
            </Link>
            {whatsAppHref ? (
              <a className="btn-whatsapp" href={whatsAppHref} rel="noreferrer" target="_blank">
                <AppIcon className="h-4 w-4" name="whatsapp" />
                Chat on WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-orange">
            Explore
          </p>
          <div className="mt-4 grid gap-3">
            {quickLinks.map((link) => (
              <Link
                className="text-sm font-medium text-slate-600 transition hover:text-brand-blue"
                key={link.to}
                to={link.to}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-orange">
            Contact
          </p>
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-900">Email</p>
              <a className="mt-1 block hover:text-brand-blue" href={`mailto:${contactContent.email}`}>
                {contactContent.email}
              </a>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Website</p>
              <a
                className="mt-1 block break-all hover:text-brand-blue"
                href={contactContent.website}
                rel="noreferrer"
                target="_blank"
              >
                {contactContent.website}
              </a>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Leadership Contacts</p>
              <div className="mt-2 space-y-3">
                {contactContent.partners.map((partner) => (
                  <div key={partner.name}>
                    <p className="font-semibold text-slate-900">{partner.name}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {partner.phones.map((phone) => (
                        <a
                          className="rounded-full bg-slate-50 px-3 py-1.5 text-sm transition hover:bg-brand-mist hover:text-brand-blue"
                          href={getTelephoneHref(phone)}
                          key={`${partner.name}-${phone}`}
                        >
                          {phone}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {whatsAppHref ? (
              <a
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#1f9d52] transition hover:text-[#16803f]"
                href={whatsAppHref}
                rel="noreferrer"
                target="_blank"
              >
                <AppIcon className="h-4 w-4" name="whatsapp" />
                WhatsApp us for quick event inquiries
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
