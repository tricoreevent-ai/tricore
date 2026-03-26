import { useEffect, useState } from 'react';

import { getEvents } from '../../api/eventsApi.js';
import {
  getPublicHomeBanners,
  getPublicHomePageContent
} from '../../api/publicSettingsApi.js';
import HomeBannerCarousel from '../../components/home/HomeBannerCarousel.jsx';
import HomePageContentSections from '../../components/home/HomePageContentSections.jsx';
import {
  homeExpertise,
  homeHeroFallbackBanners,
  homePageContentFallback
} from '../../data/siteContent.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { isUpcomingOrOngoingEvent, sortEventsByStartDate } from '../../utils/eventTimeline.js';

export default function HomePage() {
  const [events, setEvents] = useState([]);
  const [homeBanners, setHomeBanners] = useState([]);
  const [homePageContent, setHomePageContent] = useState(homePageContentFallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadHome = async () => {
      try {
        const [eventsResult, bannersResult, homePageResult] = await Promise.allSettled([
          getEvents(),
          getPublicHomeBanners(),
          getPublicHomePageContent()
        ]);

        if (eventsResult.status === 'fulfilled') {
          const upcomingEvents = sortEventsByStartDate(eventsResult.value)
            .filter((event) => isUpcomingOrOngoingEvent(event))
            .slice(0, 3);

          const featuredEvents = upcomingEvents.length
            ? upcomingEvents
            : [...eventsResult.value]
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

  return (
    <div className="pb-20">
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
