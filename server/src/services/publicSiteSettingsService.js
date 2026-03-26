import { env } from '../config/env.js';
import { AppSetting } from '../models/AppSetting.js';

export const PUBLIC_SITE_SETTINGS_KEY = 'public-site-config';

const normalizeBaseUrl = (value) =>
  String(value || '')
    .trim()
    .replace(/\/+$/, '');

const DEFAULT_PUBLIC_SITE_SETTINGS = {
  publicBaseUrl: normalizeBaseUrl(env.clientUrl || 'https://www.tricoreevents.online')
};

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');

const serializePublicSiteSettings = (settingDocument) => {
  const stored = settingDocument?.value || {};

  return {
    publicBaseUrl: normalizeBaseUrl(
      stored.publicBaseUrl || DEFAULT_PUBLIC_SITE_SETTINGS.publicBaseUrl
    ),
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesEnvDefaults: !settingDocument
  };
};

export const getPublicSiteSettingsDocument = async () =>
  populateUpdatedBy(AppSetting.findOne({ key: PUBLIC_SITE_SETTINGS_KEY }));

export const getPublicSiteSettings = async () =>
  serializePublicSiteSettings(await getPublicSiteSettingsDocument());

export const ensurePublicSiteSettingDocument = async () => {
  const existing = await AppSetting.findOne({ key: PUBLIC_SITE_SETTINGS_KEY });

  if (existing) {
    return serializePublicSiteSettings(existing);
  }

  const created = await AppSetting.create({
    key: PUBLIC_SITE_SETTINGS_KEY,
    value: DEFAULT_PUBLIC_SITE_SETTINGS
  });

  return serializePublicSiteSettings(created);
};

export const updatePublicSiteSettings = async ({ payload, userId }) => {
  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: PUBLIC_SITE_SETTINGS_KEY },
      {
        key: PUBLIC_SITE_SETTINGS_KEY,
        value: {
          publicBaseUrl: normalizeBaseUrl(payload.publicBaseUrl)
        },
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

  return serializePublicSiteSettings(updated);
};

export const buildPublicEventUrl = async (event) => {
  const settings = await getPublicSiteSettings();
  const baseUrl = normalizeBaseUrl(settings.publicBaseUrl || DEFAULT_PUBLIC_SITE_SETTINGS.publicBaseUrl);
  const eventIdentifier = String(event?.slug || event?._id || '').trim();

  return eventIdentifier ? `${baseUrl}/events/${eventIdentifier}` : baseUrl;
};
