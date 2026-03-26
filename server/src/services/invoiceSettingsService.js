import { AppSetting } from '../models/AppSetting.js';
import { persistImageReference } from './imageStorageService.js';

export const INVOICE_SETTINGS_KEY = 'invoice-settings';

const DEFAULT_TEMPLATE_STYLE = 'modern';
const ALLOWED_TEMPLATE_STYLES = new Set(['modern', 'classic', 'executive']);
const DEFAULT_TERMS = [
  'Payment is due on or before the due date stated on this document unless otherwise agreed in writing by TriCore Events.',
  'Amounts paid for confirmed event allocations, sponsorship inventory, or completed services are non-refundable except where TriCore approves a documented exception.',
  "TriCore Events' liability is limited to the value of the billed service or sponsorship item and does not extend to indirect, incidental, or consequential losses.",
  "This document and any related commercial arrangement are governed by the applicable laws and jurisdiction connected to TriCore Events' operating entity in India."
];

const DEFAULT_INVOICE_SETTINGS = {
  companyName: 'TriCore Events',
  companyEmail: 'contact@tricoreevents.online',
  companyWebsite: 'https://www.tricoreevents.online/',
  companyLogoUrl: '/tricore-mark.svg',
  invoicePrefix: 'TRI',
  invoiceNumberFormat: '{PREFIX}-{YYYY}-{SEQ4}',
  nextSequenceNumber: 1,
  defaultTaxLabel: 'GST',
  defaultTaxRate: 0,
  paymentTermsLabel: 'Due within 15 days from invoice date.',
  paymentTermsDays: 15,
  footerNotes: 'Sarva Horizon is the Event Partner.',
  footerTerms: DEFAULT_TERMS.join('\n'),
  defaultTemplateStyle: DEFAULT_TEMPLATE_STYLE
};

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');
const normalizeText = (value) => String(value || '').trim();
const normalizePositiveInteger = (value, fallback = 1) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const normalizeNonNegativeInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};
const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Restrict formatting tokens so admins can customize numbering without breaking generation.
const normalizeInvoiceNumberFormat = (value) => {
  const normalized = normalizeText(value).slice(0, 120);
  return normalized || DEFAULT_INVOICE_SETTINGS.invoiceNumberFormat;
};

const normalizeTemplateStyle = (value) => {
  const normalized = normalizeText(value).toLowerCase();
  return ALLOWED_TEMPLATE_STYLES.has(normalized) ? normalized : DEFAULT_TEMPLATE_STYLE;
};

const normalizeInvoiceSettingsValue = (value = {}) => ({
  companyName: normalizeText(value.companyName) || DEFAULT_INVOICE_SETTINGS.companyName,
  companyEmail: normalizeText(value.companyEmail) || DEFAULT_INVOICE_SETTINGS.companyEmail,
  companyWebsite: normalizeText(value.companyWebsite) || DEFAULT_INVOICE_SETTINGS.companyWebsite,
  companyLogoUrl: normalizeText(value.companyLogoUrl) || DEFAULT_INVOICE_SETTINGS.companyLogoUrl,
  invoicePrefix: normalizeText(value.invoicePrefix).slice(0, 20) || DEFAULT_INVOICE_SETTINGS.invoicePrefix,
  invoiceNumberFormat: normalizeInvoiceNumberFormat(value.invoiceNumberFormat),
  nextSequenceNumber: normalizePositiveInteger(
    value.nextSequenceNumber,
    DEFAULT_INVOICE_SETTINGS.nextSequenceNumber
  ),
  defaultTaxLabel: normalizeText(value.defaultTaxLabel).slice(0, 40),
  defaultTaxRate: normalizeNumber(value.defaultTaxRate, DEFAULT_INVOICE_SETTINGS.defaultTaxRate),
  paymentTermsLabel: normalizeText(value.paymentTermsLabel).slice(0, 240),
  paymentTermsDays: normalizeNonNegativeInteger(
    value.paymentTermsDays,
    DEFAULT_INVOICE_SETTINGS.paymentTermsDays
  ),
  footerNotes: normalizeText(value.footerNotes).slice(0, 1000),
  footerTerms: normalizeText(value.footerTerms).slice(0, 5000),
  defaultTemplateStyle: normalizeTemplateStyle(value.defaultTemplateStyle)
});

const replaceTemplateTokens = ({ format, prefix, sequence, issueDate }) => {
  const invoiceDate = issueDate instanceof Date && !Number.isNaN(issueDate.getTime())
    ? issueDate
    : new Date();
  const year = invoiceDate.getUTCFullYear();
  const month = String(invoiceDate.getUTCMonth() + 1).padStart(2, '0');
  const tokenMap = {
    '{PREFIX}': prefix,
    '{YYYY}': String(year),
    '{YY}': String(year).slice(-2),
    '{MM}': month,
    '{SEQ}': String(sequence),
    '{SEQ4}': String(sequence).padStart(4, '0'),
    '{SEQ5}': String(sequence).padStart(5, '0'),
    '{SEQ6}': String(sequence).padStart(6, '0')
  };

  return Object.entries(tokenMap).reduce(
    (documentNumber, [token, replacement]) => documentNumber.split(token).join(replacement),
    format
  );
};

export const formatInvoiceDocumentNumber = ({ issueDate, sequence, settings }) => {
  const prefix = normalizeText(settings?.invoicePrefix) || DEFAULT_INVOICE_SETTINGS.invoicePrefix;
  const format =
    normalizeInvoiceNumberFormat(settings?.invoiceNumberFormat) ||
    DEFAULT_INVOICE_SETTINGS.invoiceNumberFormat;
  const formatted = replaceTemplateTokens({
    format,
    prefix,
    sequence,
    issueDate
  });

  return normalizeText(formatted) || `${prefix}-${String(sequence).padStart(4, '0')}`;
};

export const ensureInvoiceSettingDocument = async () => {
  const existing = await AppSetting.findOne({ key: INVOICE_SETTINGS_KEY });

  if (!existing) {
    return populateUpdatedBy(
      AppSetting.findOneAndUpdate(
        { key: INVOICE_SETTINGS_KEY },
        {
          key: INVOICE_SETTINGS_KEY,
          value: DEFAULT_INVOICE_SETTINGS
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

  const normalizedExisting = normalizeInvoiceSettingsValue(existing.value || {});

  if (
    JSON.stringify(normalizedExisting) ===
    JSON.stringify({
      ...existing.value,
      defaultTemplateStyle: normalizeTemplateStyle(existing.value?.defaultTemplateStyle)
    })
  ) {
    return populateUpdatedBy(AppSetting.findOne({ key: INVOICE_SETTINGS_KEY }));
  }

  return populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: INVOICE_SETTINGS_KEY },
      {
        $set: {
          value: {
            ...normalizedExisting,
            companyLogoUrl:
              normalizeText(existing.value?.companyLogoUrl) || DEFAULT_INVOICE_SETTINGS.companyLogoUrl
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

export const getInvoiceSettingsSettingDocument = async () => ensureInvoiceSettingDocument();

export const serializeInvoiceSettings = (settingDocument) => {
  const normalized = normalizeInvoiceSettingsValue(settingDocument?.value || DEFAULT_INVOICE_SETTINGS);
  const previewSequence = normalized.nextSequenceNumber;

  return {
    ...normalized,
    companyLogoUrl:
      normalizeText(settingDocument?.value?.companyLogoUrl) || DEFAULT_INVOICE_SETTINGS.companyLogoUrl,
    previewDocumentNumber: formatInvoiceDocumentNumber({
      issueDate: new Date(),
      sequence: previewSequence,
      settings: normalized
    }),
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesEnvDefaults: !settingDocument
  };
};

export const getInvoiceSettings = async () =>
  serializeInvoiceSettings(await getInvoiceSettingsSettingDocument());

export const updateInvoiceSettings = async ({ payload, userId }) => {
  const existing = await getInvoiceSettingsSettingDocument();
  const existingValue = normalizeInvoiceSettingsValue(existing?.value || DEFAULT_INVOICE_SETTINGS);
  const nextLogoUrl =
    payload.companyLogoUrl === undefined
      ? normalizeText(existing?.value?.companyLogoUrl) || DEFAULT_INVOICE_SETTINGS.companyLogoUrl
      : await persistImageReference(payload.companyLogoUrl, {
          folder: 'branding',
          filenamePrefix: 'invoice-logo'
        });
  const nextValue = normalizeInvoiceSettingsValue({
    ...existingValue,
    ...payload,
    companyLogoUrl: nextLogoUrl
  });

  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: INVOICE_SETTINGS_KEY },
      {
        key: INVOICE_SETTINGS_KEY,
        value: {
          ...nextValue,
          companyLogoUrl:
            normalizeText(nextValue.companyLogoUrl) || DEFAULT_INVOICE_SETTINGS.companyLogoUrl,
          nextSequenceNumber: existingValue.nextSequenceNumber
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

  return serializeInvoiceSettings(updated);
};

// Reserve sequence numbers atomically so generated invoice ids stay unique.
export const reserveNextInvoiceDocumentNumber = async (issueDate = new Date()) => {
  const updated = await AppSetting.findOneAndUpdate(
    { key: INVOICE_SETTINGS_KEY },
    {
      $setOnInsert: {
        key: INVOICE_SETTINGS_KEY,
        value: DEFAULT_INVOICE_SETTINGS
      },
      $inc: {
        'value.nextSequenceNumber': 1
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  );

  const serialized = serializeInvoiceSettings(updated);
  const sequence = Math.max(1, Number(serialized.nextSequenceNumber || 1) - 1);

  return formatInvoiceDocumentNumber({
    issueDate,
    sequence,
    settings: serialized
  });
};
