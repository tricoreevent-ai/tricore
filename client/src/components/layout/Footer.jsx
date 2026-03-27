import { Link } from 'react-router-dom';

import TriCoreLogo from '../common/TriCoreLogo.jsx';
import { contactContent } from '../../data/siteContent.js';

const quickLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/corporate-events', label: 'Corporate Events' },
  { to: '/events', label: 'Events' },
  { to: '/contact', label: 'Contact' }
];

const getTelephoneHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-shell grid gap-8 py-8 md:grid-cols-[1.1fr_0.9fr_1fr]">
        <div>
          <TriCoreLogo
            className="items-center"
            markClassName="h-12 w-12"
            subtitle="Sports tournaments and corporate event execution"
          />
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
            TriCore Events delivers corporate experiences, sports tournaments, registrations,
            schedules, and event operations with a people-first execution mindset.
          </p>
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
              <p className="font-semibold text-slate-900">Phones</p>
              <div className="mt-1 space-y-1">
                {contactContent.partners.flatMap((partner) =>
                  partner.phones.map((phone) => (
                    <a
                      className="block hover:text-brand-blue"
                      href={getTelephoneHref(phone)}
                      key={`${partner.name}-${phone}`}
                    >
                      {partner.name}: {phone}
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
