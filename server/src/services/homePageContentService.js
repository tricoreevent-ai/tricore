import { randomUUID } from 'node:crypto';

import { AppSetting } from '../models/AppSetting.js';
import { isImageDataUrl, persistImageReference } from './imageStorageService.js';

export const HOME_PAGE_CONTENT_SETTINGS_KEY = 'home-page-content-config';

const normalizeText = (value) => String(value || '').trim();

const defaultSpeaker = (name, role) => ({
  id: randomUUID(),
  name,
  role,
  imageUrl: '',
  imageAlt: name
});

const defaultHighlightImage = (index) => ({
  id: randomUUID(),
  imageUrl: '',
  imageAlt: `Homepage highlight ${index + 1}`
});

const defaultGalleryImage = (filename, imageAlt, caption = '') => ({
  id: randomUUID(),
  imageUrl: `/uploads/gallery/${filename}`,
  imageAlt,
  caption
});

const defaultTestimonial = (name, role, quote) => ({
  id: randomUUID(),
  name,
  role,
  quote,
  imageUrl: '',
  imageAlt: name,
  avatarUrl: '',
  avatarAlt: name
});

const DEFAULT_HOME_PAGE_CONTENT = {
  themePrimaryColor: '#0F5FDB',
  themeSecondaryColor: '#0A2C66',
  themeHighlightColor: '#0EA5E9',
  sponsorshipEventName: 'Corporate Cricket Tournament 2026',
  galleryEnabledHome: false,
  galleryEnabledAbout: false,
  homeGalleryTitle: 'TriCore in Action',
  homeGalleryDescription:
    'Upload event moments, crowd energy, team celebrations, and venue snapshots for the homepage gallery.',
  homeGalleryImages: [
    defaultGalleryImage(
      'sample-cricket-dawn.svg',
      'Cricket stadium under a warm sunrise sky',
      'Sunrise match atmosphere with a tournament-ready wicket and venue lighting.'
    ),
    defaultGalleryImage(
      'sample-training-drill.svg',
      'Athletes running a speed and agility training drill',
      'Warm-up drills and fitness prep that set the tone before competition starts.'
    ),
    defaultGalleryImage(
      'sample-cheer-stand.svg',
      'Crowd cheering beside a brightly lit sports arena',
      'Crowd energy, team chants, and supporter moments from the side lines.'
    ),
    defaultGalleryImage(
      'sample-night-finals.svg',
      'Night finals atmosphere with floodlights and a cricket pitch',
      'Finals-night atmosphere under floodlights with championship focus and pace.'
    )
  ],
  aboutGalleryTitle: 'Inside TriCore',
  aboutGalleryDescription:
    'Build the About page gallery with team moments, crowd stories, venue setup, and event-delivery highlights.',
  aboutGalleryImages: [
    defaultGalleryImage(
      'sample-cricket-dawn.svg',
      'Cricket stadium under a warm sunrise sky',
      'Sunrise match atmosphere with a tournament-ready wicket and venue lighting.'
    ),
    defaultGalleryImage(
      'sample-training-drill.svg',
      'Athletes running a speed and agility training drill',
      'Warm-up drills and fitness prep that set the tone before competition starts.'
    ),
    defaultGalleryImage(
      'sample-cheer-stand.svg',
      'Crowd cheering beside a brightly lit sports arena',
      'Crowd energy, team chants, and supporter moments from the side lines.'
    ),
    defaultGalleryImage(
      'sample-night-finals.svg',
      'Night finals atmosphere with floodlights and a cricket pitch',
      'Finals-night atmosphere under floodlights with championship focus and pace.'
    )
  ],
  introBadge: 'Bring People Together',
  introTitle: 'Sports-led events that build energy, belonging, and connection',
  introDescription:
    'TriCore Events creates tournaments and community-driven experiences that help companies, clubs, apartments, and neighborhoods connect through healthy competition.',
  introActionLabel: 'Explore Our Events',
  introActionHref: '/events',
  introImageUrl: '',
  introImageAlt: 'TriCore event spotlight',
  speakersTitle: 'TriCore Event Leadership',
  speakersDescription:
    'Spotlight the organizers, captains, hosts, or event leaders who shape the TriCore experience.',
  speakers: [
    defaultSpeaker('Darrell Steward', 'Event Strategist'),
    defaultSpeaker('Mariya John', 'Wellness Speaker'),
    defaultSpeaker('John Karter', 'Operations Lead'),
    defaultSpeaker('Reena John', 'Community Host')
  ],
  highlightsTitle: 'TriCore Highlights',
  highlightsDescription:
    'Showcase the energy, participation, and shared moments that make every TriCore event feel alive.',
  stats: [
    { id: randomUUID(), value: '10k+', label: 'Ticket confirmed' },
    { id: randomUUID(), value: '16', label: 'Partners' },
    { id: randomUUID(), value: '150k+', label: 'Participants' }
  ],
  highlightImages: Array.from({ length: 6 }, (_, index) => defaultHighlightImage(index)),
  eventsTitle: 'Upcoming Tournaments',
  eventsDescription:
    'Feature the next published TriCore sports and corporate events that are ready for discovery and registration.',
  testimonialsTitle: 'TriCore Community Stories',
  testimonialsDescription:
    'Share real moments from participants, organizers, and communities who came together through sport.',
  testimonials: [
    defaultTestimonial(
      'Jordhan Daniyel',
      'Corporate Participant',
      'TriCore turned a routine company sports day into something our team still talks about months later.'
    ),
    defaultTestimonial(
      'Mariya Thomas',
      'Community Organizer',
      'The energy, the coordination, and the communication made the whole event feel effortless for our residents.'
    ),
    defaultTestimonial(
      'Lorance Peter',
      'Brand Partner',
      'They brought structure and polish without losing the excitement that makes people want to come back.'
    )
  ],
  ctaBadge: 'Bring people together',
  ctaTitle: 'Plan a TriCore event that people will remember',
  ctaDescription:
    'Use the final section to invite registrations, event enquiries, or new conversations around sport, teamwork, and community.',
  ctaActionLabel: 'Plan with TriCore',
  ctaActionHref: '/contact',
  ctaImageUrl: '',
  ctaImageAlt: 'Call to action visual'
};

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');

const imageOptions = {
  galleryHome: { folder: 'gallery/home', filenamePrefix: 'home-gallery', maxWidth: 1600, quality: 78 },
  galleryAbout: { folder: 'gallery/about', filenamePrefix: 'about-gallery', maxWidth: 1600, quality: 78 },
  intro: { folder: 'home-page', filenamePrefix: 'intro', maxWidth: 1600, quality: 80 },
  speaker: { folder: 'home-speakers', filenamePrefix: 'speaker', maxWidth: 960, quality: 80 },
  highlight: { folder: 'home-highlights', filenamePrefix: 'highlight', maxWidth: 1440, quality: 78 },
  testimonial: { folder: 'home-testimonials', filenamePrefix: 'testimonial', maxWidth: 1200, quality: 80 },
  avatar: { folder: 'home-avatars', filenamePrefix: 'avatar', maxWidth: 640, quality: 82 },
  cta: { folder: 'home-page', filenamePrefix: 'cta', maxWidth: 1600, quality: 80 }
};

const normalizeSpeaker = (speaker = {}, index = 0) => ({
  id: normalizeText(speaker.id) || randomUUID(),
  name: normalizeText(speaker.name) || `Speaker ${index + 1}`,
  role: normalizeText(speaker.role),
  imageUrl: normalizeText(speaker.imageUrl),
  imageAlt: normalizeText(speaker.imageAlt) || normalizeText(speaker.name) || `Speaker ${index + 1}`
});

const normalizeStat = (stat = {}, index = 0) => ({
  id: normalizeText(stat.id) || randomUUID(),
  value: normalizeText(stat.value) || `${index + 1}`,
  label: normalizeText(stat.label) || `Stat ${index + 1}`
});

const normalizeHighlightImage = (image = {}, index = 0) => ({
  id: normalizeText(image.id) || randomUUID(),
  imageUrl: normalizeText(image.imageUrl),
  imageAlt: normalizeText(image.imageAlt) || `Homepage highlight ${index + 1}`
});

const normalizeGalleryImage = (image = {}, index = 0) => ({
  id: normalizeText(image.id) || randomUUID(),
  imageUrl: normalizeText(image.imageUrl),
  imageAlt: normalizeText(image.imageAlt) || `TriCore gallery image ${index + 1}`,
  caption: normalizeText(image.caption)
});

const normalizeTestimonial = (testimonial = {}, index = 0) => ({
  id: normalizeText(testimonial.id) || randomUUID(),
  name: normalizeText(testimonial.name) || `Attendee ${index + 1}`,
  role: normalizeText(testimonial.role),
  quote: normalizeText(testimonial.quote),
  imageUrl: normalizeText(testimonial.imageUrl),
  imageAlt: normalizeText(testimonial.imageAlt) || normalizeText(testimonial.name) || `Attendee ${index + 1}`,
  avatarUrl: normalizeText(testimonial.avatarUrl),
  avatarAlt: normalizeText(testimonial.avatarAlt) || normalizeText(testimonial.name) || `Attendee ${index + 1}`
});

const migrateHomePageContentImages = async (settingDocument) => {
  if (!settingDocument) {
    return null;
  }

  const stored = settingDocument.value || {};
  let hasChanges = false;
  const migrateImageValue = async (value, options) => {
    if (!isImageDataUrl(value)) {
      return normalizeText(value);
    }

    hasChanges = true;
    return persistImageReference(value, options);
  };

  const nextValue = {
    ...stored,
    galleryImages: Array.isArray(stored.galleryImages)
      ? await Promise.all(
          stored.galleryImages.map(async (image, index) =>
            normalizeGalleryImage(
              {
                ...image,
                imageUrl: await migrateImageValue(image.imageUrl, imageOptions.galleryHome)
              },
              index
            )
          )
        )
      : stored.galleryImages,
    homeGalleryImages: Array.isArray(stored.homeGalleryImages)
      ? await Promise.all(
          stored.homeGalleryImages.map(async (image, index) =>
            normalizeGalleryImage(
              {
                ...image,
                imageUrl: await migrateImageValue(image.imageUrl, imageOptions.galleryHome)
              },
              index
            )
          )
        )
      : stored.homeGalleryImages,
    aboutGalleryImages: Array.isArray(stored.aboutGalleryImages)
      ? await Promise.all(
          stored.aboutGalleryImages.map(async (image, index) =>
            normalizeGalleryImage(
              {
                ...image,
                imageUrl: await migrateImageValue(image.imageUrl, imageOptions.galleryAbout)
              },
              index
            )
          )
        )
      : stored.aboutGalleryImages,
    introImageUrl: await migrateImageValue(stored.introImageUrl, imageOptions.intro),
    speakers: Array.isArray(stored.speakers)
      ? await Promise.all(
          stored.speakers.map(async (speaker, index) =>
            normalizeSpeaker(
              {
                ...speaker,
                imageUrl: await migrateImageValue(speaker.imageUrl, imageOptions.speaker)
              },
              index
            )
          )
        )
      : stored.speakers,
    highlightImages: Array.isArray(stored.highlightImages)
      ? await Promise.all(
          stored.highlightImages.map(async (image, index) =>
            normalizeHighlightImage(
              {
                ...image,
                imageUrl: await migrateImageValue(image.imageUrl, imageOptions.highlight)
              },
              index
            )
          )
        )
      : stored.highlightImages,
    testimonials: Array.isArray(stored.testimonials)
      ? await Promise.all(
          stored.testimonials.map(async (testimonial, index) =>
            normalizeTestimonial(
              {
                ...testimonial,
                imageUrl: await migrateImageValue(testimonial.imageUrl, imageOptions.testimonial),
                avatarUrl: await migrateImageValue(testimonial.avatarUrl, imageOptions.avatar)
              },
              index
            )
          )
        )
      : stored.testimonials,
    ctaImageUrl: await migrateImageValue(stored.ctaImageUrl, imageOptions.cta)
  };

  if (!hasChanges) {
    return settingDocument;
  }

  settingDocument.value = nextValue;
  settingDocument.markModified('value');
  await settingDocument.save();

  return populateUpdatedBy(AppSetting.findById(settingDocument._id));
};

const serializeHomePageContent = (settingDocument) => {
  const stored = settingDocument?.value || {};
  const speakersSource = Array.isArray(stored.speakers)
    ? stored.speakers
    : DEFAULT_HOME_PAGE_CONTENT.speakers;
  const statsSource = Array.isArray(stored.stats) ? stored.stats : DEFAULT_HOME_PAGE_CONTENT.stats;
  const highlightsSource = Array.isArray(stored.highlightImages)
    ? stored.highlightImages
    : DEFAULT_HOME_PAGE_CONTENT.highlightImages;
  const testimonialsSource = Array.isArray(stored.testimonials)
    ? stored.testimonials
    : DEFAULT_HOME_PAGE_CONTENT.testimonials;
  const legacyGallerySource = Array.isArray(stored.galleryImages)
    ? stored.galleryImages
    : DEFAULT_HOME_PAGE_CONTENT.homeGalleryImages;
  const homeGallerySource = Array.isArray(stored.homeGalleryImages)
    ? stored.homeGalleryImages
    : legacyGallerySource;
  const aboutGallerySource = Array.isArray(stored.aboutGalleryImages)
    ? stored.aboutGalleryImages
    : legacyGallerySource;

  return {
    themePrimaryColor: normalizeText(stored.themePrimaryColor || DEFAULT_HOME_PAGE_CONTENT.themePrimaryColor),
    themeSecondaryColor: normalizeText(
      stored.themeSecondaryColor || DEFAULT_HOME_PAGE_CONTENT.themeSecondaryColor
    ),
    themeHighlightColor: normalizeText(
      stored.themeHighlightColor || DEFAULT_HOME_PAGE_CONTENT.themeHighlightColor
    ),
    sponsorshipEventName: normalizeText(
      stored.sponsorshipEventName || DEFAULT_HOME_PAGE_CONTENT.sponsorshipEventName
    ),
    galleryEnabledHome:
      stored.galleryEnabledHome !== undefined
        ? Boolean(stored.galleryEnabledHome)
        : Boolean(DEFAULT_HOME_PAGE_CONTENT.galleryEnabledHome),
    galleryEnabledAbout:
      stored.galleryEnabledAbout !== undefined
        ? Boolean(stored.galleryEnabledAbout)
        : Boolean(DEFAULT_HOME_PAGE_CONTENT.galleryEnabledAbout),
    homeGalleryTitle: normalizeText(
      stored.homeGalleryTitle ||
        stored.galleryTitle ||
        DEFAULT_HOME_PAGE_CONTENT.homeGalleryTitle
    ),
    homeGalleryDescription: normalizeText(
      stored.homeGalleryDescription ||
        stored.galleryDescription ||
        DEFAULT_HOME_PAGE_CONTENT.homeGalleryDescription
    ),
    homeGalleryImages: homeGallerySource.map((image, index) => normalizeGalleryImage(image, index)),
    aboutGalleryTitle: normalizeText(
      stored.aboutGalleryTitle ||
        stored.galleryTitle ||
        DEFAULT_HOME_PAGE_CONTENT.aboutGalleryTitle
    ),
    aboutGalleryDescription: normalizeText(
      stored.aboutGalleryDescription ||
        stored.galleryDescription ||
        DEFAULT_HOME_PAGE_CONTENT.aboutGalleryDescription
    ),
    aboutGalleryImages: aboutGallerySource.map((image, index) => normalizeGalleryImage(image, index)),
    introBadge: normalizeText(stored.introBadge || DEFAULT_HOME_PAGE_CONTENT.introBadge),
    introTitle: normalizeText(stored.introTitle || DEFAULT_HOME_PAGE_CONTENT.introTitle),
    introDescription: normalizeText(stored.introDescription || DEFAULT_HOME_PAGE_CONTENT.introDescription),
    introActionLabel: normalizeText(stored.introActionLabel || DEFAULT_HOME_PAGE_CONTENT.introActionLabel),
    introActionHref: normalizeText(stored.introActionHref || DEFAULT_HOME_PAGE_CONTENT.introActionHref),
    introImageUrl: normalizeText(stored.introImageUrl),
    introImageAlt: normalizeText(stored.introImageAlt || DEFAULT_HOME_PAGE_CONTENT.introImageAlt),
    speakersTitle: normalizeText(stored.speakersTitle || DEFAULT_HOME_PAGE_CONTENT.speakersTitle),
    speakersDescription: normalizeText(
      stored.speakersDescription || DEFAULT_HOME_PAGE_CONTENT.speakersDescription
    ),
    speakers: speakersSource.map((speaker, index) => normalizeSpeaker(speaker, index)),
    highlightsTitle: normalizeText(stored.highlightsTitle || DEFAULT_HOME_PAGE_CONTENT.highlightsTitle),
    highlightsDescription: normalizeText(
      stored.highlightsDescription || DEFAULT_HOME_PAGE_CONTENT.highlightsDescription
    ),
    stats: statsSource.map((stat, index) => normalizeStat(stat, index)),
    highlightImages: highlightsSource.map((image, index) => normalizeHighlightImage(image, index)),
    eventsTitle: normalizeText(stored.eventsTitle || DEFAULT_HOME_PAGE_CONTENT.eventsTitle),
    eventsDescription: normalizeText(stored.eventsDescription || DEFAULT_HOME_PAGE_CONTENT.eventsDescription),
    testimonialsTitle: normalizeText(
      stored.testimonialsTitle || DEFAULT_HOME_PAGE_CONTENT.testimonialsTitle
    ),
    testimonialsDescription: normalizeText(
      stored.testimonialsDescription || DEFAULT_HOME_PAGE_CONTENT.testimonialsDescription
    ),
    testimonials: testimonialsSource.map((testimonial, index) => normalizeTestimonial(testimonial, index)),
    ctaBadge: normalizeText(stored.ctaBadge || DEFAULT_HOME_PAGE_CONTENT.ctaBadge),
    ctaTitle: normalizeText(stored.ctaTitle || DEFAULT_HOME_PAGE_CONTENT.ctaTitle),
    ctaDescription: normalizeText(stored.ctaDescription || DEFAULT_HOME_PAGE_CONTENT.ctaDescription),
    ctaActionLabel: normalizeText(stored.ctaActionLabel || DEFAULT_HOME_PAGE_CONTENT.ctaActionLabel),
    ctaActionHref: normalizeText(stored.ctaActionHref || DEFAULT_HOME_PAGE_CONTENT.ctaActionHref),
    ctaImageUrl: normalizeText(stored.ctaImageUrl),
    ctaImageAlt: normalizeText(stored.ctaImageAlt || DEFAULT_HOME_PAGE_CONTENT.ctaImageAlt),
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesEnvDefaults: !settingDocument
  };
};

export const getHomePageContentSettingDocument = async () =>
  migrateHomePageContentImages(
    await populateUpdatedBy(AppSetting.findOne({ key: HOME_PAGE_CONTENT_SETTINGS_KEY }))
  );

export const getHomePageContent = async () =>
  serializeHomePageContent(await getHomePageContentSettingDocument());

export const getPublicHomePageContent = async () => {
  const content = await getHomePageContent();

  return {
    ...content,
    updatedAt: undefined,
    updatedBy: undefined,
    usesEnvDefaults: undefined
  };
};

export const updateHomePageContent = async ({ payload, userId }) => {
  const nextValue = {
    themePrimaryColor: normalizeText(payload.themePrimaryColor),
    themeSecondaryColor: normalizeText(payload.themeSecondaryColor),
    themeHighlightColor: normalizeText(payload.themeHighlightColor),
    sponsorshipEventName: normalizeText(payload.sponsorshipEventName),
    galleryEnabledHome: Boolean(payload.galleryEnabledHome),
    galleryEnabledAbout: Boolean(payload.galleryEnabledAbout),
    homeGalleryTitle: normalizeText(payload.homeGalleryTitle),
    homeGalleryDescription: normalizeText(payload.homeGalleryDescription),
    homeGalleryImages: Array.isArray(payload.homeGalleryImages)
      ? await Promise.all(
          payload.homeGalleryImages.map(async (image, index) =>
            normalizeGalleryImage(
              {
                ...image,
                imageUrl: await persistImageReference(image.imageUrl, imageOptions.galleryHome)
              },
              index
            )
          )
        )
      : [],
    aboutGalleryTitle: normalizeText(payload.aboutGalleryTitle),
    aboutGalleryDescription: normalizeText(payload.aboutGalleryDescription),
    aboutGalleryImages: Array.isArray(payload.aboutGalleryImages)
      ? await Promise.all(
          payload.aboutGalleryImages.map(async (image, index) =>
            normalizeGalleryImage(
              {
                ...image,
                imageUrl: await persistImageReference(image.imageUrl, imageOptions.galleryAbout)
              },
              index
            )
          )
        )
      : [],
    introBadge: normalizeText(payload.introBadge),
    introTitle: normalizeText(payload.introTitle),
    introDescription: normalizeText(payload.introDescription),
    introActionLabel: normalizeText(payload.introActionLabel),
    introActionHref: normalizeText(payload.introActionHref),
    introImageUrl: await persistImageReference(payload.introImageUrl, imageOptions.intro),
    introImageAlt: normalizeText(payload.introImageAlt),
    speakersTitle: normalizeText(payload.speakersTitle),
    speakersDescription: normalizeText(payload.speakersDescription),
    speakers: Array.isArray(payload.speakers)
      ? await Promise.all(
          payload.speakers.map(async (speaker, index) =>
            normalizeSpeaker(
              {
                ...speaker,
                imageUrl: await persistImageReference(speaker.imageUrl, imageOptions.speaker)
              },
              index
            )
          )
        )
      : [],
    highlightsTitle: normalizeText(payload.highlightsTitle),
    highlightsDescription: normalizeText(payload.highlightsDescription),
    stats: Array.isArray(payload.stats) ? payload.stats.map((stat, index) => normalizeStat(stat, index)) : [],
    highlightImages: Array.isArray(payload.highlightImages)
      ? await Promise.all(
          payload.highlightImages.map(async (image, index) =>
            normalizeHighlightImage(
              {
                ...image,
                imageUrl: await persistImageReference(image.imageUrl, imageOptions.highlight)
              },
              index
            )
          )
        )
      : [],
    eventsTitle: normalizeText(payload.eventsTitle),
    eventsDescription: normalizeText(payload.eventsDescription),
    testimonialsTitle: normalizeText(payload.testimonialsTitle),
    testimonialsDescription: normalizeText(payload.testimonialsDescription),
    testimonials: Array.isArray(payload.testimonials)
      ? await Promise.all(
          payload.testimonials.map(async (testimonial, index) =>
            normalizeTestimonial(
              {
                ...testimonial,
                imageUrl: await persistImageReference(testimonial.imageUrl, imageOptions.testimonial),
                avatarUrl: await persistImageReference(testimonial.avatarUrl, imageOptions.avatar)
              },
              index
            )
          )
        )
      : [],
    ctaBadge: normalizeText(payload.ctaBadge),
    ctaTitle: normalizeText(payload.ctaTitle),
    ctaDescription: normalizeText(payload.ctaDescription),
    ctaActionLabel: normalizeText(payload.ctaActionLabel),
    ctaActionHref: normalizeText(payload.ctaActionHref),
    ctaImageUrl: await persistImageReference(payload.ctaImageUrl, imageOptions.cta),
    ctaImageAlt: normalizeText(payload.ctaImageAlt)
  };

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: HOME_PAGE_CONTENT_SETTINGS_KEY },
      {
        key: HOME_PAGE_CONTENT_SETTINGS_KEY,
        value: nextValue,
        updatedBy: userId
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    )
  );

  return serializeHomePageContent(updated);
};
