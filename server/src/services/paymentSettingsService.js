import { AppSetting } from '../models/AppSetting.js';
import { getEmailSettingsForSending } from './emailSettingsService.js';
import { persistImageReference } from './imageStorageService.js';

export const PAYMENT_SETTINGS_KEY = 'payment-config';

const normalizeText = (value) => String(value || '').trim();

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');

const serializePaymentSettings = async (settingDocument) => {
  const stored = settingDocument?.value || {};
  const emailSettings = await getEmailSettingsForSending();
  const defaultProofRecipient =
    Array.isArray(emailSettings.toRecipients) && emailSettings.toRecipients.length
      ? emailSettings.toRecipients[0]
      : '';

  return {
    manualPaymentEnabled: normalizeBoolean(stored.manualPaymentEnabled, false),
    upiId: normalizeText(stored.upiId),
    payeeName: normalizeText(stored.payeeName),
    qrCodeDataUrl: normalizeText(stored.qrCodeDataUrl),
    bankAccountName: normalizeText(stored.bankAccountName),
    bankAccountNumber: normalizeText(stored.bankAccountNumber),
    bankIfscCode: normalizeText(stored.bankIfscCode),
    bankName: normalizeText(stored.bankName),
    bankBranch: normalizeText(stored.bankBranch),
    bankInstructions: normalizeText(stored.bankInstructions),
    paymentProofRecipientEmail: normalizeText(stored.paymentProofRecipientEmail || defaultProofRecipient),
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesEnvDefaults: !settingDocument
  };
};

export const getPaymentSettingDocument = async () =>
  populateUpdatedBy(AppSetting.findOne({ key: PAYMENT_SETTINGS_KEY }));

export const getPaymentSettings = async () =>
  serializePaymentSettings(await getPaymentSettingDocument());

export const getPublicPaymentSettings = async () => {
  const settings = await getPaymentSettings();
  return {
    manualPaymentEnabled: settings.manualPaymentEnabled,
    upiId: settings.upiId,
    payeeName: settings.payeeName,
    qrCodeDataUrl: settings.qrCodeDataUrl,
    bankAccountName: settings.bankAccountName,
    bankAccountNumber: settings.bankAccountNumber,
    bankIfscCode: settings.bankIfscCode,
    bankName: settings.bankName,
    bankBranch: settings.bankBranch,
    bankInstructions: settings.bankInstructions
  };
};

export const updatePaymentSettings = async ({ payload, userId }) => {
  const nextValue = {
    manualPaymentEnabled: normalizeBoolean(payload.manualPaymentEnabled, false),
    upiId: normalizeText(payload.upiId),
    payeeName: normalizeText(payload.payeeName),
    qrCodeDataUrl: await persistImageReference(payload.qrCodeDataUrl, {
      folder: 'payment',
      filenamePrefix: 'qr'
    }),
    bankAccountName: normalizeText(payload.bankAccountName),
    bankAccountNumber: normalizeText(payload.bankAccountNumber),
    bankIfscCode: normalizeText(payload.bankIfscCode),
    bankName: normalizeText(payload.bankName),
    bankBranch: normalizeText(payload.bankBranch),
    bankInstructions: normalizeText(payload.bankInstructions),
    paymentProofRecipientEmail: normalizeText(payload.paymentProofRecipientEmail)
  };

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: PAYMENT_SETTINGS_KEY },
      {
        key: PAYMENT_SETTINGS_KEY,
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

  return serializePaymentSettings(updated);
};
