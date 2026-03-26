import { AppSetting } from '../models/AppSetting.js';
import { env } from '../config/env.js';

export const BACKUP_SETTINGS_KEY = 'backup-config';

const allowedFrequencies = new Set(['disabled', 'daily', 'weekly', 'monthly']);

const normalizeText = (value) => String(value || '').trim();

const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const normalizeFrequency = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return allowedFrequencies.has(normalized) ? normalized : 'disabled';
};

const normalizeDateValue = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const defaultBackupEmail = normalizeEmail(
  env.smtpToRecipients?.[0] || env.contactForwardEmails?.[0] || env.smtpFromEmail || ''
);

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');

const buildMergedBackupValue = (stored = {}) => ({
  backupEmail: normalizeEmail(stored.backupEmail || defaultBackupEmail),
  scheduleFrequency: normalizeFrequency(stored.scheduleFrequency),
  lastBackupAttemptAt: normalizeDateValue(stored.lastBackupAttemptAt),
  lastBackupDownloadedAt: normalizeDateValue(stored.lastBackupDownloadedAt),
  lastBackupSentAt: normalizeDateValue(stored.lastBackupSentAt),
  lastBackupStatus: normalizeText(stored.lastBackupStatus || 'idle') || 'idle',
  lastBackupError: normalizeText(stored.lastBackupError),
  lastBackupFileName: normalizeText(stored.lastBackupFileName),
  lastBackupTriggeredBy: normalizeText(stored.lastBackupTriggeredBy),
  lastRestoreAttemptAt: normalizeDateValue(stored.lastRestoreAttemptAt),
  lastRestoreCompletedAt: normalizeDateValue(stored.lastRestoreCompletedAt),
  lastRestoreStatus: normalizeText(stored.lastRestoreStatus || 'idle') || 'idle',
  lastRestoreError: normalizeText(stored.lastRestoreError),
  lastRestoreFileName: normalizeText(stored.lastRestoreFileName),
  lastRestoreTriggeredBy: normalizeText(stored.lastRestoreTriggeredBy)
});

export const ensureBackupSettingDocument = async () => {
  const existing = await AppSetting.findOne({ key: BACKUP_SETTINGS_KEY });
  const nextValue = buildMergedBackupValue(existing?.value || {});

  if (!existing) {
    return populateUpdatedBy(
      AppSetting.findOneAndUpdate(
        { key: BACKUP_SETTINGS_KEY },
        {
          key: BACKUP_SETTINGS_KEY,
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

  if (JSON.stringify(existing.value || {}) === JSON.stringify(nextValue)) {
    return populateUpdatedBy(AppSetting.findOne({ key: BACKUP_SETTINGS_KEY }));
  }

  return populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: BACKUP_SETTINGS_KEY },
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

const serializeBackupSettings = (settingDocument) => {
  const nextValue = buildMergedBackupValue(settingDocument?.value || {});

  return {
    ...nextValue,
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesEnvDefaults: !settingDocument
  };
};

export const getBackupSettingDocument = async () => ensureBackupSettingDocument();

export const getBackupSettings = async () => serializeBackupSettings(await getBackupSettingDocument());

export const getBackupSettingsForAutomation = async () => {
  const settingDocument = await ensureBackupSettingDocument();
  return buildMergedBackupValue(settingDocument?.value || {});
};

export const updateBackupSettings = async ({ payload, userId }) => {
  const existing = await AppSetting.findOne({ key: BACKUP_SETTINGS_KEY });
  const existingValue = buildMergedBackupValue(existing?.value || {});

  const nextValue = {
    ...existingValue,
    backupEmail: normalizeEmail(payload.backupEmail),
    scheduleFrequency: normalizeFrequency(payload.scheduleFrequency)
  };

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: BACKUP_SETTINGS_KEY },
      {
        key: BACKUP_SETTINGS_KEY,
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

  return serializeBackupSettings(updated);
};

export const recordBackupDeliveryResult = async ({
  attemptedAt,
  downloadedAt,
  sentAt,
  status,
  error,
  fileName,
  triggeredBy,
  userId
}) => {
  const existing = await AppSetting.findOne({ key: BACKUP_SETTINGS_KEY });
  const existingValue = buildMergedBackupValue(existing?.value || {});

  const nextValue = {
    ...existingValue,
    lastBackupAttemptAt: normalizeDateValue(attemptedAt) || new Date().toISOString(),
    lastBackupDownloadedAt: downloadedAt
      ? normalizeDateValue(downloadedAt)
      : existingValue.lastBackupDownloadedAt,
    lastBackupSentAt: sentAt ? normalizeDateValue(sentAt) : existingValue.lastBackupSentAt,
    lastBackupStatus: normalizeText(status) || existingValue.lastBackupStatus || 'idle',
    lastBackupError: normalizeText(error),
    lastBackupFileName: normalizeText(fileName),
    lastBackupTriggeredBy: normalizeText(triggeredBy)
  };

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: BACKUP_SETTINGS_KEY },
      {
        key: BACKUP_SETTINGS_KEY,
        value: nextValue,
        updatedBy: userId || existing?.updatedBy || null
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    )
  );

  return serializeBackupSettings(updated);
};

export const recordBackupRestoreResult = async ({
  attemptedAt,
  restoredAt,
  status,
  error,
  fileName,
  triggeredBy,
  userId
}) => {
  const existing = await AppSetting.findOne({ key: BACKUP_SETTINGS_KEY });
  const existingValue = buildMergedBackupValue(existing?.value || {});

  const nextValue = {
    ...existingValue,
    lastRestoreAttemptAt: normalizeDateValue(attemptedAt) || new Date().toISOString(),
    lastRestoreCompletedAt: restoredAt
      ? normalizeDateValue(restoredAt)
      : existingValue.lastRestoreCompletedAt,
    lastRestoreStatus: normalizeText(status) || existingValue.lastRestoreStatus || 'idle',
    lastRestoreError: normalizeText(error),
    lastRestoreFileName: normalizeText(fileName),
    lastRestoreTriggeredBy: normalizeText(triggeredBy)
  };

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: BACKUP_SETTINGS_KEY },
      {
        key: BACKUP_SETTINGS_KEY,
        value: nextValue,
        updatedBy: userId || existing?.updatedBy || null
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    )
  );

  return serializeBackupSettings(updated);
};
