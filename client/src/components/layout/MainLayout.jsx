import { Outlet, useLocation } from 'react-router-dom';

import SeoMetadata from '../common/SeoMetadata.jsx';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';
import { contactContent } from '../../data/siteContent.js';

const normalizeBaseUrl = (value) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

const HOME_SEO = {
  title: 'TriCore Events - Corporate Sports Tournament Management | Cricket Events',
  description:
    'TriCore Events delivers corporate sports tournament management, cricket registrations, schedules, payments, and event discovery for teams and communities.'
};

export default function MainLayout() {
  const location = useLocation();
  const pathname = location.pathname || '/';
  const baseUrl = normalizeBaseUrl(
    contactContent.website ||
      (typeof window !== 'undefined' ? window.location.origin : 'https://www.tricoreevents.online')
  );
  const canonicalUrl = pathname === '/' ? `${baseUrl}/` : `${baseUrl}${pathname}`;
  const pageSeo = (() => {
    if (pathname === '/') {
      return HOME_SEO;
    }

    if (pathname === '/about') {
      return {
        title: 'About TriCore Events | Corporate Sports and Cricket Event Experience',
        description:
          'Learn how TriCore Events delivers disciplined sports tournaments, corporate cricket experiences, and community events with a people-first operations team.'
      };
    }

    if (pathname === '/events') {
      return {
        title: 'Upcoming Sports and Cricket Events | TriCore Events',
        description:
          'Browse upcoming TriCore sports tournaments, cricket events, registration windows, venues, entry fees, and schedules across corporate and community competitions.'
      };
    }

    if (pathname.startsWith('/events/') && pathname.endsWith('/payment')) {
      return {
        title: 'Event Payment | TriCore Events',
        description: 'Secure payment and proof upload for TriCore event registrations.',
        robots: 'noindex,nofollow'
      };
    }

    if (pathname.startsWith('/events/')) {
      return {
        title: 'Event Details | TriCore Events',
        description:
          'View TriCore event details, registration deadlines, venue information, payment instructions, and participation guidance for the selected tournament.'
      };
    }

    if (pathname === '/contact') {
      return {
        title: 'Contact TriCore Events | Corporate Sports Tournament Planning',
        description:
          'Contact TriCore Events for corporate sports tournaments, cricket event planning, registrations, sponsorship enquiries, and community competition support.'
      };
    }

    if (pathname === '/partner-access') {
      return {
        title: 'Sports Event Sponsorships | TriCore Events',
        description:
          'Explore sponsorship opportunities with TriCore Events and connect your brand with corporate sports tournaments, cricket audiences, and community participation.'
      };
    }

    if (pathname === '/dashboard') {
      return {
        title: 'User Dashboard | TriCore Events',
        description: 'Registered user dashboard for TriCore Events.',
        robots: 'noindex,nofollow'
      };
    }

    return {
      title: 'TriCore Events',
      description: 'Corporate sports tournament management, registrations, schedules, and event operations.'
    };
  })();

  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50">
      <SeoMetadata
        canonicalUrl={canonicalUrl}
        description={pageSeo.description}
        robots={pageSeo.robots}
        title={pageSeo.title}
        url={canonicalUrl}
      />
      <Navbar />
      <main className="min-w-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
