import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const splitCsv = (value) =>
  (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

dotenv.config({
  path: path.resolve(currentDir, '../../.env')
});

const googleClientIds = Array.from(
  new Set(splitCsv([process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_IDS].filter(Boolean).join(',')))
);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tricore-events',
  mongoAllowMemoryFallback: process.env.MONGODB_ALLOW_MEMORY_FALLBACK === 'true',
  mongoServerSelectionTimeoutMs: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 10000),
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  googleClientId: googleClientIds[0] || '',
  googleClientIds,
  contactForwardEmails: splitCsv(process.env.CONTACT_FORWARD_EMAILS),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || '',
  smtpFromName: process.env.SMTP_FROM_NAME || 'TriCore Events',
  smtpToRecipients: splitCsv(process.env.SMTP_TO_RECIPIENTS),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || ''
};
