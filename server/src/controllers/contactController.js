import { ContactInquiry } from '../models/ContactInquiry.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendContactForwardingEmail, isMailTransportConfigured } from '../services/contactNotificationService.js';
import { getContactForwardingSettings } from '../services/contactSettingsService.js';
import {
  buildContactInquiryAlertFingerprint,
  emitAdminAlert
} from '../services/securityAlertService.js';

const normalizeInquiryPayload = (payload) => ({
  name: payload.name.trim(),
  email: payload.email.trim().toLowerCase(),
  phone: payload.phone?.trim() || '',
  message: payload.message.trim()
});

const buildContactInquiryAlertCandidate = (inquiry, severity = 'high', notifyByEmail = false) => ({
  fingerprint: buildContactInquiryAlertFingerprint({ inquiryId: inquiry._id }),
  type: 'contact_submission',
  category: 'contact',
  severity,
  title:
    severity === 'critical'
      ? 'Contact submission needs admin attention'
      : 'New Contact Us submission received',
  message:
    severity === 'critical'
      ? `${inquiry.name} (${inquiry.email}) submitted a contact request and forwarding needs admin attention.`
      : `${inquiry.name} (${inquiry.email}) submitted a new message through Contact Us.`,
  metadata: {
    inquiryId: inquiry._id.toString(),
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone || '',
    forwardingStatus: inquiry.forwardingStatus,
    forwardedTo: inquiry.forwardedTo,
    messagePreview: inquiry.message.slice(0, 160),
    sourceIp: inquiry.sourceIp || '-'
  },
  subjectId: inquiry._id.toString(),
  subjectType: 'contact_inquiry',
  notifyByEmail
});

export const submitContactInquiry = asyncHandler(async (req, res) => {
  const inquiryPayload = normalizeInquiryPayload(req.body);
  const settings = await getContactForwardingSettings();
  const recipients = settings.contactInquiryEmails;

  const inquiry = await ContactInquiry.create({
    ...inquiryPayload,
    forwardedTo: recipients,
    forwardingStatus: recipients.length ? 'pending' : 'not_configured',
    sourceIp: req.ip || '',
    userAgent: req.get('user-agent') || ''
  });

  if (!recipients.length) {
    inquiry.forwardingError = 'No forwarding recipients are configured.';
    await inquiry.save();
    await emitAdminAlert(
      buildContactInquiryAlertCandidate(inquiry, 'critical', true)
    );

    throw new ApiError(
      503,
      'Your message was saved, but no contact forwarding emails are configured yet.'
    );
  }

  if (!(await isMailTransportConfigured())) {
    inquiry.forwardingStatus = 'failed';
    inquiry.forwardingError = 'SMTP email forwarding is not configured on the server.';
    await inquiry.save();
    await emitAdminAlert(
      buildContactInquiryAlertCandidate(inquiry, 'critical', true)
    );

    throw new ApiError(
      503,
      'Your message was saved, but email forwarding is not configured yet.'
    );
  }

  try {
    await sendContactForwardingEmail({
      inquiry: inquiryPayload,
      recipients
    });

    inquiry.forwardingStatus = 'sent';
    inquiry.forwardedAt = new Date();
    inquiry.forwardingError = '';
    await inquiry.save();
  } catch (error) {
    inquiry.forwardingStatus = 'failed';
    inquiry.forwardingError = error.message || 'Email forwarding failed.';
    await inquiry.save();
    await emitAdminAlert(
      buildContactInquiryAlertCandidate(inquiry, 'critical', true)
    );

    throw new ApiError(
      503,
      'Your message was saved, but forwarding email delivery failed. The admin team can still review it in the portal.'
    );
  }

  await emitAdminAlert(buildContactInquiryAlertCandidate(inquiry, 'high', false));

  res.status(201).json({
    success: true,
    message: 'Your message was sent to the TriCore team.',
    data: {
      inquiryId: inquiry._id,
      forwardingStatus: inquiry.forwardingStatus
    }
  });
});

export const getContactInquiries = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(Number(req.query.limit || 50), 100);
  const skip = (page - 1) * limit;

  const [totalCount, inquiries] = await Promise.all([
    ContactInquiry.countDocuments(),
    ContactInquiry.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);

  res.json({
    success: true,
    data: {
      items: inquiries,
      totalCount,
      page,
      limit
    }
  });
});
