import { sendEmail } from './emailService.js';
import { buildPublicEventUrl } from './publicSiteSettingsService.js';

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateValue = (value, options = {}) => {
  if (!value) {
    return '-';
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

const formatDateWindow = (event) => {
  const startValue = formatDateValue(event?.startDate);
  const endValue = formatDateValue(event?.endDate);

  return startValue === endValue ? startValue : `${startValue} to ${endValue}`;
};

const formatCurrency = (amount) => `Rs.${Number(amount || 0).toFixed(0)}`;

const buildEventInterestEmailTemplate = async ({
  customMessage = '',
  event,
  heading,
  intro,
  subject
}) => {
  const registrationLink = await buildPublicEventUrl(event);
  const eventLines = [
    `Event: ${event?.name || '-'}`,
    `Venue: ${event?.venue || '-'}`,
    `Dates: ${formatDateWindow(event)}`,
    `Registration opens: ${formatDateValue(event?.registrationStartDate, {
      hour: 'numeric',
      minute: '2-digit'
    })}`,
    `Registration deadline: ${formatDateValue(event?.registrationDeadline)}`,
    `Entry fee: ${formatCurrency(event?.entryFee)}`,
    `Registration link: ${registrationLink}`
  ];

  return {
    registrationLink,
    subject,
    textBuilder: (interest) =>
      [
        `Hi ${interest.name || 'there'},`,
        '',
        intro,
        '',
        ...(customMessage ? [customMessage, ''] : []),
        ...eventLines,
        '',
        event?.description || 'Register early to reserve your spot in the next TriCore event.'
      ].join('\n'),
    htmlBuilder: (interest) => `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <h2 style="margin: 0 0 12px;">${escapeHtml(heading)}</h2>
        <p style="margin: 0 0 12px;">Hi ${escapeHtml(interest.name || 'there')},</p>
        <p style="margin: 0 0 12px;">${escapeHtml(intro)}</p>
        ${
          customMessage
            ? `<div style="margin: 0 0 16px; padding: 14px; border-radius: 14px; background: #f8fafc; line-height: 1.6;">${escapeHtml(
                customMessage
              )}</div>`
            : ''
        }
        <div style="margin: 0 0 16px; padding: 18px; border-radius: 18px; background: #eff6ff;">
          <p style="margin: 0 0 8px;"><strong>${escapeHtml(event?.name || '-')}</strong></p>
          <p style="margin: 0 0 6px;"><strong>Venue:</strong> ${escapeHtml(event?.venue || '-')}</p>
          <p style="margin: 0 0 6px;"><strong>Dates:</strong> ${escapeHtml(formatDateWindow(event))}</p>
          <p style="margin: 0 0 6px;"><strong>Registration opens:</strong> ${escapeHtml(
            formatDateValue(event?.registrationStartDate, {
              hour: 'numeric',
              minute: '2-digit'
            })
          )}</p>
          <p style="margin: 0 0 6px;"><strong>Registration deadline:</strong> ${escapeHtml(
            formatDateValue(event?.registrationDeadline)
          )}</p>
          <p style="margin: 0;"><strong>Entry fee:</strong> ${escapeHtml(formatCurrency(event?.entryFee))}</p>
        </div>
        ${
          event?.description
            ? `<p style="margin: 0 0 16px; line-height: 1.7;">${escapeHtml(event.description)}</p>`
            : ''
        }
        <a
          href="${escapeHtml(registrationLink)}"
          style="display: inline-block; padding: 12px 20px; border-radius: 999px; background: #f97316; color: white; text-decoration: none; font-weight: 700;"
        >
          Register Now
        </a>
        <p style="margin: 16px 0 0; font-size: 13px; color: #475569;">
          Registration link: ${escapeHtml(registrationLink)}
        </p>
      </div>
    `
  };
};

export const sendRegistrationOpeningInterestEmails = async ({ event, interests }) => {
  const template = await buildEventInterestEmailTemplate({
    event,
    heading: 'Registration is now open',
    intro: `Registration is now open for ${event?.name || 'your TriCore event'}. Use the link below to complete your registration.`,
    subject: `Registration Open: ${event?.name || 'TriCore Event'}`
  });
  const results = await Promise.allSettled(
    interests.map((interest) =>
      sendEmail({
        to: interest.email,
        subject: template.subject,
        text: template.textBuilder(interest),
        html: template.htmlBuilder(interest)
      })
    )
  );

  return {
    registrationLink: template.registrationLink,
    sentIds: results
      .map((result, index) => (result.status === 'fulfilled' ? interests[index]._id : null))
      .filter(Boolean),
    failed: results
      .map((result, index) =>
        result.status === 'rejected'
          ? {
              interestId: interests[index]._id,
              email: interests[index].email,
              error: result.reason?.message || 'Email send failed.'
            }
          : null
      )
      .filter(Boolean)
  };
};

export const sendManualEventInterestEmails = async ({
  customMessage = '',
  event,
  interests
}) => {
  const template = await buildEventInterestEmailTemplate({
    customMessage,
    event,
    heading: 'TriCore event update',
    intro: `Here is an event update for ${event?.name || 'your TriCore event'}. Use the registration link below when you are ready.`,
    subject: `TriCore Event Update: ${event?.name || 'TriCore Event'}`
  });
  const results = await Promise.allSettled(
    interests.map((interest) =>
      sendEmail({
        to: interest.email,
        subject: template.subject,
        text: template.textBuilder(interest),
        html: template.htmlBuilder(interest)
      })
    )
  );

  return {
    registrationLink: template.registrationLink,
    sentIds: results
      .map((result, index) => (result.status === 'fulfilled' ? interests[index]._id : null))
      .filter(Boolean),
    failed: results
      .map((result, index) =>
        result.status === 'rejected'
          ? {
              interestId: interests[index]._id,
              email: interests[index].email,
              error: result.reason?.message || 'Email send failed.'
            }
          : null
      )
      .filter(Boolean)
  };
};
