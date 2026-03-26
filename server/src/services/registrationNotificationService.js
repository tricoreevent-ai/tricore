import { env } from '../config/env.js';
import { sendEmail } from './emailService.js';
import { getContactForwardingSettings } from './contactSettingsService.js';
import { getEmailSettingsForSending } from './emailSettingsService.js';
import { getPaymentSettings } from './paymentSettingsService.js';
import { normalizePaymentStatus } from './paymentStatusService.js';

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (amount) => `Rs.${Number(amount || 0).toFixed(0)}`;

const formatDateValue = (value) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatEventDateWindow = (event) => {
  if (!event?.startDate) {
    return '-';
  }

  const startDate = formatDateValue(event.startDate);
  const endDate = event.endDate ? formatDateValue(event.endDate) : startDate;

  return startDate === endDate ? startDate : `${startDate} to ${endDate}`;
};

const safeSend = async (payload) => {
  try {
    await sendEmail(payload);
  } catch (error) {
    console.warn('Email send warning:', error);
  }
};

const getRegistrantLabel = (registration) =>
  registration.teamName || registration.name || 'Registration';

const getPlayerLines = (registration) =>
  Array.isArray(registration?.players)
    ? registration.players
        .map((player, index) => `${index + 1}. ${player.name}${player.phone ? ` (${player.phone})` : ''}`)
        .filter(Boolean)
    : [];

const normalizeRecipients = (value) =>
  Array.from(
    new Set(
      String(value || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
    )
  );

const mergeRecipientLists = (...lists) =>
  Array.from(
    new Set(
      lists
        .flat()
        .map((email) => String(email || '').trim().toLowerCase())
        .filter(Boolean)
    )
  );

const buildRegistrationSummaryLines = ({ event, payment, registration, includePlayers = false }) => {
  const registrant = getRegistrantLabel(registration);
  const paymentStatus = normalizePaymentStatus(payment?.status);
  const playerLines = getPlayerLines(registration);

  return [
    `Event: ${event?.name || '-'}`,
    `Event Dates: ${formatEventDateWindow(event)}`,
    `Registrant: ${registrant}`,
    `Captain: ${registration.captainName || '-'}`,
    `Email: ${registration.email}`,
    `Primary Phone: ${registration.phone1}`,
    `Secondary Phone: ${registration.phone2}`,
    `Address: ${registration.address}`,
    payment?.amount ? `Amount: ${formatCurrency(payment.amount)}` : 'Amount: Rs.0',
    `Payment Status: ${paymentStatus}`,
    `Payment Method: ${payment?.method || (payment?.amount ? 'manual' : 'free')}`,
    payment?.manualReference ? `Reference: ${payment.manualReference}` : ''
  ]
    .concat(includePlayers && playerLines.length ? ['Players:', ...playerLines] : [])
    .filter(Boolean);
};

const buildReceiptAttachment = (payment) => {
  const receipt = String(payment?.receipt || '').trim();
  if (!receipt.startsWith('data:')) {
    return [];
  }

  const match = receipt.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    return [];
  }

  const mimeType = match[1];
  const base64Content = match[2];
  const extension = mimeType.split('/')[1] || 'png';

  return [
    {
      filename: payment?.receiptFilename || `payment-proof.${extension}`,
      content: base64Content,
      encoding: 'base64',
      contentType: mimeType
    }
  ];
};

const getProofRecipients = async () => {
  const [paymentSettings, emailSettings, contactSettings] = await Promise.all([
    getPaymentSettings(),
    getEmailSettingsForSending(),
    getContactForwardingSettings()
  ]);

  const configured = normalizeRecipients(paymentSettings.paymentProofRecipientEmail);
  if (configured.length) {
    return configured;
  }

  return mergeRecipientLists(
    contactSettings.registrationFollowUpEmails,
    Array.isArray(emailSettings.toRecipients) ? emailSettings.toRecipients : []
  );
};

// Route completed and follow-up registration emails through dedicated settings lists,
// while keeping the legacy SMTP recipient list as a final fallback.
const getRegistrationNotificationRecipients = async (audience) => {
  const [contactSettings, emailSettings] = await Promise.all([
    getContactForwardingSettings(),
    getEmailSettingsForSending()
  ]);
  const fallbackRecipients = Array.isArray(emailSettings.toRecipients) ? emailSettings.toRecipients : [];

  if (audience === 'completed') {
    return mergeRecipientLists(contactSettings.registrationCompletedEmails, fallbackRecipients);
  }

  return mergeRecipientLists(contactSettings.registrationFollowUpEmails, fallbackRecipients);
};

export const notifyRegistrationCreated = async ({ event, payment, registration }) => {
  const registrant = getRegistrantLabel(registration);
  const paymentStatus = normalizePaymentStatus(payment?.status);
  const eventName = event?.name || 'Event';
  const adminRecipients = await getRegistrationNotificationRecipients(
    paymentStatus === 'Confirmed' ? 'completed' : 'followUp'
  );

  const summaryLines = buildRegistrationSummaryLines({ event, payment, registration });

  if (adminRecipients.length) {
    await safeSend({
      to: adminRecipients,
      subject: `New Registration: ${registrant} (${eventName})`,
      text: summaryLines.join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2 style="margin-bottom: 16px;">New Registration Received</h2>
          <p style="margin: 0 0 8px;"><strong>Payment:</strong> ${escapeHtml(paymentStatus)}</p>
          <ul style="margin: 12px 0 0; padding-left: 18px;">
            ${summaryLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
          </ul>
        </div>
      `
    });
  }

  if (registration.email) {
    const isConfirmed = paymentStatus === 'Confirmed';

    await safeSend({
      to: registration.email,
      subject: isConfirmed
        ? `Registration Confirmed: ${eventName}`
        : `Registration Received (${paymentStatus}): ${eventName}`,
      text: [
        `Hi ${registrant},`,
        '',
        `Your registration for \"${eventName}\" has been received.`,
        `Payment status: ${paymentStatus}.`,
        '',
        ...summaryLines,
        '',
        `Portal: ${env.clientUrl}`
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2 style="margin-bottom: 12px;">${escapeHtml(eventName)}</h2>
          <p style="margin: 0 0 12px;">Registration status: <strong>${escapeHtml(paymentStatus)}</strong></p>
          <p style="margin: 0 0 12px;">We have received your registration for <strong>${escapeHtml(registrant)}</strong>.</p>
          <ul style="margin: 12px 0 0; padding-left: 18px;">
            ${summaryLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
          </ul>
        </div>
      `
    });
  }
};

export const notifyManualPaymentSubmitted = async ({ event, payment, registration }) => {
  const recipients = await getProofRecipients();

  if (!recipients.length) {
    return;
  }

  const registrant = getRegistrantLabel(registration);
  const eventName = event?.name || 'Event';
  const summaryLines = buildRegistrationSummaryLines({
    event,
    payment,
    registration,
    includePlayers: true
  });

  await safeSend({
    to: recipients,
    subject: `Payment Proof Submitted: ${registrant} (${eventName})`,
    text: [
      'A manual payment proof was submitted and is ready for admin review.',
      '',
      ...summaryLines
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <h2 style="margin-bottom: 12px;">Manual Payment Proof Submitted</h2>
        <p style="margin: 0 0 12px;">Please review the attached payment receipt.</p>
        <ul style="margin: 12px 0 0; padding-left: 18px;">
          ${summaryLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
        </ul>
      </div>
    `,
    attachments: buildReceiptAttachment(payment)
  });
};

export const notifyPaymentConfirmed = async ({ event, payment, registration }) => {
  const registrant = getRegistrantLabel(registration);
  const eventName = event?.name || 'Event';
  const playerLines = getPlayerLines(registration);
  const adminRecipients = await getRegistrationNotificationRecipients('completed');
  const summaryLines = buildRegistrationSummaryLines({
    event,
    payment,
    registration,
    includePlayers: true
  });
  const followUpNote =
    'Tricore will soon update and communicate the match schedule via email.';

  if (adminRecipients.length) {
    await safeSend({
      to: adminRecipients,
      subject: `Payment Confirmed: ${registrant} (${eventName})`,
      text: summaryLines.join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2 style="margin-bottom: 16px;">Payment Confirmed</h2>
          <ul style="margin: 12px 0 0; padding-left: 18px;">
            ${summaryLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
          </ul>
        </div>
      `
    });
  }

  if (registration.email) {
    await safeSend({
      to: registration.email,
      subject: `Payment Confirmed: ${eventName}`,
      text: [
        `Hi ${registrant},`,
        '',
        `Your payment for \"${eventName}\" has been confirmed by admin.`,
        `Event date: ${formatEventDateWindow(event)}.`,
        '',
        'Registered players:',
        ...(playerLines.length ? playerLines : ['No player roster shared yet.']),
        '',
        ...summaryLines,
        '',
        followUpNote
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2 style="margin-bottom: 12px;">Payment Confirmed</h2>
          <p style="margin: 0 0 12px;">Your payment for <strong>${escapeHtml(eventName)}</strong> has been confirmed.</p>
          <p style="margin: 0 0 12px;"><strong>Event date:</strong> ${escapeHtml(formatEventDateWindow(event))}</p>
          <p style="margin: 0 0 8px;"><strong>Registered players:</strong></p>
          <ul style="margin: 0 0 12px; padding-left: 18px;">
            ${(playerLines.length ? playerLines : ['No player roster shared yet.'])
              .map((line) => `<li>${escapeHtml(line)}</li>`)
              .join('')}
          </ul>
          <ul style="margin: 12px 0 0; padding-left: 18px;">
            ${summaryLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
          </ul>
          <p style="margin: 16px 0 0; font-weight: 600;">${escapeHtml(followUpNote)}</p>
        </div>
      `
    });
  }
};
