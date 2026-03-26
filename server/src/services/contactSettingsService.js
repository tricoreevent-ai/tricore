import { AppSetting } from '../models/AppSetting.js';
import { env } from '../config/env.js';

export const CONTACT_FORWARDING_SETTINGS_KEY = 'contact-forwarding';

// Normalize and de-duplicate email inputs before saving or using them.
export const normalizeEmailList = (emails = []) =>
  Array.from(
    new Set(
      emails
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );

const DEFAULT_CONTACT_FORWARDING_VALUE = {
  contactInquiryEmails: [],
  registrationCompletedEmails: [],
  registrationFollowUpEmails: []
};

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');

const normalizeStoredValue = (value = {}) => ({
  contactInquiryEmails: normalizeEmailList(value.contactInquiryEmails || value.emails || []),
  registrationCompletedEmails: normalizeEmailList(value.registrationCompletedEmails || []),
  registrationFollowUpEmails: normalizeEmailList(value.registrationFollowUpEmails || [])
});

const getEnvContactInquiryFallbackEmails = () => normalizeEmailList(env.contactForwardEmails);

const hasStoredContactSettings = (value = {}) => {
  const normalized = normalizeStoredValue(value);
  return Object.values(normalized).some((emails) => emails.length);
};

export const ensureContactForwardingSettingDocument = async () => {
  const existing = await AppSetting.findOne({ key: CONTACT_FORWARDING_SETTINGS_KEY });

  if (!existing) {
    const fallbackEmails = normalizeEmailList(env.contactForwardEmails);

    if (!fallbackEmails.length) {
      return null;
    }

    return populateUpdatedBy(
      AppSetting.findOneAndUpdate(
        { key: CONTACT_FORWARDING_SETTINGS_KEY },
        {
          key: CONTACT_FORWARDING_SETTINGS_KEY,
          value: {
            ...DEFAULT_CONTACT_FORWARDING_VALUE,
            contactInquiryEmails: fallbackEmails
          }
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

  const normalizedExisting = normalizeStoredValue(existing.value || {});

  if (JSON.stringify(normalizedExisting) === JSON.stringify(existing.value || {})) {
    return populateUpdatedBy(AppSetting.findOne({ key: CONTACT_FORWARDING_SETTINGS_KEY }));
  }

  return populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: CONTACT_FORWARDING_SETTINGS_KEY },
      {
        $set: {
          value: normalizedExisting
        }
      },
      {
        new: true,
        runValidators: true
      }
    )
  );
};

export const getContactForwardingSettingDocument = async () => ensureContactForwardingSettingDocument();

export const serializeContactForwardingSettings = (settingDocument) => {
  const hasStoredDocument = Boolean(settingDocument);
  const storedValue = normalizeStoredValue(settingDocument?.value || {});
  const contactInquiryEmails = hasStoredDocument
    ? storedValue.contactInquiryEmails
    : getEnvContactInquiryFallbackEmails();

  return {
    emails: contactInquiryEmails,
    contactInquiryEmails,
    registrationCompletedEmails: storedValue.registrationCompletedEmails,
    registrationFollowUpEmails: storedValue.registrationFollowUpEmails,
    contactInquiryUsesEnvDefaults: !hasStoredDocument && Boolean(contactInquiryEmails.length),
    registrationCompletedUsesEnvDefaults: false,
    registrationFollowUpUsesEnvDefaults: false,
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesEnvDefaults: !hasStoredDocument || !hasStoredContactSettings(settingDocument.value || {})
  };
};

export const getContactForwardingSettings = async () =>
  serializeContactForwardingSettings(await getContactForwardingSettingDocument());

export const updateContactForwardingSettings = async ({
  emails,
  contactInquiryEmails,
  registrationCompletedEmails,
  registrationFollowUpEmails,
  userId
}) => {
  const nextValue = {
    contactInquiryEmails: normalizeEmailList(contactInquiryEmails ?? emails ?? []),
    registrationCompletedEmails: normalizeEmailList(registrationCompletedEmails || []),
    registrationFollowUpEmails: normalizeEmailList(registrationFollowUpEmails || [])
  };

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: CONTACT_FORWARDING_SETTINGS_KEY },
      {
        key: CONTACT_FORWARDING_SETTINGS_KEY,
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

  return serializeContactForwardingSettings(updated);
};
