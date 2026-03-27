import { useEffect, useMemo, useState } from 'react';

import { getEvents } from '../../api/eventsApi.js';
import {
  getPublicHomeBanners,
  getPublicHomePageContent,
  getPublicSiteConfiguration
} from '../../api/publicSettingsApi.js';
import SeoMetadata from '../../components/common/SeoMetadata.jsx';
import HomeBannerCarousel from '../../components/home/HomeBannerCarousel.jsx';
import HomePageContentSections from '../../components/home/HomePageContentSections.jsx';
import {
  contactContent,
  homeExpertise,
  homeHeroFallbackBanners,
  homePageContentFallback
} from '../../data/siteContent.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import {
  isRegistrationOpenForEvent,
  isUpcomingOrOngoingEvent,
  isVisiblePublicEvent,
  sortPublicUpcomingEvents
} from '../../utils/eventTimeline.js';

const DEFAULT_SEO_TITLE =
  'TriCore Events - Corporate Sports Tournament Management | Cricket Events';
const DEFAULT_SEO_DESCRIPTION =
  'TriCore Events delivers corporate sports tournament management, cricket registrations, schedules, payments, and event discovery for teams and communities.';
const DEFAULT_SEO_KEYWORDS = [
  'corporate sports tournaments',
  'corporate cricket events',
  'cricket tournament management',
  'sports event management',
  'event registrations',
  'tournament schedules',
  'sports payments',
  'TriCore Events'
];

const normalizeBaseUrl = (value) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

const buildAbsoluteUrl = (value, baseUrl) => {
  const normalizedValue = String(value || '').trim();

  if (!normalizedValue) {
    return '';
  }

  try {
    return new URL(normalizedValue, `${normalizeBaseUrl(baseUrl)}/`).toString();
  } catch {
    return '';
  }
};

const buildEventDescription = (event) =>
  String(
    event?.description ||
      `${event?.sportType || 'Sports'} tournament by TriCore Events at ${event?.venue || 'the venue'}`
  ).trim();

const buildHomePageStructuredData = ({ baseUrl, events, imageUrl }) => {
  const organizationId = `${baseUrl}/#organization`;
  const websiteId = `${baseUrl}/#website`;
  const contactPoints = contactContent.partners.flatMap((partner) =>
    (partner.phones || []).map((phone) => ({
      '@type': 'ContactPoint',
      contactType: 'customer support',
      name: partner.name,
      telephone: phone,
      areaServed: 'IN',
      availableLanguage: ['en']
    }))
  );
  const graph = [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: 'TriCore Events',
      url: `${baseUrl}/`,
      logo: buildAbsoluteUrl('/tricore-mark.svg', baseUrl),
      email: contactContent.email,
      description: DEFAULT_SEO_DESCRIPTION,
      areaServed: 'IN',
      contactPoint: contactPoints,
      knowsAbout: [
        'Corporate sports tournament management',
        'Corporate cricket events',
        'Sports registrations',
        'Tournament scheduling',
        'Tournament accounting'
      ]
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: `${baseUrl}/`,
      name: 'TriCore Events',
      description: DEFAULT_SEO_DESCRIPTION,
      publisher: { '@id': organizationId }
    }
  ];

  if (imageUrl) {
    graph[0].image = imageUrl;
    graph[1].image = imageUrl;
  }

  (Array.isArray(events) ? events : []).forEach((event) => {
    const eventUrl = `${baseUrl}/events/${event._id}`;
    const registrationStatus = getPublicEventRegistrationStatus(event);
    const eventImage = buildAbsoluteUrl(event.bannerImage || imageUrl, baseUrl);

    graph.push({
      '@type': 'Event',
      '@id': `${eventUrl}#event`,
      name: event.name,
      description: buildEventDescription(event),
      startDate: new Date(event.startDate).toISOString(),
      endDate: new Date(event.endDate).toISOString(),
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: isUpcomingOrOngoingEvent(event)
        ? 'https://schema.org/EventScheduled'
        : 'https://schema.org/EventCompleted',
      location: {
        '@type': 'Place',
        name: event.venue
      },
      organizer: { '@id': organizationId },
      url: eventUrl,
      image: eventImage ? [eventImage] : undefined,
      offers: {
        '@type': 'Offer',
        url: eventUrl,
        priceCurrency: 'INR',
        price: Number(event.entryFee || 0).toFixed(2),
        availability:
          registrationStatus === 'open'
            ? 'https://schema.org/InStock'
            : registrationStatus === 'coming_soon'
              ? 'https://schema.org/PreOrder'
              : 'https://schema.org/SoldOut'
      }
    });
  });

  return {
    '@context': 'https://schema.org',
    '@graph': graph
  };
};

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [homeBanners, setHomeBanners] = useState([]);
  const [homePageContent, setHomePageContent] = useState(homePageContentFallback);
  const [publicSiteSettings, setPublicSiteSettings] = useState({
    publicBaseUrl: normalizeBaseUrl(contactContent.website || 'https://www.tricoreevents.online')
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadHome = async () => {
      try {
        const [eventsResult, bannersResult, homePageResult, siteSettingsResult] = await Promise.allSettled([
          getEvents(),
          getPublicHomeBanners(),
          getPublicHomePageContent(),
          getPublicSiteConfiguration()
        ]);

        if (eventsResult.status === 'fulfilled') {
          const visibleEvents = Array.isArray(eventsResult.value)
            ? eventsResult.value.filter((event) => isVisiblePublicEvent(event))
            : [];
          const upcomingEvents = sortPublicUpcomingEvents(
            visibleEvents.filter((event) => isUpcomingOrOngoingEvent(event))
          );
          const openRegistrationEvents = upcomingEvents.filter((event) =>
            isRegistrationOpenForEvent(event)
          );

          const featuredEvents = openRegistrationEvents.length
            ? openRegistrationEvents.slice(0, 3)
            : upcomingEvents.length
              ? upcomingEvents.slice(0, 3)
            : [...eventsResult.value]
                .filter((event) => isVisiblePublicEvent(event))
                .sort(
                  (left, right) =>
                    new Date(right.updatedAt || right.createdAt).getTime() -
                    new Date(left.updatedAt || left.createdAt).getTime()
                )
                .slice(0, 3);

          setEvents(featuredEvents);
          setError('');
        } else {
          setError(getApiErrorMessage(eventsResult.reason, 'Unable to load featured events right now.'));
        }

        if (bannersResult.status === 'fulfilled') {
          setHomeBanners(Array.isArray(bannersResult.value) ? bannersResult.value : []);
        } else {
          setHomeBanners([]);
        }

        if (homePageResult.status === 'fulfilled') {
          setHomePageContent(homePageResult.value || homePageContentFallback);
        } else {
          setHomePageContent(homePageContentFallback);
        }

        if (siteSettingsResult.status === 'fulfilled') {
          setPublicSiteSettings(
            siteSettingsResult.value || {
              publicBaseUrl: normalizeBaseUrl(contactContent.website)
            }
          );
        }
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load featured events right now.'));
      } finally {
        setLoading(false);
      }
    };

    loadHome();
  }, []);

  const displayBanners = homeBanners.length ? homeBanners : homeHeroFallbackBanners;
  const homeTheme = {
    primaryColor: homePageContent?.themePrimaryColor || homePageContentFallback.themePrimaryColor,
    secondaryColor: homePageContent?.themeSecondaryColor || homePageContentFallback.themeSecondaryColor,
    highlightColor: homePageContent?.themeHighlightColor || homePageContentFallback.themeHighlightColor
  };
  const siteBaseUrl = useMemo(
    () =>
      normalizeBaseUrl(
        publicSiteSettings?.publicBaseUrl ||
          contactContent.website ||
          (typeof window !== 'undefined' ? window.location.origin : 'https://www.tricoreevents.online')
      ),
    [publicSiteSettings]
  );
  const seoImageUrl = useMemo(() => {
    const candidateImage =
      displayBanners.find((banner) => banner?.imageUrl)?.imageUrl ||
      events.find((event) => event?.bannerImage)?.bannerImage ||
      '/tricore-mark.svg';

    return buildAbsoluteUrl(candidateImage, siteBaseUrl);
  }, [displayBanners, events, siteBaseUrl]);
  const structuredData = useMemo(
    () => buildHomePageStructuredData({ baseUrl: siteBaseUrl, events, imageUrl: seoImageUrl }),
    [events, seoImageUrl, siteBaseUrl]
  );

  return (
    <div className="pb-20">
      <SeoMetadata
        canonicalUrl={`${siteBaseUrl}/`}
        description={DEFAULT_SEO_DESCRIPTION}
        image={seoImageUrl}
        keywords={DEFAULT_SEO_KEYWORDS}
        structuredData={structuredData}
        title={DEFAULT_SEO_TITLE}
        url={`${siteBaseUrl}/`}
      />
      <HomeBannerCarousel banners={displayBanners} expertiseItems={homeExpertise} theme={homeTheme} />
      <HomePageContentSections
        content={homePageContent}
        events={events}
        eventsError={error}
        eventsLoading={loading}
      />
    </div>
  );
}
