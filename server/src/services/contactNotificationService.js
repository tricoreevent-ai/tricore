import { getEmailSettingsForSending } from './emailSettingsService.js';
import { getMailTransportSummary, isMailTransportConfigured as isMailConfigured, sendEmail } from './emailService.js';

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const isMailTransportConfigured = async () => {
  const config = await getEmailSettingsForSending();
  return isMailConfigured(config);
};

export { getMailTransportSummary };

export const sendContactForwardingEmail = async ({ inquiry, recipients }) => {
  const htmlMessage = inquiry.message
    .split(/\r?\n/)
    .map((line) => escapeHtml(line))
    .join('<br />');

  await sendEmail({
    to: recipients,
    replyTo: inquiry.email,
    subject: `New TriCore contact enquiry from ${inquiry.name}`,
    text: [
      'A new contact enquiry was submitted on TriCore Events.',
      '',
      `Name: ${inquiry.name}`,
      `Email: ${inquiry.email}`,
      `Phone: ${inquiry.phone || '-'}`,
      '',
      'Message:',
      inquiry.message
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <h2 style="margin-bottom: 16px;">New TriCore contact enquiry</h2>
        <p style="margin: 0 0 8px;"><strong>Name:</strong> ${escapeHtml(inquiry.name)}</p>
        <p style="margin: 0 0 8px;"><strong>Email:</strong> ${escapeHtml(inquiry.email)}</p>
        <p style="margin: 0 0 8px;"><strong>Phone:</strong> ${escapeHtml(inquiry.phone || '-')}</p>
        <p style="margin: 16px 0 8px;"><strong>Message:</strong></p>
        <div style="padding: 16px; border-radius: 12px; background: #f8fafc; line-height: 1.6;">
          ${htmlMessage}
        </div>
      </div>
    `
  });
};
