import { AppSetting } from '../models/AppSetting.js';
import { adminRoles } from '../constants/adminAccess.js';
import { User } from '../models/User.js';

export const TRANSACTION_OTP_SETTINGS_KEY = 'transaction-otp-settings';

const normalizeText = (value) => String(value || '').trim();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');

const buildMergedTransactionOtpValue = (stored = {}) => ({
  enabled: stored.enabled !== undefined ? Boolean(stored.enabled) : true,
  deliveryEmail: normalizeEmail(stored.deliveryEmail)
});

const serializeTransactionOtpSettings = async (settingDocument) => {
  const merged = buildMergedTransactionOtpValue(settingDocument?.value || {});
  const fallbackRecipient = await User.findOne({
    authProvider: 'local',
    role: {
      $in: [adminRoles.superAdmin, adminRoles.admin]
    },
    email: { $gt: '' }
  })
    .sort({ createdAt: 1 })
    .select('name username email role');

  const fallbackRecipientEmail = normalizeEmail(fallbackRecipient?.email);
  const effectiveRecipientEmail = merged.deliveryEmail || fallbackRecipientEmail;

  return {
    ...merged,
    fallbackRecipientEmail,
    fallbackRecipientName: fallbackRecipient?.name || fallbackRecipient?.username || '',
    effectiveRecipientEmail,
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesEnvDefaults: !settingDocument
  };
};

export const ensureTransactionOtpSettingDocument = async () => {
  const existing = await AppSetting.findOne({ key: TRANSACTION_OTP_SETTINGS_KEY });
  const nextValue = buildMergedTransactionOtpValue(existing?.value || {});

  if (!existing) {
    return populateUpdatedBy(
      AppSetting.findOneAndUpdate(
        { key: TRANSACTION_OTP_SETTINGS_KEY },
        {
          key: TRANSACTION_OTP_SETTINGS_KEY,
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
    return populateUpdatedBy(AppSetting.findOne({ key: TRANSACTION_OTP_SETTINGS_KEY }));
  }

  return populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: TRANSACTION_OTP_SETTINGS_KEY },
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

export const getTransactionOtpSettingDocument = async () => ensureTransactionOtpSettingDocument();

export const getTransactionOtpSettings = async () =>
  serializeTransactionOtpSettings(await getTransactionOtpSettingDocument());

export const getTransactionOtpSettingsForEnforcement = async () => {
  const settingDocument = await ensureTransactionOtpSettingDocument();
  const serialized = await serializeTransactionOtpSettings(settingDocument);

  return {
    enabled: Boolean(serialized.enabled),
    effectiveRecipientEmail: normalizeEmail(serialized.effectiveRecipientEmail),
    configuredDeliveryEmail: normalizeEmail(serialized.deliveryEmail),
    fallbackRecipientEmail: normalizeEmail(serialized.fallbackRecipientEmail)
  };
};

export const updateTransactionOtpSettings = async ({ payload, userId }) => {
  const existing = await AppSetting.findOne({ key: TRANSACTION_OTP_SETTINGS_KEY });
  const nextValue = {
    ...buildMergedTransactionOtpValue(existing?.value || {}),
    enabled: Boolean(payload.enabled),
    deliveryEmail: normalizeEmail(payload.deliveryEmail)
  };

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: TRANSACTION_OTP_SETTINGS_KEY },
      {
        key: TRANSACTION_OTP_SETTINGS_KEY,
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

  return serializeTransactionOtpSettings(updated);
};
