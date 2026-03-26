import { AppSetting } from '../models/AppSetting.js';
import { env } from '../config/env.js';

export const EMAIL_SETTINGS_KEY = 'email-config';

const normalizeEmailList = (emails = []) => {
  const list = Array.isArray(emails) ? emails : String(emails || '').split(',');

  return Array.from(
    new Set(
      list
        .map((email) => String(email || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );
};

const normalizeText = (value) => String(value || '').trim();

const normalizePort = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return fallback;
  }
  return Math.trunc(parsed);
};

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');

const buildMergedEmailValue = (stored = {}) => ({
  smtpHost: normalizeText(stored.smtpHost || env.smtpHost),
  smtpPort: normalizePort(stored.smtpPort, env.smtpPort),
  smtpSecure:
    stored.smtpSecure !== undefined
      ? normalizeBoolean(stored.smtpSecure, false)
      : Boolean(env.smtpSecure),
  smtpUser: normalizeText(stored.smtpUser || env.smtpUser),
  smtpPass: normalizeText(stored.smtpPass || env.smtpPass),
  smtpFromEmail: normalizeText(stored.smtpFromEmail || env.smtpFromEmail),
  smtpFromName: normalizeText(stored.smtpFromName || env.smtpFromName),
  toRecipients:
    normalizeEmailList(stored.toRecipients || []).length > 0
      ? normalizeEmailList(stored.toRecipients || [])
      : normalizeEmailList(env.smtpToRecipients || [])
});

export const ensureEmailSettingDocument = async () => {
  const existing = await AppSetting.findOne({ key: EMAIL_SETTINGS_KEY });
  const nextValue = buildMergedEmailValue(existing?.value || {});

  if (!existing) {
    return populateUpdatedBy(
      AppSetting.findOneAndUpdate(
        { key: EMAIL_SETTINGS_KEY },
        {
          key: EMAIL_SETTINGS_KEY,
          value: nextValue
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true
        }
      )
    );
  }

  const existingValue = {
    smtpHost: normalizeText(existing.value?.smtpHost),
    smtpPort: normalizePort(existing.value?.smtpPort, env.smtpPort),
    smtpSecure: normalizeBoolean(existing.value?.smtpSecure, false),
    smtpUser: normalizeText(existing.value?.smtpUser),
    smtpPass: normalizeText(existing.value?.smtpPass),
    smtpFromEmail: normalizeText(existing.value?.smtpFromEmail),
    smtpFromName: normalizeText(existing.value?.smtpFromName),
    toRecipients: normalizeEmailList(existing.value?.toRecipients || [])
  };

  if (JSON.stringify(existingValue) === JSON.stringify(nextValue)) {
    return populateUpdatedBy(AppSetting.findOne({ key: EMAIL_SETTINGS_KEY }));
  }

  return populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: EMAIL_SETTINGS_KEY },
      {
        $set: {
          value: {
            ...(existing.value || {}),
            ...nextValue
          }
        }
      },
      {
        new: true,
        runValidators: true
      }
    )
  );
};

const serializeEmailSettings = (settingDocument) => {
  const nextValue = buildMergedEmailValue(settingDocument?.value || {});
  const smtpHost = nextValue.smtpHost;
  const smtpPort = nextValue.smtpPort;
  const smtpSecure = nextValue.smtpSecure;
  const smtpUser = nextValue.smtpUser;
  const smtpPass = nextValue.smtpPass;
  const smtpFromEmail = nextValue.smtpFromEmail;
  const smtpFromName = nextValue.smtpFromName;
  const toRecipients = nextValue.toRecipients;

  return {
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    hasSmtpPass: Boolean(smtpPass),
    smtpFromEmail,
    smtpFromName,
    toRecipients,
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesEnvDefaults: !settingDocument
  };
};

export const getEmailSettingDocument = async () =>
  ensureEmailSettingDocument();

export const getEmailSettings = async () =>
  serializeEmailSettings(await getEmailSettingDocument());

export const getEmailSettingsForSending = async () => {
  const settingDocument = await ensureEmailSettingDocument();
  return buildMergedEmailValue(settingDocument?.value || {});
};

export const updateEmailSettings = async ({ payload, userId }) => {
  const existing = await AppSetting.findOne({ key: EMAIL_SETTINGS_KEY });
  const existingValue = existing?.value || {};

  const nextValue = {
    smtpHost: normalizeText(payload.smtpHost),
    smtpPort: normalizePort(payload.smtpPort, env.smtpPort),
    smtpSecure: normalizeBoolean(payload.smtpSecure, false),
    smtpUser: normalizeText(payload.smtpUser),
    smtpFromEmail: normalizeText(payload.smtpFromEmail),
    smtpFromName: normalizeText(payload.smtpFromName || env.smtpFromName),
    toRecipients: normalizeEmailList(payload.toRecipients || []),
    // Keep previous password unless explicitly provided (including clearing with empty string).
    smtpPass:
      payload.smtpPass === undefined ? normalizeText(existingValue.smtpPass) : String(payload.smtpPass || '')
  };

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: EMAIL_SETTINGS_KEY },
      {
        key: EMAIL_SETTINGS_KEY,
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

  return serializeEmailSettings(updated);
};
