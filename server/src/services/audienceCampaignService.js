import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppSetting } from '../models/AppSetting.js';
import { AudienceCampaign } from '../models/AudienceCampaign.js';
import { AudienceCampaignRecipient } from '../models/AudienceCampaignRecipient.js';
import { AudienceCampaignTemplate } from '../models/AudienceCampaignTemplate.js';
import { AudiencePreference } from '../models/AudiencePreference.js';
import { sendEmail } from './emailService.js';
import { getMailTransportSummary } from './contactNotificationService.js';
import { getPublicSiteSettings } from './publicSiteSettingsService.js';
import { resolveAudienceRecipients } from './audienceUserService.js';

export const AUDIENCE_CAMPAIGN_SETTINGS_KEY = 'audience-campaign-config';

const SCHEDULER_INTERVAL_MS = 60 * 1000;
const TRACKING_PIXEL_BUFFER = Buffer.from(
  'R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

const DEFAULT_CAMPAIGN_CONFIG = {
  enableEmail: true,
  emailProvider: 'smtp',
  enableSms: false,
  smsProviderName: '',
  enableWhatsApp: false,
  whatsappProviderName: '',
  enablePush: false,
  pushProviderName: '',
  fallbackChannel: 'none',
  defaultReplyTo: '',
  deliveryNotes: '',
  requireApproval: false,
  sendThrottlePerMinute: 180,
  smsCostPerMessage: 0,
  whatsappCostPerMessage: 0,
  costCurrency: 'INR'
};

let schedulerStarted = false;
let schedulerBusy = false;
let schedulerTimer = null;

const normalizeText = (value) => String(value || '').trim();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();
const populateUpdatedBy = (query) => query.populate('updatedBy', 'name username email');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
};

const normalizeTags = (tags = []) =>
  [...new Set((Array.isArray(tags) ? tags : String(tags || '').split(',')).map((item) => normalizeText(item)).filter(Boolean))];

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateValue = (value, options = {}) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options
  });
};

const formatPercent = (numerator, denominator) => {
  if (!denominator) {
    return 0;
  }

  return Number(((Number(numerator || 0) / Number(denominator || 0)) * 100).toFixed(1));
};

const detectDeviceType = (userAgent = '') => {
  const value = String(userAgent || '').toLowerCase();

  if (/ipad|tablet/.test(value)) {
    return 'tablet';
  }

  if (/mobile|iphone|android/.test(value)) {
    return 'mobile';
  }

  return 'desktop';
};

const detectBrowserName = (userAgent = '') => {
  const value = String(userAgent || '');

  if (/Edg\//.test(value)) {
    return 'Edge';
  }

  if (/OPR\//.test(value)) {
    return 'Opera';
  }

  if (/Chrome\//.test(value)) {
    return 'Chrome';
  }

  if (/Firefox\//.test(value)) {
    return 'Firefox';
  }

  if (/Safari\//.test(value)) {
    return 'Safari';
  }

  return 'Other';
};

const normalizeCampaignConfigValue = (stored = {}) => ({
  enableEmail: true,
  emailProvider: normalizeText(stored.emailProvider || DEFAULT_CAMPAIGN_CONFIG.emailProvider),
  enableSms: normalizeBoolean(stored.enableSms, DEFAULT_CAMPAIGN_CONFIG.enableSms),
  smsProviderName: normalizeText(stored.smsProviderName),
  enableWhatsApp: normalizeBoolean(stored.enableWhatsApp, DEFAULT_CAMPAIGN_CONFIG.enableWhatsApp),
  whatsappProviderName: normalizeText(stored.whatsappProviderName),
  enablePush: normalizeBoolean(stored.enablePush, DEFAULT_CAMPAIGN_CONFIG.enablePush),
  pushProviderName: normalizeText(stored.pushProviderName),
  fallbackChannel: ['none', 'email', 'sms', 'whatsapp', 'push'].includes(
    normalizeText(stored.fallbackChannel)
  )
    ? normalizeText(stored.fallbackChannel)
    : DEFAULT_CAMPAIGN_CONFIG.fallbackChannel,
  defaultReplyTo: normalizeText(stored.defaultReplyTo),
  deliveryNotes: normalizeText(stored.deliveryNotes),
  requireApproval: normalizeBoolean(stored.requireApproval, DEFAULT_CAMPAIGN_CONFIG.requireApproval),
  sendThrottlePerMinute: Math.max(
    0,
    Math.min(
      600,
      Math.round(
        normalizeNumber(
          stored.sendThrottlePerMinute,
          DEFAULT_CAMPAIGN_CONFIG.sendThrottlePerMinute
        )
      )
    )
  ),
  smsCostPerMessage: Math.max(
    0,
    normalizeNumber(stored.smsCostPerMessage, DEFAULT_CAMPAIGN_CONFIG.smsCostPerMessage)
  ),
  whatsappCostPerMessage: Math.max(
    0,
    normalizeNumber(
      stored.whatsappCostPerMessage,
      DEFAULT_CAMPAIGN_CONFIG.whatsappCostPerMessage
    )
  ),
  costCurrency:
    normalizeText(stored.costCurrency || DEFAULT_CAMPAIGN_CONFIG.costCurrency) || 'INR'
});

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

const serializeTemplate = (templateDocument) => {
  const template =
    typeof templateDocument?.toJSON === 'function' ? templateDocument.toJSON() : templateDocument;

  return {
    ...template,
    createdBy: template?.createdBy
      ? {
          _id: String(template.createdBy._id || ''),
          name: template.createdBy.name || '',
          username: template.createdBy.username || '',
          email: template.createdBy.email || ''
        }
      : null,
    updatedBy: template?.updatedBy
      ? {
          _id: String(template.updatedBy._id || ''),
          name: template.updatedBy.name || '',
          username: template.updatedBy.username || '',
          email: template.updatedBy.email || ''
        }
      : null
  };
};

const serializeRecipient = (recipientDocument) => {
  const recipient =
    typeof recipientDocument?.toJSON === 'function' ? recipientDocument.toJSON() : recipientDocument;

  return {
    ...recipient,
    campaignId: recipient?.campaignId
      ? {
          _id: String(recipient.campaignId._id || recipient.campaignId),
          name: recipient.campaignId.name || '',
          subject: recipient.campaignId.subject || '',
          status: recipient.campaignId.status || '',
          launchedAt: recipient.campaignId.launchedAt || null,
          scheduledAt: recipient.campaignId.scheduledAt || null
        }
      : null
  };
};

const serializeCampaign = (campaignDocument) => {
  const campaign =
    typeof campaignDocument?.toJSON === 'function' ? campaignDocument.toJSON() : campaignDocument;
  const deliveredBase = campaign?.deliveredCount || campaign?.emailSentCount || 0;

  return {
    ...campaign,
    createdBy: campaign?.createdBy
      ? {
          _id: String(campaign.createdBy._id || ''),
          name: campaign.createdBy.name || '',
          username: campaign.createdBy.username || '',
          email: campaign.createdBy.email || ''
        }
      : null,
    approvedBy: campaign?.approvedBy
      ? {
          _id: String(campaign.approvedBy._id || ''),
          name: campaign.approvedBy.name || '',
          username: campaign.approvedBy.username || '',
          email: campaign.approvedBy.email || ''
        }
      : null,
    analytics: {
      deliveryRate: formatPercent(
        deliveredBase,
        Math.max(1, (campaign?.audienceCount || 0) - (campaign?.skippedOptOutCount || 0))
      ),
      openRate: formatPercent(campaign?.openCount || 0, deliveredBase),
      clickRate: formatPercent(campaign?.clickCount || 0, deliveredBase)
    }
  };
};

const resolvePublicBaseUrl = async () => {
  const settings = await getPublicSiteSettings();
  return normalizeText(
    settings.publicBaseUrl || env.clientUrl || 'https://www.tricoreevents.online'
  ).replace(/\/+$/, '');
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

const createTrackingToken = ({ action, campaignId, recipientId, url = '' }) =>
  jwt.sign(
    {
      type: 'audience_campaign_tracking',
      action,
      campaignId: String(campaignId || ''),
      recipientId: String(recipientId || ''),
      url
    },
    env.jwtSecret,
    { expiresIn: '365d' }
  );

const verifyTrackingToken = (token, expectedAction) => {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (
    decoded?.type !== 'audience_campaign_tracking' ||
    decoded?.action !== expectedAction ||
    !normalizeText(decoded?.campaignId) ||
    !normalizeText(decoded?.recipientId)
  ) {
    throw new Error('Invalid tracking token.');
  }

  return {
    campaignId: String(decoded.campaignId),
    recipientId: String(decoded.recipientId),
    url: normalizeText(decoded.url)
  };
};

const buildUnsubscribeUrl = (baseUrl, email) =>
  `${baseUrl}/api/audience/unsubscribe?token=${encodeURIComponent(
    createAudienceUnsubscribeToken(email)
  )}`;

const buildTrackingUrl = (baseUrl, action, payload) =>
  `${baseUrl}/api/audience/tracking/${action}?token=${encodeURIComponent(
    createTrackingToken({
      ...payload,
      action
    })
  )}`;

const buildRecipientVariables = ({
  recipient,
  ctaUrl = '',
  unsubscribeUrl = '',
  campaignName = ''
}) => {
  const currentEvents = recipient.currentEvents?.map((item) => item.eventName).filter(Boolean) || [];
  const previousEvents =
    recipient.previousEvents?.map((item) => item.eventName).filter(Boolean) || [];
  const interestedEvents =
    recipient.interestedEvents?.map((item) => item.eventName).filter(Boolean) || [];
  const primaryEvent =
    recipient.currentEvents?.[0] ||
    recipient.interestedEvents?.[0] ||
    recipient.previousEvents?.[0] ||
    null;
  const firstName = normalizeText(recipient.name).split(/\s+/).filter(Boolean)[0] || 'there';

  return {
    firstName,
    fullName: normalizeText(recipient.name) || firstName,
    email: normalizeEmail(recipient.email),
    contactNumber: normalizeText(recipient.contactNumber),
    location: normalizeText(recipient.location),
    currentEvents: currentEvents.join(', '),
    previousEvents: previousEvents.join(', '),
    interestedEvents: interestedEvents.join(', '),
    primaryEventName: normalizeText(primaryEvent?.eventName),
    primaryEventVenue: normalizeText(primaryEvent?.venue),
    primaryEventStartDate: formatDateValue(primaryEvent?.startDate),
    primaryEventEndDate: formatDateValue(primaryEvent?.endDate),
    paymentStatuses: (recipient.paymentStatuses || []).join(', '),
    registrationStatuses: (recipient.registrationStatuses || []).join(', '),
    engagementLevel: normalizeText(recipient.engagementLevel),
    campaignName: normalizeText(campaignName),
    ctaUrl,
    unsubscribeUrl
  };
};

const applyTemplateVariables = (value, variables = {}) =>
  String(value || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const resolved = variables[key];
    return resolved === undefined || resolved === null ? '' : String(resolved);
  });

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

const buildCampaignEmailHtml = ({
  ctaLabel,
  ctaUrl,
  message,
  openTrackingUrl,
  previewText,
  recipientName,
  subject,
  unsubscribeUrl
}) => `
  <div style="background:#f8fafc; padding:32px 16px; font-family:Arial, sans-serif; color:#0f172a;">
    <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:24px; overflow:hidden;">
      <div style="padding:28px 28px 16px; background:linear-gradient(135deg,#eff6ff 0%,#ffffff 100%); border-bottom:1px solid #e2e8f0;">
        <p style="margin:0; font-size:12px; font-weight:700; letter-spacing:0.22em; text-transform:uppercase; color:#f97316;">TriCore Events Campaign</p>
        <h1 style="margin:14px 0 0; font-size:28px; line-height:1.2; color:#0f172a;">${escapeHtml(subject)}</h1>
        ${
          previewText
            ? `<p style="margin:14px 0 0; font-size:15px; line-height:1.6; color:#475569;">${escapeHtml(previewText)}</p>`
            : ''
        }
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 16px; font-size:16px; line-height:1.7; color:#0f172a;">
          Hello ${escapeHtml(recipientName || 'there')},
        </p>
        ${formatParagraphsAsHtml(message)}
        ${
          ctaUrl && ctaLabel
            ? `
              <div style="margin:24px 0 8px;">
                <a href="${escapeHtml(ctaUrl)}" style="display:inline-block; background:#f97316; color:#ffffff; text-decoration:none; font-weight:700; padding:14px 22px; border-radius:999px;">
                  ${escapeHtml(ctaLabel)}
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
    <img alt="" height="1" src="${escapeHtml(openTrackingUrl)}" style="display:block;height:1px;width:1px;border:0;opacity:0;" width="1" />
  </div>
`;

const buildCampaignEmailText = ({
  ctaLabel,
  ctaUrl,
  message,
  previewText,
  recipientName,
  unsubscribeUrl
}) =>
  [
    `Hello ${recipientName || 'there'},`,
    '',
    normalizeText(previewText),
    normalizeText(message),
    ctaUrl && ctaLabel ? `${ctaLabel}: ${ctaUrl}` : '',
    '',
    'You are receiving this email because you registered, showed interest, or participated in a TriCore Events tournament.',
    `Unsubscribe: ${unsubscribeUrl}`
  ]
    .filter(Boolean)
    .join('\n');

const buildCampaignNotes = ({ campaign, campaignConfig, existingNotes = '' }) =>
  [
    normalizeText(existingNotes),
    campaign.channels?.sms
      ? campaignConfig.enableSms
        ? `SMS configured via ${campaignConfig.smsProviderName || 'custom provider'} as an optional add-on.`
        : 'SMS was selected, but SMS delivery is disabled in campaign settings.'
      : '',
    campaign.channels?.whatsapp
      ? campaignConfig.enableWhatsApp
        ? `WhatsApp configured via ${campaignConfig.whatsappProviderName || 'custom provider'} as an optional add-on.`
        : 'WhatsApp was selected, but WhatsApp delivery is disabled in campaign settings.'
      : '',
    campaign.channels?.push
      ? campaignConfig.enablePush
        ? `Push notifications are enabled through ${campaignConfig.pushProviderName || 'custom provider'} as an optional add-on.`
        : 'Push notifications were selected, but push delivery is disabled in campaign settings.'
      : '',
    normalizeText(campaignConfig.deliveryNotes)
  ]
    .filter(Boolean)
    .join(' ');

const estimateCampaignCosts = ({ campaignConfig, channels, recipientCount }) => ({
  estimatedSmsCost: channels?.sms
    ? Number((recipientCount * campaignConfig.smsCostPerMessage).toFixed(2))
    : 0,
  estimatedWhatsAppCost: channels?.whatsapp
    ? Number((recipientCount * campaignConfig.whatsappCostPerMessage).toFixed(2))
    : 0,
  costCurrency: campaignConfig.costCurrency || 'INR'
});

const shouldSendImmediately = (launchAction, requiresApproval) =>
  launchAction === 'send_now' && !requiresApproval;

const buildInitialCampaignStatus = ({ launchAction, requiresApproval }) => {
  if (launchAction === 'save_draft') {
    return 'draft';
  }

  if (requiresApproval || launchAction === 'submit_for_approval') {
    return 'pending_approval';
  }

  if (launchAction === 'schedule') {
    return 'scheduled';
  }

  return 'draft';
};

const updateCampaignSummaryFromRecipient = async ({
  campaignId,
  incrementField,
  whenFirstEvent
}) => {
  if (!whenFirstEvent) {
    return;
  }

  await AudienceCampaign.findByIdAndUpdate(campaignId, {
    $inc: { [incrementField]: 1 },
    $set: { lastProcessedAt: new Date() }
  });
};

const throttleForCampaign = async (campaignConfig, index, totalCount) => {
  if (index >= totalCount - 1) {
    return;
  }

  const throttlePerMinute = Number(campaignConfig.sendThrottlePerMinute || 0);

  if (!throttlePerMinute) {
    return;
  }

  const delayMs = Math.max(0, Math.round(60000 / throttlePerMinute));

  if (delayMs > 0) {
    await sleep(delayMs);
  }
};

const prepareCampaignTemplateContent = async ({ payload }) => {
  if (!payload.templateId) {
    return null;
  }

  return AudienceCampaignTemplate.findById(payload.templateId);
};

const buildCampaignPayloadDocument = ({
  payload,
  userId,
  campaignConfig,
  audienceCount,
  template
}) => {
  const requiresApproval = Boolean(payload.requiresApproval ?? campaignConfig.requireApproval);
  const launchAction = normalizeText(payload.launchAction || 'send_now') || 'send_now';
  const status = buildInitialCampaignStatus({
    launchAction,
    requiresApproval
  });
  const costSummary = estimateCampaignCosts({
    campaignConfig,
    channels: payload.channels,
    recipientCount: audienceCount
  });

  return {
    name: normalizeText(payload.name),
    subject: normalizeText(payload.subject),
    previewText: normalizeText(payload.previewText),
    message: normalizeText(payload.message),
    ctaLabel: normalizeText(payload.ctaLabel),
    ctaUrl: normalizeText(payload.ctaUrl),
    medium: 'email',
    campaignType: normalizeText(payload.campaignType || 'bulk_email') || 'bulk_email',
    channels: {
      email: true,
      sms: Boolean(payload.channels?.sms),
      whatsapp: Boolean(payload.channels?.whatsapp),
      push: Boolean(payload.channels?.push)
    },
    fallbackChannel:
      normalizeText(payload.fallbackChannel || campaignConfig.fallbackChannel) || 'none',
    filters: {
      search: payload.filters?.search || '',
      segment: payload.filters?.segment || 'all',
      eventId: payload.filters?.eventId || null,
      paymentStatus: payload.filters?.paymentStatus || 'all',
      engagementLevel: payload.filters?.engagementLevel || 'all',
      location: payload.filters?.location || '',
      tag: payload.filters?.tag || '',
      sort: payload.filters?.sort || 'recent'
    },
    selectedEmails:
      payload.targetMode === 'selected' ? payload.selectedEmails || [] : [],
    targetMode: payload.targetMode || 'filtered',
    launchAction,
    templateId: template?._id || null,
    templateName: template?.name || '',
    requiresApproval,
    submittedForApprovalAt:
      requiresApproval || launchAction === 'submit_for_approval' ? new Date() : null,
    scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
    timezone: normalizeText(payload.timezone || 'Asia/Calcutta') || 'Asia/Calcutta',
    audienceCount,
    deliveredCount: 0,
    openCount: 0,
    clickCount: 0,
    skippedOptOutCount: 0,
    emailSentCount: 0,
    failedEmailCount: 0,
    estimatedSmsCost: costSummary.estimatedSmsCost,
    estimatedWhatsAppCost: costSummary.estimatedWhatsAppCost,
    costCurrency: costSummary.costCurrency,
    notes: normalizeText(payload.notes),
    status,
    createdBy: userId
  };
};

const buildTestRecipient = (targetEmail) => ({
  audienceKey: normalizeEmail(targetEmail),
  userId: '',
  name: 'Test Recipient',
  email: normalizeEmail(targetEmail),
  contactNumber: '',
  location: '',
  currentEvents: [],
  previousEvents: [],
  interestedEvents: [],
  paymentStatuses: [],
  registrationStatuses: [],
  engagementLevel: 'low',
  preferences: {
    emailOptOut: false
  }
});

const preparePersonalizedCampaignEmail = ({
  campaign,
  publicBaseUrl,
  recipient,
  trackingRecipientId
}) => {
  const unsubscribeUrl = buildUnsubscribeUrl(publicBaseUrl, recipient.email);
  const variablesWithBaseUrl = buildRecipientVariables({
    recipient,
    campaignName: campaign.name
  });
  const personalizedRawCtaUrl = applyTemplateVariables(campaign.ctaUrl, {
    ...variablesWithBaseUrl,
    unsubscribeUrl
  });
  const resolvedDestinationUrl = resolveCampaignUrl(publicBaseUrl, personalizedRawCtaUrl);
  const variables = buildRecipientVariables({
    recipient,
    ctaUrl: resolvedDestinationUrl,
    unsubscribeUrl,
    campaignName: campaign.name
  });
  const subject = applyTemplateVariables(campaign.subject, variables);
  const previewText = applyTemplateVariables(campaign.previewText, variables);
  const message = applyTemplateVariables(campaign.message, variables);
  const ctaLabel = applyTemplateVariables(campaign.ctaLabel, variables);
  const openTrackingUrl = trackingRecipientId
    ? buildTrackingUrl(publicBaseUrl, 'open', {
        campaignId: campaign._id,
        recipientId: trackingRecipientId
      })
    : '';
  const trackedCtaUrl =
    trackingRecipientId && resolvedDestinationUrl
      ? buildTrackingUrl(publicBaseUrl, 'click', {
          campaignId: campaign._id,
          recipientId: trackingRecipientId,
          url: resolvedDestinationUrl
        })
      : resolvedDestinationUrl;

  return {
    subject,
    previewText,
    message,
    ctaLabel,
    trackedCtaUrl,
    unsubscribeUrl,
    html: buildCampaignEmailHtml({
      ctaLabel,
      ctaUrl: trackedCtaUrl,
      message,
      openTrackingUrl,
      previewText,
      recipientName: recipient.name,
      subject,
      unsubscribeUrl
    }),
    text: buildCampaignEmailText({
      ctaLabel,
      ctaUrl: trackedCtaUrl,
      message,
      previewText,
      recipientName: recipient.name,
      unsubscribeUrl
    })
  };
};

const getCampaignById = async (campaignId) =>
  AudienceCampaign.findById(campaignId)
    .populate('createdBy', 'name username email')
    .populate('approvedBy', 'name username email');

const markCampaignAsProcessed = async ({ campaignId, notes, status, updates = {} }) =>
  AudienceCampaign.findByIdAndUpdate(
    campaignId,
    {
      $set: {
        status,
        notes,
        lastProcessedAt: new Date(),
        ...updates
      }
    },
    {
      new: true
    }
  )
    .populate('createdBy', 'name username email')
    .populate('approvedBy', 'name username email');

const executeAudienceCampaignSend = async ({ campaignDocument }) => {
  const campaign =
    typeof campaignDocument?.toJSON === 'function' ? campaignDocument.toJSON() : campaignDocument;
  const [campaignConfig, publicBaseUrl] = await Promise.all([
    getAudienceCampaignConfig(),
    resolvePublicBaseUrl()
  ]);

  if (!campaignConfig.smtpReady) {
    return markCampaignAsProcessed({
      campaignId: campaign._id,
      status: 'failed',
      notes: buildCampaignNotes({
        campaign,
        campaignConfig,
        existingNotes: 'SMTP email is not configured.'
      })
    });
  }

  const recipients = await resolveAudienceRecipients({
    filters: campaign.filters || {},
    selectedEmails: campaign.targetMode === 'selected' ? campaign.selectedEmails || [] : []
  });

  if (!recipients.length) {
    return markCampaignAsProcessed({
      campaignId: campaign._id,
      status: 'failed',
      notes: buildCampaignNotes({
        campaign,
        campaignConfig,
        existingNotes:
          'No matching recipients were available when the campaign was processed.'
      }),
      updates: {
        audienceCount: 0,
        launchedAt: new Date()
      }
    });
  }

  await AudienceCampaign.findByIdAndUpdate(campaign._id, {
    $set: {
      status: 'sending',
      lastProcessedAt: new Date()
    }
  });
  await AudienceCampaignRecipient.deleteMany({ campaignId: campaign._id });

  let sentCount = 0;
  let deliveredCount = 0;
  let skippedOptOutCount = 0;
  let failedEmailCount = 0;
  const failed = [];
  const sentRecipients = [];

  for (let index = 0; index < recipients.length; index += 1) {
    const recipient = recipients[index];
    const email = normalizeEmail(recipient.email);

    if (!email) {
      continue;
    }

    if (recipient.preferences?.emailOptOut) {
      skippedOptOutCount += 1;
      await AudienceCampaignRecipient.create({
        campaignId: campaign._id,
        email,
        userId: recipient.userId || null,
        name: recipient.name || '',
        channel: 'email',
        status: 'skipped_opt_out',
        subject: normalizeText(campaign.subject)
      });
      continue;
    }

    const trackingRecipient = await AudienceCampaignRecipient.create({
      campaignId: campaign._id,
      email,
      userId: recipient.userId || null,
      name: recipient.name || '',
      channel: 'email',
      status: 'pending',
      subject: normalizeText(campaign.subject)
    });

    const prepared = preparePersonalizedCampaignEmail({
      campaign,
      publicBaseUrl,
      recipient,
      trackingRecipientId: trackingRecipient._id
    });

    try {
      await sendEmail({
        to: email,
        subject: prepared.subject,
        replyTo: campaignConfig.defaultReplyTo || undefined,
        text: prepared.text,
        html: prepared.html,
        headers: {
          'List-Unsubscribe': `<${prepared.unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      });

      sentCount += 1;
      deliveredCount += 1;
      sentRecipients.push(recipient);

      await AudienceCampaignRecipient.findByIdAndUpdate(trackingRecipient._id, {
        $set: {
          subject: prepared.subject,
          status: 'sent',
          sentAt: new Date()
        }
      });
    } catch (error) {
      failedEmailCount += 1;
      failed.push({
        email,
        error: error instanceof Error ? error.message : 'Unable to send email.'
      });

      await AudienceCampaignRecipient.findByIdAndUpdate(trackingRecipient._id, {
        $set: {
          subject: prepared.subject,
          status: 'failed',
          failureReason:
            error instanceof Error ? error.message : 'Unable to send email.'
        }
      });
    }

    await throttleForCampaign(campaignConfig, index, recipients.length);
  }

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

  const finalStatus =
    sentCount && failedEmailCount
      ? 'partial'
      : sentCount
        ? 'sent'
        : 'failed';

  const updatedCampaign = await markCampaignAsProcessed({
    campaignId: campaign._id,
    status: finalStatus,
    notes: buildCampaignNotes({
      campaign,
      campaignConfig,
      existingNotes: campaign.notes
    }),
    updates: {
      audienceCount: recipients.length,
      emailSentCount: sentCount,
      deliveredCount,
      skippedOptOutCount,
      failedEmailCount,
      launchedAt: new Date()
    }
  });

  return {
    campaign: serializeCampaign(updatedCampaign),
    sentCount,
    deliveredCount,
    failedCount: failedEmailCount,
    failed,
    skippedOptOutCount,
    totalMatched: recipients.length
  };
};

const runScheduledAudienceCampaigns = async () => {
  if (schedulerBusy) {
    return;
  }

  schedulerBusy = true;

  try {
    const dueCampaigns = await AudienceCampaign.find({
      status: 'scheduled',
      scheduledAt: { $lte: new Date() },
      $or: [{ requiresApproval: false }, { approvedAt: { $ne: null } }]
    })
      .sort({ scheduledAt: 1 })
      .limit(10);

    for (const campaign of dueCampaigns) {
      try {
        await executeAudienceCampaignSend({ campaignDocument: campaign });
      } catch (error) {
        console.warn('Audience campaign scheduler warning:', error.message);
      }
    }
  } catch (error) {
    console.warn('Audience campaign scheduler warning:', error.message);
  } finally {
    schedulerBusy = false;
  }
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

export const getAudienceCampaignDashboard = async () => {
  const [
    campaignConfig,
    totalsResult,
    statusCounts,
    upcomingScheduled,
    templateCount,
    unsubscribedCount,
    deviceStats,
    browserStats
  ] = await Promise.all([
    getAudienceCampaignConfig(),
    AudienceCampaign.aggregate([
      {
        $group: {
          _id: null,
          totalCampaigns: { $sum: 1 },
          totalSent: { $sum: '$emailSentCount' },
          totalDelivered: { $sum: '$deliveredCount' },
          totalOpened: { $sum: '$openCount' },
          totalClicked: { $sum: '$clickCount' },
          totalFailed: { $sum: '$failedEmailCount' },
          totalScheduled: {
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
          },
          totalPendingApproval: {
            $sum: { $cond: [{ $eq: ['$status', 'pending_approval'] }, 1, 0] }
          }
        }
      }
    ]),
    AudienceCampaign.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    AudienceCampaign.find({ status: 'scheduled', scheduledAt: { $gte: new Date() } })
      .sort({ scheduledAt: 1 })
      .limit(5)
      .select('name scheduledAt status audienceCount channels'),
    AudienceCampaignTemplate.countDocuments({ isActive: true }),
    AudiencePreference.countDocuments({ emailOptOut: true }),
    AudienceCampaignRecipient.aggregate([
      { $match: { openedAt: { $ne: null } } },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    AudienceCampaignRecipient.aggregate([
      { $match: { openedAt: { $ne: null } } },
      { $group: { _id: '$browserName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])
  ]);

  const totals = totalsResult[0] || {
    totalCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalFailed: 0,
    totalScheduled: 0,
    totalPendingApproval: 0
  };

  return {
    config: campaignConfig,
    metrics: {
      totalCampaigns: totals.totalCampaigns || 0,
      totalSent: totals.totalSent || 0,
      totalDelivered: totals.totalDelivered || 0,
      totalFailed: totals.totalFailed || 0,
      totalOpened: totals.totalOpened || 0,
      totalClicked: totals.totalClicked || 0,
      totalScheduled: totals.totalScheduled || 0,
      totalPendingApproval: totals.totalPendingApproval || 0,
      totalTemplates: templateCount || 0,
      unsubscribedCount: unsubscribedCount || 0,
      openRate: formatPercent(totals.totalOpened || 0, totals.totalDelivered || 0),
      clickRate: formatPercent(totals.totalClicked || 0, totals.totalDelivered || 0)
    },
    statusChart: statusCounts.map((item) => ({
      key: item._id || 'unknown',
      label: normalizeText(item._id || 'unknown'),
      value: item.count || 0
    })),
    upcomingScheduled: upcomingScheduled.map((item) => ({
      _id: String(item._id),
      name: item.name,
      scheduledAt: item.scheduledAt,
      status: item.status,
      audienceCount: item.audienceCount || 0,
      channels: item.channels
    })),
    deviceStats: deviceStats.map((item) => ({
      label: normalizeText(item._id || 'unknown'),
      value: item.count || 0
    })),
    browserStats: browserStats.map((item) => ({
      label: normalizeText(item._id || 'unknown'),
      value: item.count || 0
    }))
  };
};

export const getAudienceCampaignsPage = async ({ limit = 10, page = 1 } = {}) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;
  const [items, totalCount] = await Promise.all([
    AudienceCampaign.find({})
      .populate('createdBy', 'name username email')
      .populate('approvedBy', 'name username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    AudienceCampaign.countDocuments({})
  ]);

  return {
    items: items.map((item) => serializeCampaign(item)),
    page: safePage,
    limit: safeLimit,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / safeLimit))
  };
};

export const getAudienceCampaignExportRows = async () => {
  const campaigns = await AudienceCampaign.find({})
    .populate('createdBy', 'name username')
    .populate('approvedBy', 'name username')
    .sort({ createdAt: -1 });

  return campaigns.map((item) => {
    const campaign = serializeCampaign(item);

    return {
      name: campaign.name,
      type: campaign.campaignType,
      status: campaign.status,
      subject: campaign.subject,
      audienceCount: campaign.audienceCount,
      deliveredCount: campaign.deliveredCount,
      openCount: campaign.openCount,
      clickCount: campaign.clickCount,
      openRate: `${campaign.analytics.openRate}%`,
      clickRate: `${campaign.analytics.clickRate}%`,
      failedEmailCount: campaign.failedEmailCount,
      skippedOptOutCount: campaign.skippedOptOutCount,
      scheduledAt: campaign.scheduledAt || '',
      launchedAt: campaign.launchedAt || '',
      createdBy: campaign.createdBy?.name || campaign.createdBy?.username || '',
      approvedBy: campaign.approvedBy?.name || campaign.approvedBy?.username || ''
    };
  });
};

export const getAudienceCampaignTemplates = async () => {
  const items = await AudienceCampaignTemplate.find({})
    .populate('createdBy', 'name username email')
    .populate('updatedBy', 'name username email')
    .sort({ createdAt: -1 });

  return items.map((item) => serializeTemplate(item));
};

export const createAudienceCampaignTemplate = async ({ payload, userId }) => {
  const template = await AudienceCampaignTemplate.create({
    name: normalizeText(payload.name),
    description: normalizeText(payload.description),
    channel: normalizeText(payload.channel || 'email') || 'email',
    subject: normalizeText(payload.subject),
    previewText: normalizeText(payload.previewText),
    message: normalizeText(payload.message),
    ctaLabel: normalizeText(payload.ctaLabel),
    ctaUrl: normalizeText(payload.ctaUrl),
    isActive: payload.isActive !== false,
    createdBy: userId,
    updatedBy: userId
  });

  const populated = await AudienceCampaignTemplate.findById(template._id)
    .populate('createdBy', 'name username email')
    .populate('updatedBy', 'name username email');

  return serializeTemplate(populated);
};

export const updateAudienceCampaignTemplate = async ({ payload, templateId, userId }) => {
  const updated = await AudienceCampaignTemplate.findByIdAndUpdate(
    templateId,
    {
      $set: {
        name: normalizeText(payload.name),
        description: normalizeText(payload.description),
        channel: normalizeText(payload.channel || 'email') || 'email',
        subject: normalizeText(payload.subject),
        previewText: normalizeText(payload.previewText),
        message: normalizeText(payload.message),
        ctaLabel: normalizeText(payload.ctaLabel),
        ctaUrl: normalizeText(payload.ctaUrl),
        isActive: payload.isActive !== false,
        updatedBy: userId
      }
    },
    {
      new: true,
      runValidators: true
    }
  )
    .populate('createdBy', 'name username email')
    .populate('updatedBy', 'name username email');

  if (!updated) {
    throw new Error('Campaign template not found.');
  }

  return serializeTemplate(updated);
};

export const deleteAudienceCampaignTemplate = async (templateId) => {
  const deleted = await AudienceCampaignTemplate.findByIdAndDelete(templateId);

  if (!deleted) {
    throw new Error('Campaign template not found.');
  }

  return {
    _id: String(deleted._id),
    name: deleted.name
  };
};

export const createAudienceCampaign = async ({ payload, userId }) => {
  const campaignConfig = await getAudienceCampaignConfig();

  if (!campaignConfig.enableEmail) {
    throw new Error('Email campaigns are disabled in campaign settings.');
  }

  const template = await prepareCampaignTemplateContent({ payload });

  if (payload.templateId && !template) {
    throw new Error('Selected campaign template was not found.');
  }

  const effectivePayload = {
    ...payload,
    subject: normalizeText(payload.subject || template?.subject),
    previewText: normalizeText(payload.previewText || template?.previewText),
    message: normalizeText(payload.message || template?.message),
    ctaLabel: normalizeText(payload.ctaLabel || template?.ctaLabel),
    ctaUrl: normalizeText(payload.ctaUrl || template?.ctaUrl)
  };

  if (!effectivePayload.subject) {
    throw new Error('Campaign subject is required.');
  }

  if (!effectivePayload.message) {
    throw new Error('Campaign message is required.');
  }

  if (effectivePayload.launchAction === 'schedule' && !effectivePayload.scheduledAt) {
    throw new Error('Choose a scheduled date and time for this campaign.');
  }

  const recipients = await resolveAudienceRecipients({
    filters: effectivePayload.filters || {},
    selectedEmails:
      effectivePayload.targetMode === 'selected' ? effectivePayload.selectedEmails || [] : []
  });
  const audienceCount = recipients.length;

  if (!audienceCount && effectivePayload.launchAction !== 'save_draft') {
    throw new Error('No matching audience contacts were found for this campaign.');
  }

  const campaign = await AudienceCampaign.create(
    buildCampaignPayloadDocument({
      payload: effectivePayload,
      userId,
      campaignConfig,
      audienceCount,
      template
    })
  );

  if (
    shouldSendImmediately(
      normalizeText(effectivePayload.launchAction || 'send_now'),
      Boolean(effectivePayload.requiresApproval ?? campaignConfig.requireApproval)
    )
  ) {
    return executeAudienceCampaignSend({
      campaignDocument: await getCampaignById(campaign._id)
    });
  }

  const storedCampaign = await getCampaignById(campaign._id);

  return {
    campaign: serializeCampaign(storedCampaign),
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    failed: [],
    skippedOptOutCount: 0,
    totalMatched: audienceCount
  };
};

export const sendAudienceCampaignMessage = createAudienceCampaign;

export const approveAudienceCampaign = async ({
  action = 'approve',
  campaignId,
  note = '',
  userId
}) => {
  const campaign = await AudienceCampaign.findById(campaignId);

  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  if (campaign.status !== 'pending_approval') {
    throw new Error('Only campaigns pending approval can be reviewed here.');
  }

  const normalizedAction = normalizeText(action || 'approve') || 'approve';
  const approvalNote = normalizeText(note);

  if (normalizedAction === 'reject') {
    const rejected = await markCampaignAsProcessed({
      campaignId,
      status: 'draft',
      notes: [normalizeText(campaign.notes), approvalNote].filter(Boolean).join(' '),
      updates: {
        approvedBy: null,
        approvedAt: null
      }
    });

    return {
      action: 'reject',
      campaign: serializeCampaign(rejected)
    };
  }

  const approved = await AudienceCampaign.findByIdAndUpdate(
    campaignId,
    {
      $set: {
        approvedBy: userId,
        approvedAt: new Date(),
        notes: [normalizeText(campaign.notes), approvalNote].filter(Boolean).join(' ')
      }
    },
    {
      new: true
    }
  )
    .populate('createdBy', 'name username email')
    .populate('approvedBy', 'name username email');

  if (!approved) {
    throw new Error('Campaign not found.');
  }

  if (approved.scheduledAt && new Date(approved.scheduledAt).getTime() > Date.now()) {
    const scheduled = await markCampaignAsProcessed({
      campaignId,
      status: 'scheduled',
      notes: normalizeText(approved.notes)
    });

    return {
      action: 'approve',
      campaign: serializeCampaign(scheduled)
    };
  }

  const sendResult = await executeAudienceCampaignSend({
    campaignDocument: approved
  });

  return {
    action: 'approve',
    ...sendResult
  };
};

export const sendAudienceCampaignTest = async ({ payload, targetEmail }) => {
  const campaignConfig = await getAudienceCampaignConfig();

  if (!campaignConfig.smtpReady) {
    throw new Error('SMTP email is not configured on the server.');
  }

  const template = await prepareCampaignTemplateContent({ payload });

  if (payload.templateId && !template) {
    throw new Error('Selected campaign template was not found.');
  }

  const publicBaseUrl = await resolvePublicBaseUrl();
  const campaign = {
    _id: 'test',
    name: normalizeText(payload.name || 'Test Campaign'),
    subject: normalizeText(payload.subject || template?.subject),
    previewText: normalizeText(payload.previewText || template?.previewText),
    message: normalizeText(payload.message || template?.message),
    ctaLabel: normalizeText(payload.ctaLabel || template?.ctaLabel),
    ctaUrl: normalizeText(payload.ctaUrl || template?.ctaUrl)
  };

  if (!campaign.subject) {
    throw new Error('Campaign subject is required for a test send.');
  }

  if (!campaign.message) {
    throw new Error('Campaign message is required for a test send.');
  }

  const recipient = buildTestRecipient(targetEmail);
  const prepared = preparePersonalizedCampaignEmail({
    campaign,
    publicBaseUrl,
    recipient,
    trackingRecipientId: null
  });

  await sendEmail({
    to: normalizeEmail(targetEmail),
    subject: prepared.subject,
    replyTo: campaignConfig.defaultReplyTo || undefined,
    text: prepared.text,
    html: prepared.html,
    headers: {
      'List-Unsubscribe': `<${prepared.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-TriCore-Campaign-Test': 'true'
    }
  });

  return {
    targetEmail: normalizeEmail(targetEmail),
    sentAt: new Date(),
    subject: prepared.subject
  };
};

export const getAudienceUnsubscribedUsersPage = async ({
  limit = 20,
  page = 1,
  search = ''
} = {}) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const safePage = Math.max(1, Number(page) || 1);
  const normalizedSearch = normalizeText(search);
  const query = {
    emailOptOut: true,
    ...(normalizedSearch
      ? {
          $or: [
            { name: { $regex: normalizedSearch, $options: 'i' } },
            { email: { $regex: normalizedSearch, $options: 'i' } },
            { phone: { $regex: normalizedSearch, $options: 'i' } },
            { tags: { $elemMatch: { $regex: normalizedSearch, $options: 'i' } } }
          ]
        }
      : {})
  };
  const skip = (safePage - 1) * safeLimit;
  const [items, totalCount] = await Promise.all([
    AudiencePreference.find(query).sort({ emailOptOutAt: -1, updatedAt: -1 }).skip(skip).limit(safeLimit),
    AudiencePreference.countDocuments(query)
  ]);

  return {
    items: items.map((item) => ({
      _id: String(item._id),
      userId: item.userId ? String(item.userId) : '',
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      tags: item.tags || [],
      emailOptOut: Boolean(item.emailOptOut),
      emailOptOutAt: item.emailOptOutAt || null,
      lastCampaignAt: item.lastCampaignAt || null
    })),
    page: safePage,
    limit: safeLimit,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / safeLimit))
  };
};

export const getAudienceUserCampaignHistory = async ({
  email,
  limit = 10,
  page = 1
}) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error('A valid user email is required.');
  }

  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 50));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;
  const [items, totalCount] = await Promise.all([
    AudienceCampaignRecipient.find({ email: normalizedEmail })
      .populate('campaignId', 'name subject status launchedAt scheduledAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit),
    AudienceCampaignRecipient.countDocuments({ email: normalizedEmail })
  ]);

  return {
    items: items.map((item) => serializeRecipient(item)),
    page: safePage,
    limit: safeLimit,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / safeLimit))
  };
};

export const updateAudienceUserPreferenceByEmail = async ({
  email,
  payload = {}
}) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error('A valid user email is required.');
  }

  const updated = await AudiencePreference.findOneAndUpdate(
    { email: normalizedEmail },
    {
      $set: {
        email: normalizedEmail,
        name: normalizeText(payload.name),
        phone: normalizeText(payload.phone),
        tags: normalizeTags(payload.tags || []),
        emailOptOut: normalizeBoolean(payload.emailOptOut, false),
        smsOptOut: normalizeBoolean(payload.smsOptOut, false),
        whatsappOptOut: normalizeBoolean(payload.whatsappOptOut, false),
        emailOptOutAt: normalizeBoolean(payload.emailOptOut, false) ? new Date() : null,
        smsOptOutAt: normalizeBoolean(payload.smsOptOut, false) ? new Date() : null,
        whatsappOptOutAt: normalizeBoolean(payload.whatsappOptOut, false) ? new Date() : null
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
    _id: String(updated._id),
    userId: updated.userId ? String(updated.userId) : '',
    name: updated.name || '',
    email: updated.email || '',
    phone: updated.phone || '',
    tags: updated.tags || [],
    emailOptOut: Boolean(updated.emailOptOut),
    smsOptOut: Boolean(updated.smsOptOut),
    whatsappOptOut: Boolean(updated.whatsappOptOut),
    emailOptOutAt: updated.emailOptOutAt || null,
    smsOptOutAt: updated.smsOptOutAt || null,
    whatsappOptOutAt: updated.whatsappOptOutAt || null,
    lastCampaignAt: updated.lastCampaignAt || null
  };
};

export const unsubscribeAudienceEmailByToken = async (token) => {
  const email = verifyAudienceUnsubscribeToken(token);

  const updated = await AudiencePreference.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        emailOptOut: true,
        emailOptOutAt: new Date()
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
    email: updated.email
  };
};

export const trackAudienceCampaignOpenByToken = async ({
  token,
  userAgent = ''
}) => {
  const { campaignId, recipientId } = verifyTrackingToken(token, 'open');
  const recipient = await AudienceCampaignRecipient.findOne({
    _id: recipientId,
    campaignId
  });

  if (!recipient) {
    return { tracked: false };
  }

  const firstOpen = !recipient.openedAt;
  const now = new Date();

  await AudienceCampaignRecipient.findByIdAndUpdate(recipient._id, {
    $set: {
      openedAt: recipient.openedAt || now,
      lastOpenedAt: now,
      lastOpenUserAgent: normalizeText(userAgent),
      deviceType: detectDeviceType(userAgent),
      browserName: detectBrowserName(userAgent)
    },
    $inc: {
      openCount: 1
    }
  });

  await updateCampaignSummaryFromRecipient({
    campaignId,
    incrementField: 'openCount',
    whenFirstEvent: firstOpen
  });

  return {
    tracked: true
  };
};

export const trackAudienceCampaignClickByToken = async ({
  token,
  userAgent = ''
}) => {
  const { campaignId, recipientId, url } = verifyTrackingToken(token, 'click');
  const recipient = await AudienceCampaignRecipient.findOne({
    _id: recipientId,
    campaignId
  });

  if (!recipient) {
    return { tracked: false, redirectUrl: url || '' };
  }

  const firstClick = !recipient.clickedAt;
  const now = new Date();

  await AudienceCampaignRecipient.findByIdAndUpdate(recipient._id, {
    $set: {
      clickedAt: recipient.clickedAt || now,
      lastClickedAt: now,
      lastClickedUrl: normalizeText(url),
      lastClickUserAgent: normalizeText(userAgent),
      deviceType: recipient.deviceType || detectDeviceType(userAgent),
      browserName: recipient.browserName || detectBrowserName(userAgent)
    },
    $inc: {
      clickCount: 1
    }
  });

  await updateCampaignSummaryFromRecipient({
    campaignId,
    incrementField: 'clickCount',
    whenFirstEvent: firstClick
  });

  return {
    tracked: true,
    redirectUrl: normalizeText(url)
  };
};

export const getCampaignTrackingPixel = () => TRACKING_PIXEL_BUFFER;

export const startAudienceCampaignScheduler = () => {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;
  schedulerTimer = setInterval(() => {
    void runScheduledAudienceCampaigns();
  }, SCHEDULER_INTERVAL_MS);

  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }

  void runScheduledAudienceCampaigns();
};
