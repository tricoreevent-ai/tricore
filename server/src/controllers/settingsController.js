import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getBackupSettings,
  recordBackupDeliveryResult,
  updateBackupSettings
} from '../services/backupSettingsService.js';
import {
  buildApplicationBackup,
  emailApplicationBackup,
  restoreApplicationBackup
} from '../services/backupService.js';
import { getMailTransportSummary } from '../services/contactNotificationService.js';
import {
  getContactForwardingSettings,
  updateContactForwardingSettings
} from '../services/contactSettingsService.js';
import { getEmailSettings, updateEmailSettings } from '../services/emailSettingsService.js';
import { sendEmail } from '../services/emailService.js';
import {
  getHomeBannerSettings,
  getPublicHomeBanners,
  updateHomeBannerSettings
} from '../services/homeBannerService.js';
import {
  getHomePageContent,
  getPublicHomePageContent,
  updateHomePageContent
} from '../services/homePageContentService.js';
import {
  getPublicSiteSettings,
  updatePublicSiteSettings
} from '../services/publicSiteSettingsService.js';
import {
  getPaymentSettings,
  getPublicPaymentSettings,
  updatePaymentSettings
} from '../services/paymentSettingsService.js';
import {
  getInvoiceSettings,
  updateInvoiceSettings
} from '../services/invoiceSettingsService.js';
import {
  getTransactionOtpSettings,
  updateTransactionOtpSettings
} from '../services/transactionOtpSettingsService.js';

const buildContactForwardingResponse = (settings, transportSummary) => ({
  ...settings,
  ...transportSummary,
  forwardingEnabled: Boolean(settings.contactInquiryEmails.length) && transportSummary.smtpReady
});

export const getContactForwarding = asyncHandler(async (_req, res) => {
  const settings = await getContactForwardingSettings();
  const transportSummary = await getMailTransportSummary();

  res.json({
    success: true,
    data: buildContactForwardingResponse(settings, transportSummary)
  });
});

export const saveContactForwarding = asyncHandler(async (req, res) => {
  const settings = await updateContactForwardingSettings({
    emails: req.body.emails,
    contactInquiryEmails: req.body.contactInquiryEmails,
    registrationCompletedEmails: req.body.registrationCompletedEmails,
    registrationFollowUpEmails: req.body.registrationFollowUpEmails,
    userId: req.user._id
  });
  const transportSummary = await getMailTransportSummary();

  res.json({
    success: true,
    message: 'Contact forwarding settings updated successfully.',
    data: buildContactForwardingResponse(settings, transportSummary)
  });
});

export const getInvoiceConfiguration = asyncHandler(async (_req, res) => {
  const settings = await getInvoiceSettings();

  res.json({
    success: true,
    data: settings
  });
});

export const saveInvoiceConfiguration = asyncHandler(async (req, res) => {
  const settings = await updateInvoiceSettings({
    payload: req.body,
    userId: req.user._id
  });

  res.json({
    success: true,
    message: 'Invoice settings updated successfully.',
    data: settings
  });
});

export const getEmailConfiguration = asyncHandler(async (_req, res) => {
  const [settings, transportSummary] = await Promise.all([
    getEmailSettings(),
    getMailTransportSummary()
  ]);

  res.json({
    success: true,
    data: {
      ...settings,
      ...transportSummary
    }
  });
});

export const saveEmailConfiguration = asyncHandler(async (req, res) => {
  const settings = await updateEmailSettings({
    payload: req.body,
    userId: req.user._id
  });
  const transportSummary = await getMailTransportSummary();

  res.json({
    success: true,
    message: 'Email settings updated successfully.',
    data: {
      ...settings,
      ...transportSummary
    }
  });
});

export const getBackupConfiguration = asyncHandler(async (_req, res) => {
  const settings = await getBackupSettings();

  res.json({
    success: true,
    data: settings
  });
});

export const saveBackupConfiguration = asyncHandler(async (req, res) => {
  const settings = await updateBackupSettings({
    payload: req.body,
    userId: req.user._id
  });

  res.json({
    success: true,
    message: 'Backup settings updated successfully.',
    data: settings
  });
});

export const getTransactionOtpConfiguration = asyncHandler(async (_req, res) => {
  const settings = await getTransactionOtpSettings();

  res.json({
    success: true,
    data: settings
  });
});

export const saveTransactionOtpConfiguration = asyncHandler(async (req, res) => {
  const settings = await updateTransactionOtpSettings({
    payload: req.body,
    userId: req.user._id
  });

  res.json({
    success: true,
    message: 'Transaction OTP settings updated successfully.',
    data: settings
  });
});

export const sendBackupNow = asyncHandler(async (req, res) => {
  const result = await emailApplicationBackup({
    email: req.body.email,
    triggeredBy: 'manual',
    userId: req.user._id
  });
  const settings = await getBackupSettings();

  res.json({
    success: true,
    message: `Backup emailed to ${result.email}.`,
    data: settings
  });
});

export const downloadBackupNow = asyncHandler(async (req, res) => {
  const backup = await buildApplicationBackup();
  await recordBackupDeliveryResult({
    attemptedAt: new Date().toISOString(),
    downloadedAt: new Date().toISOString(),
    sentAt: '',
    status: 'downloaded',
    error: '',
    fileName: backup.fileName,
    triggeredBy: 'download',
    userId: req.user._id
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${backup.fileName}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(backup.content);
});

export const restoreBackupNow = asyncHandler(async (req, res) => {
  const result = await restoreApplicationBackup({
    content: req.body.content,
    fileName: req.body.fileName,
    triggeredBy: 'restore',
    userId: req.user._id
  });
  const settings = await getBackupSettings();

  res.json({
    success: true,
    message: `Backup restored from ${result.fileName || 'uploaded file'}.`,
    data: settings
  });
});

export const sendTestEmail = asyncHandler(async (req, res) => {
  const to = req.body.to || req.user?.email || '';

  await sendEmail({
    to,
    subject: 'TriCore Events: Test Email',
    text: [
      'This is a test email from TriCore Events.',
      '',
      'If you received this message, SMTP is configured correctly.'
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <h2 style="margin-bottom: 16px;">TriCore Events Test Email</h2>
        <p style="margin: 0 0 12px;">This is a test email from TriCore Events.</p>
        <p style="margin: 0;">If you received this message, SMTP is configured correctly.</p>
      </div>
    `
  });

  res.json({
    success: true,
    message: `Test email sent to ${to}.`
  });
});

export const getPaymentConfiguration = asyncHandler(async (_req, res) => {
  const settings = await getPaymentSettings();

  res.json({
    success: true,
    data: settings
  });
});

export const savePaymentConfiguration = asyncHandler(async (req, res) => {
  const settings = await updatePaymentSettings({
    payload: req.body,
    userId: req.user._id
  });

  res.json({
    success: true,
    message: 'Payment settings updated successfully.',
    data: settings
  });
});

export const getHomeBannerConfiguration = asyncHandler(async (_req, res) => {
  const settings = await getHomeBannerSettings();

  res.json({
    success: true,
    data: settings
  });
});

export const saveHomeBannerConfiguration = asyncHandler(async (req, res) => {
  const settings = await updateHomeBannerSettings({
    payload: req.body,
    userId: req.user._id
  });

  res.json({
    success: true,
    message: 'Home banners updated successfully.',
    data: settings
  });
});

export const getHomePageConfiguration = asyncHandler(async (_req, res) => {
  const settings = await getHomePageContent();

  res.json({
    success: true,
    data: settings
  });
});

export const saveHomePageConfiguration = asyncHandler(async (req, res) => {
  const settings = await updateHomePageContent({
    payload: req.body,
    userId: req.user._id
  });

  res.json({
    success: true,
    message: 'Home page content updated successfully.',
    data: settings
  });
});

export const getPublicSiteConfiguration = asyncHandler(async (_req, res) => {
  const settings = await getPublicSiteSettings();

  res.json({
    success: true,
    data: settings
  });
});

export const savePublicSiteConfiguration = asyncHandler(async (req, res) => {
  const settings = await updatePublicSiteSettings({
    payload: req.body,
    userId: req.user._id
  });

  res.json({
    success: true,
    message: 'Website settings updated successfully.',
    data: settings
  });
});

export const getPublicPaymentConfiguration = asyncHandler(async (_req, res) => {
  const settings = await getPublicPaymentSettings();

  res.json({
    success: true,
    data: settings
  });
});

export const getPublicHomeBannerConfiguration = asyncHandler(async (_req, res) => {
  const settings = await getPublicHomeBanners();

  res.json({
    success: true,
    data: settings
  });
});

export const getPublicHomePageConfiguration = asyncHandler(async (_req, res) => {
  const settings = await getPublicHomePageContent();

  res.json({
    success: true,
    data: settings
  });
});
