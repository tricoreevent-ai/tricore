import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppSetting } from '../models/AppSetting.js';
import { AudienceCampaign } from '../models/AudienceCampaign.js';
import { AudiencePreference } from '../models/AudiencePreference.js';
import { sendEmail } from './emailService.js';
import { getMailTransportSummary } from './contactNotificationService.js';
import { getPublicSiteSettings } from './publicSiteSettingsService.js';
import { resolveAudienceRecipients } from './audienceUserService.js';

export const AUDIENCE_CAMPAIGN_SETTINGS_KEY = 'audience-campaign-config';

const DEFAULT_CAMPAIGN_CONFIG = {
  enableEmail: true,
  enableSms: false,
  enableWhatsApp: false,
  smsProviderName: '',
  whatsappProviderName: '',
  defaultReplyTo: '',
  deliveryNotes: ''
};

const normalizeText = (value) => String(value || '').trim();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const normalizeCampaignConfigValue = (stored = {}) => ({
  enableEmail: true,
  enableSms: normalizeBoolean(stored.enableSms, DEFAULT_CAMPAIGN_CONFIG.enableSms),
  enableWhatsApp: normalizeBoolean(
    stored.enableWhatsApp,
    DEFAULT_CAMPAIGN_CONFIG.enableWhatsApp
  ),
  smsProviderName: normalizeText(stored.smsProviderName),
  whatsappProviderName: normalizeText(stored.whatsappProviderName),
  defaultReplyTo: normalizeText(stored.defaultReplyTo),
  deliveryNotes: normalizeText(stored.deliveryNotes)
});

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getCampaignConfigDocument = async () =>
  populateUpdatedBy(AppSetting.findOne({ key: AUDIENCE_CAMPAIGN_SETTINGS_KEY }));

const serializeCampaignConfig = async (settingDocument) => {
  const config = normalizeCampaignConfigValue(settingDocument?.value || {});
  const transportSummary = await getMailTransportSummary();

  return {
    ...config,
    smtpReady: Boolean(transportSummary.smtpReady),
    smtpFromEmail: transportSummary.smtpFromEmail || '',
    smtpFromName: transportSummary.smtpFromName || '',
    updatedAt: settingDocument?.updatedAt || null,
    updatedBy: settingDocument?.updatedBy || null,
    usesEnvDefaults: !settingDocument
  };
};

const resolvePublicBaseUrl = async () => {
  const settings = await getPublicSiteSettings();
  return normalizeText(settings.publicBaseUrl || env.clientUrl || 'https://www.tricoreevents.online').replace(
    /\/+$/,
    ''
  );
};

const resolveCampaignUrl = (baseUrl, ctaUrl) => {
  const normalized = normalizeText(ctaUrl);

  if (!normalized) {
    return '';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith('/')) {
    return `${baseUrl}${normalized}`;
  }

  return normalized;
};

const createAudienceUnsubscribeToken = (email) =>
  jwt.sign(
    {
      type: 'audience_unsubscribe',
      email: normalizeEmail(email)
    },
    env.jwtSecret,
    { expiresIn: '365d' }
  );

const verifyAudienceUnsubscribeToken = (token) => {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (decoded?.type !== 'audience_unsubscribe' || !normalizeEmail(decoded?.email)) {
    throw new Error('Invalid unsubscribe token.');
  }

  return normalizeEmail(decoded.email);
};

const buildUnsubscribeUrl = (baseUrl, email) =>
  `${baseUrl}/api/audience/unsubscribe?token=${encodeURIComponent(
    createAudienceUnsubscribeToken(email)
  )}`;

const formatParagraphsAsHtml = (message) =>
  normalizeText(message)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px; line-height:1.7; color:#334155;">${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`
    )
    .join('');

const buildCampaignEmailHtml = ({ campaign, ctaUrl, recipient, unsubscribeUrl }) => `
  <div style="background:#f8fafc; padding:32px 16px; font-family:Arial, sans-serif; color:#0f172a;">
    <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:24px; overflow:hidden;">
      <div style="padding:28px 28px 16px; background:linear-gradient(135deg,#eff6ff 0%,#ffffff 100%); border-bottom:1px solid #e2e8f0;">
        <p style="margin:0; font-size:12px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:#f97316;">TriCore Events Campaign</p>
        <h1 style="margin:14px 0 0; font-size:28px; line-height:1.2; color:#0f172a;">${escapeHtml(campaign.subject)}</h1>
        ${
          campaign.previewText
            ? `<p style="margin:14px 0 0; font-size:15px; line-height:1.6; color:#475569;">${escapeHtml(campaign.previewText)}</p>`
            : ''
        }
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 16px; font-size:16px; line-height:1.7; color:#0f172a;">
          Hello ${escapeHtml(recipient.name || recipient.email || 'there')},
        </p>
        ${formatParagraphsAsHtml(campaign.message)}
        ${
          ctaUrl && campaign.ctaLabel
            ? `
              <div style="margin:24px 0 8px;">
                <a href="${escapeHtml(ctaUrl)}" style="display:inline-block; background:#f97316; color:#ffffff; text-decoration:none; font-weight:700; padding:14px 22px; border-radius:999px;">
                  ${escapeHtml(campaign.ctaLabel)}
                </a>
              </div>
            `
            : ''
        }
      </div>
      <div style="padding:20px 28px 28px; border-top:1px solid #e2e8f0; background:#f8fafc;">
        <p style="margin:0 0 10px; font-size:13px; line-height:1.7; color:#64748b;">
          You are receiving this email because you registered, showed interest, or participated in a TriCore Events tournament.
        </p>
        <p style="margin:0; font-size:13px; line-height:1.7; color:#64748b;">
          <a href="${escapeHtml(unsubscribeUrl)}" style="color:#2563eb;">Unsubscribe from future event emails</a>
        </p>
      </div>
    </div>
  </div>
`;

const buildCampaignEmailText = ({ campaign, ctaUrl, recipient, unsubscribeUrl }) =>
  [
    `Hello ${recipient.name || recipient.email || 'there'},`,
    '',
    normalizeText(campaign.previewText),
    normalizeText(campaign.message),
    ctaUrl && campaign.ctaLabel ? `${campaign.ctaLabel}: ${ctaUrl}` : '',
    '',
    'You are receiving this email because you registered, showed interest, or participated in a TriCore Events tournament.',
    `Unsubscribe: ${unsubscribeUrl}`
  ]
    .filter(Boolean)
    .join('\n');

const serializeAudienceCampaign = (campaignDocument) => {
  const campaign = typeof campaignDocument?.toJSON === 'function' ? campaignDocument.toJSON() : campaignDocument;

  return {
    ...campaign,
    createdBy: campaign?.createdBy
      ? {
          _id: String(campaign.createdBy._id || ''),
          name: campaign.createdBy.name || '',
          username: campaign.createdBy.username || '',
          email: campaign.createdBy.email || ''
        }
      : null
  };
};

export const getAudienceCampaignConfig = async () =>
  serializeCampaignConfig(await getCampaignConfigDocument());

export const updateAudienceCampaignConfig = async ({ payload, userId }) => {
  const updated = await populateUpdatedBy(
    AppSetting.findOneAndUpdate(
      { key: AUDIENCE_CAMPAIGN_SETTINGS_KEY },
      {
        key: AUDIENCE_CAMPAIGN_SETTINGS_KEY,
        value: normalizeCampaignConfigValue(payload),
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

  return serializeCampaignConfig(updated);
};

export const getAudienceCampaignsPage = async ({ limit = 10, page = 1 } = {}) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;
  const [items, totalCount] = await Promise.all([
    AudienceCampaign.find({})
      .populate('createdBy', 'name username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    AudienceCampaign.countDocuments({})
  ]);

  return {
    items: items.map((item) => serializeAudienceCampaign(item)),
    page: safePage,
    limit: safeLimit,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / safeLimit))
  };
};

export const sendAudienceCampaignMessage = async ({ payload, userId }) => {
  const filters = payload.filters || {};
  const recipients = await resolveAudienceRecipients({
    filters,
    selectedEmails: payload.targetMode === 'selected' ? payload.selectedEmails || [] : []
  });
  const optedOutRecipients = recipients.filter((recipient) => recipient.preferences?.emailOptOut);
  const deliverableRecipients = recipients.filter(
    (recipient) => normalizeEmail(recipient.email) && !recipient.preferences?.emailOptOut
  );

  if (!deliverableRecipients.length) {
    throw new Error(
      optedOutRecipients.length
        ? 'All matching contacts have opted out of email campaigns.'
        : 'No matching audience contacts are available for email campaigns.'
    );
  }

  const [campaignConfig, publicBaseUrl] = await Promise.all([
    getAudienceCampaignConfig(),
    resolvePublicBaseUrl()
  ]);

  if (!campaignConfig.smtpReady) {
    throw new Error('SMTP email is not configured. Update email settings before sending campaigns.');
  }

  const resolvedCtaUrl = resolveCampaignUrl(publicBaseUrl, payload.ctaUrl);
  const failed = [];
  const sentRecipients = [];
  let sentCount = 0;

  for (const recipient of deliverableRecipients) {
    const unsubscribeUrl = buildUnsubscribeUrl(publicBaseUrl, recipient.email);

    try {
      await sendEmail({
        to: recipient.email,
        subject: payload.subject,
        replyTo: campaignConfig.defaultReplyTo || undefined,
        text: buildCampaignEmailText({
          campaign: payload,
          ctaUrl: resolvedCtaUrl,
          recipient,
          unsubscribeUrl
        }),
        html: buildCampaignEmailHtml({
          campaign: payload,
          ctaUrl: resolvedCtaUrl,
          recipient,
          unsubscribeUrl
        }),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      });
      sentCount += 1;
      sentRecipients.push(recipient);
    } catch (error) {
      failed.push({
        email: recipient.email,
        error: error instanceof Error ? error.message : 'Unable to send email.'
      });
    }
  }

  const skippedOptOutCount = optedOutRecipients.length;
  const failedEmailCount = failed.length;
  const notes = [
    payload.channels?.sms
      ? campaignConfig.enableSms
        ? 'SMS delivery is enabled in configuration, but provider delivery is not yet integrated.'
        : 'SMS was requested for this campaign, but SMS delivery is disabled in configuration.'
      : '',
    payload.channels?.whatsapp
      ? campaignConfig.enableWhatsApp
        ? 'WhatsApp delivery is enabled in configuration, but provider delivery is not yet integrated.'
        : 'WhatsApp delivery was requested for this campaign, but WhatsApp is disabled in configuration.'
      : '',
    campaignConfig.deliveryNotes
  ]
    .filter(Boolean)
    .join(' ');

  if (sentRecipients.length) {
    await AudiencePreference.bulkWrite(
      sentRecipients.map((recipient) => ({
        updateOne: {
          filter: { email: normalizeEmail(recipient.email) },
          update: {
            $set: {
              userId: recipient.userId || null,
              name: recipient.name || '',
              phone: recipient.contactNumber || '',
              lastCampaignAt: new Date()
            },
            $setOnInsert: {
              email: normalizeEmail(recipient.email)
            }
          },
          upsert: true
        }
      }))
    );
  }

  const campaign = await AudienceCampaign.create({
    name: payload.name,
    subject: payload.subject,
    previewText: payload.previewText || '',
    message: payload.message,
    ctaLabel: payload.ctaLabel || '',
    ctaUrl: resolvedCtaUrl,
    medium: 'email',
    channels: {
      email: true,
      sms: Boolean(payload.channels?.sms),
      whatsapp: Boolean(payload.channels?.whatsapp)
    },
    filters: {
      search: filters.search || '',
      segment: filters.segment || 'all',
      eventId: filters.eventId || null,
      sort: filters.sort || 'recent'
    },
    selectedEmails: payload.targetMode === 'selected' ? payload.selectedEmails || [] : [],
    targetMode: payload.targetMode || 'filtered',
    audienceCount: recipients.length,
    emailSentCount: sentCount,
    skippedOptOutCount,
    failedEmailCount,
    status:
      sentCount && failedEmailCount
        ? 'partial'
        : sentCount
          ? 'sent'
          : 'failed',
    notes,
    launchedAt: new Date(),
    createdBy: userId
  });

  const populatedCampaign = await AudienceCampaign.findById(campaign._id).populate(
    'createdBy',
    'name username email'
  );

  return {
    campaign: serializeAudienceCampaign(populatedCampaign),
    sentCount,
    failedCount: failedEmailCount,
    failed,
    skippedOptOutCount,
    totalMatched: recipients.length
  };
};

export const unsubscribeAudienceEmailByToken = async (token) => {
  const email = verifyAudienceUnsubscribeToken(token);
  const preference = await AudiencePreference.findOneAndUpdate(
    { email },
    {
      $set: {
        emailOptOut: true,
        emailOptOutAt: new Date()
      },
      $setOnInsert: {
        email
      }
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  );

  return {
    email,
    preference
  };
};
