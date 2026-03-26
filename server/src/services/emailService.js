import nodemailer from 'nodemailer';

import { getEmailSettingsForSending } from './emailSettingsService.js';

let cachedKey = '';
let cachedTransporter = null;

const buildTransportKey = (config) =>
  JSON.stringify({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: Boolean(config.smtpSecure),
    user: config.smtpUser,
    pass: config.smtpPass ? '***' : ''
  });

const buildFromHeader = (config) => {
  if (!config.smtpFromEmail) return '';
  if (config.smtpFromName) {
    return `"${config.smtpFromName}" <${config.smtpFromEmail}>`;
  }
  return config.smtpFromEmail;
};

export const isMailTransportConfigured = (config) => {
  if (!config.smtpHost || !config.smtpPort || !config.smtpFromEmail) return false;

  const hasUser = Boolean(config.smtpUser);
  const hasPass = Boolean(config.smtpPass);
  if (hasUser !== hasPass) return false;

  return true;
};

export const getMailTransportSummary = async () => {
  const config = await getEmailSettingsForSending();
  return {
    smtpReady: isMailTransportConfigured(config),
    smtpFromEmail: config.smtpFromEmail,
    smtpFromName: config.smtpFromName
  };
};

export const getMailer = async () => {
  const config = await getEmailSettingsForSending();

  if (!isMailTransportConfigured(config)) {
    throw new Error('SMTP email is not configured on the server.');
  }

  const nextKey = buildTransportKey(config);
  if (cachedTransporter && cachedKey === nextKey) {
    return { transporter: cachedTransporter, config };
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: Boolean(config.smtpSecure),
    auth:
      config.smtpUser && config.smtpPass
        ? {
            user: config.smtpUser,
            pass: config.smtpPass
          }
        : undefined
  });
  cachedKey = nextKey;

  return { transporter: cachedTransporter, config };
};

export const sendEmail = async ({ attachments, html, replyTo, subject, text, to }) => {
  const { transporter, config } = await getMailer();

  await transporter.sendMail({
    from: buildFromHeader(config),
    to: Array.isArray(to) ? to.join(', ') : to,
    replyTo,
    subject,
    text,
    html,
    attachments
  });
};
