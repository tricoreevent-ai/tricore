import { Event } from '../models/Event.js';
import { getDbStatus } from '../config/db.js';
import { getPublicSiteSettings } from './publicSiteSettingsService.js';

const DEFAULT_PUBLIC_BASE_URL = 'https://www.tricoreevents.online';
const STATIC_PUBLIC_PATHS = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/events', changefreq: 'daily', priority: '0.9' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/partner-access', changefreq: 'monthly', priority: '0.6' }
];

const normalizeBaseUrl = (value) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

const xmlEscape = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const buildAbsoluteUrl = (baseUrl, path) =>
  path === '/' ? `${baseUrl}/` : `${baseUrl}${path}`;

const resolvePublicBaseUrl = async () => {
  if (getDbStatus().readyState !== 1) {
    return DEFAULT_PUBLIC_BASE_URL;
  }

  try {
    const settings = await getPublicSiteSettings();
    const configuredBaseUrl = normalizeBaseUrl(settings.publicBaseUrl);

    if (configuredBaseUrl) {
      return configuredBaseUrl;
    }
  } catch {
    // Fall through to the production default when settings are unavailable.
  }

  return DEFAULT_PUBLIC_BASE_URL;
};

const loadVisibleEvents = async () => {
  if (getDbStatus().readyState !== 1) {
    return [];
  }

  try {
    return await Event.find({
      isDeleted: false,
      $or: [{ isHidden: false }, { isHidden: { $exists: false } }]
    })
      .select('_id updatedAt')
      .sort({ startDate: 1 })
      .lean();
  } catch {
    return [];
  }
};

export const buildRobotsTxt = async () => {
  const baseUrl = await resolvePublicBaseUrl();

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin-portal',
    'Disallow: /dashboard',
    'Disallow: /api/',
    'Disallow: /events/*/payment',
    `Sitemap: ${baseUrl}/sitemap.xml`
  ].join('\n');
};

export const buildSitemapXml = async () => {
  const baseUrl = await resolvePublicBaseUrl();
  const nowIso = new Date().toISOString();
  const eventEntries = await loadVisibleEvents();
  const urlEntries = [
    ...STATIC_PUBLIC_PATHS.map((entry) => ({
      loc: buildAbsoluteUrl(baseUrl, entry.path),
      lastmod: nowIso,
      changefreq: entry.changefreq,
      priority: entry.priority
    })),
    ...eventEntries.map((event) => ({
      loc: `${baseUrl}/events/${event._id}`,
      lastmod: new Date(event.updatedAt || nowIso).toISOString(),
      changefreq: 'daily',
      priority: '0.8'
    }))
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlEntries.map(
      (entry) => `  <url>
    <loc>${xmlEscape(entry.loc)}</loc>
    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>
    <changefreq>${xmlEscape(entry.changefreq)}</changefreq>
    <priority>${xmlEscape(entry.priority)}</priority>
  </url>`
    ),
    '</urlset>'
  ].join('\n');
};
