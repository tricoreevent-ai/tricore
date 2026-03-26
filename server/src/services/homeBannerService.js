import { randomUUID } from 'node:crypto';

import { AppSetting } from '../models/AppSetting.js';
import { persistImageReference } from './imageStorageService.js';

export const HOME_BANNER_SETTINGS_KEY = 'home-banner-config';

const normalizeText = (value) => String(value || '').trim();

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');

const normalizeBanner = (banner = {}, index = 0) => ({
  id: normalizeText(banner.id) || randomUUID(),
  badge: normalizeText(banner.badge),
  title: normalizeText(banner.title) || `Banner ${index + 1}`,
  description: normalizeText(banner.description),
  imageUrl: normalizeText(banner.imageUrl),
  imageAlt: normalizeText(banner.imageAlt) || normalizeText(banner.title) || `Banner ${index + 1}`,
  primaryActionLabel: normalizeText(banner.primaryActionLabel),
  primaryActionHref: normalizeText(banner.primaryActionHref),
  secondaryActionLabel: normalizeText(banner.secondaryActionLabel),
  secondaryActionHref: normalizeText(banner.secondaryActionHref),
  isActive: normalizeBoolean(banner.isActive, true)
});

const serializeHomeBannerSettings = (settingDocument) => {
  const storedBanners = Array.isArray(settingDocument?.value?.banners) ? settingDocument.value.banners : [];
  const banners = storedBanners.map((banner, index) => normalizeBanner(banner, index));

  return {
    banners,
    totalCount: banners.length,
    activeCount: banners.filter((banner) => banner.isActive).length,
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesEnvDefaults: !settingDocument
  };
};

export const getHomeBannerSettingDocument = async () =>
  populateUpdatedBy(AppSetting.findOne({ key: HOME_BANNER_SETTINGS_KEY }));

export const getHomeBannerSettings = async () =>
  serializeHomeBannerSettings(await getHomeBannerSettingDocument());

export const getPublicHomeBanners = async () => {
  const settings = await getHomeBannerSettings();
  return {
    banners: settings.banners.filter((banner) => banner.isActive)
  };
};

export const updateHomeBannerSettings = async ({ payload, userId }) => {
  const nextValue = {
    banners: Array.isArray(payload.banners)
      ? await Promise.all(
          payload.banners.map(async (banner, index) =>
            normalizeBanner(
              {
                ...banner,
                imageUrl: await persistImageReference(banner.imageUrl, {
                  folder: 'home-banners',
                  filenamePrefix: 'banner'
                })
              },
              index
            )
          )
        )
      : []
  };

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: HOME_BANNER_SETTINGS_KEY },
      {
        key: HOME_BANNER_SETTINGS_KEY,
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

  return serializeHomeBannerSettings(updated);
};
