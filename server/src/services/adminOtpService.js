import crypto from 'node:crypto';

import { AdminOtpChallenge } from '../models/AdminOtpChallenge.js';
import { ApiError } from '../utils/ApiError.js';
import { sendEmail } from './emailService.js';
import { getTransactionOtpSettingsForEnforcement } from './transactionOtpSettingsService.js';

const OTP_EXPIRY_MINUTES = 10;

const hashOtp = (code) =>
  crypto.createHash('sha256').update(String(code || '').trim()).digest('hex');

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const getOtpExpiry = () => new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

export const requestAdminOtp = async ({
  purpose,
  resourceId,
  resourceLabel,
  resourceType,
  requestedBy
}) => {
  const settings = await getTransactionOtpSettingsForEnforcement();
  const targetEmail = settings.effectiveRecipientEmail;

  if (!targetEmail) {
    throw new ApiError(
      400,
      'An OTP recipient email address is required before transaction approval can be used.'
    );
  }

  const code = generateOtpCode();
  const expiresAt = getOtpExpiry();

  await AdminOtpChallenge.deleteMany({
    purpose,
    resourceType,
    resourceId,
    requestedBy,
    consumedAt: null
  });

  await AdminOtpChallenge.create({
    purpose,
    resourceType,
    resourceId,
    requestedBy,
    targetEmail,
    codeHash: hashOtp(code),
    expiresAt
  });

  await sendEmail({
    to: targetEmail,
    subject: 'TriCore Events OTP Approval Code',
    text: [
      `An OTP was requested for ${resourceLabel}.`,
      '',
      `Approval code: ${code}`,
      `Valid for: ${OTP_EXPIRY_MINUTES} minutes`,
      '',
      'If you did not expect this request, review the admin portal activity immediately.'
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <h2 style="margin-bottom: 16px;">TriCore Events OTP Approval Code</h2>
        <p style="margin: 0 0 12px;">An OTP was requested for <strong>${resourceLabel}</strong>.</p>
        <p style="margin: 0 0 12px; font-size: 24px; font-weight: 700; letter-spacing: 0.18em;">${code}</p>
        <p style="margin: 0 0 12px;">This code is valid for ${OTP_EXPIRY_MINUTES} minutes.</p>
        <p style="margin: 0;">If you did not expect this request, review the admin portal activity immediately.</p>
      </div>
    `
  });

  return {
    email: targetEmail,
    expiresAt: expiresAt.toISOString()
  };
};

export const verifyAdminOtp = async ({
  code,
  purpose,
  requestedBy,
  resourceId,
  resourceType
}) => {
  const normalizedCode = String(code || '').trim();

  if (!normalizedCode) {
    throw new ApiError(400, 'OTP code is required.');
  }

  const challenge = await AdminOtpChallenge.findOne({
    purpose,
    resourceType,
    resourceId,
    requestedBy,
    consumedAt: null,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!challenge) {
    throw new ApiError(400, 'Request a fresh OTP code before attempting this action.');
  }

  if (challenge.codeHash !== hashOtp(normalizedCode)) {
    challenge.attemptCount += 1;
    await challenge.save();
    throw new ApiError(400, 'The OTP code is invalid.');
  }

  challenge.consumedAt = new Date();
  await challenge.save();

  return challenge;
};
