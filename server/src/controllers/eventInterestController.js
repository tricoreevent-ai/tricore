import { recordActivity } from '../services/activityLogService.js';
import {
  buildEventInterestSummary,
  ensureNotifyLaterAvailableForEvent,
  getAdminEventById,
  getEventInterests,
  getPublicEventByIdForInterest,
  markEventInterestNotifications,
  resolveEventInterestAudience,
  upsertEventInterest
} from '../services/eventInterestService.js';
import {
  sendManualEventInterestEmails
} from '../services/eventInterestNotificationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const createEventInterest = asyncHandler(async (req, res) => {
  const event = await getPublicEventByIdForInterest(req.params.id);
  ensureNotifyLaterAvailableForEvent(event);

  const { created, interest } = await upsertEventInterest({
    eventId: event._id,
    userId: req.user?._id || null,
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone
  });

  await recordActivity({
    action: created ? 'create_interest' : 'update_interest',
    category: 'event',
    details: `${interest.email} opted in for event notifications on ${event.name}.`,
    performedBy: req.user?._id || null,
    subjectId: interest._id.toString(),
    subjectType: 'event_interest',
    summary: `${created ? 'Created' : 'Updated'} notify-later contact for "${event.name}".`
  });

  res.status(created ? 201 : 200).json({
    success: true,
    message: created
      ? 'You are on the notify-later list for this event.'
      : 'Your notify-later details were updated.',
    data: interest
  });
});

export const getAdminEventInterests = asyncHandler(async (req, res) => {
  const event = await getAdminEventById(req.params.id);
  const interests = await getEventInterests(event._id);

  res.json({
    success: true,
    data: {
      event,
      items: interests,
      summary: buildEventInterestSummary(interests)
    }
  });
});

export const sendAdminEventInterestEmail = asyncHandler(async (req, res) => {
  const event = await getAdminEventById(req.params.id);
  const interests = await resolveEventInterestAudience({
    eventId: event._id,
    audience: req.body.audience,
    interestIds: req.body.interestIds || []
  });
  const result = await sendManualEventInterestEmails({
    customMessage: req.body.customMessage,
    event,
    interests
  });

  if (!result.sentIds.length && result.failed.length) {
    throw new ApiError(500, result.failed[0].error || 'Unable to send event email.');
  }

  await markEventInterestNotifications({
    interests,
    sentIds: result.sentIds.map((id) => String(id)),
    mode: 'manual'
  });

  await recordActivity({
    action: 'send_interest_email',
    category: 'event',
    details: `Sent event email for ${event.name} to ${result.sentIds.length} interested contacts.`,
    metadata: {
      audience: req.body.audience,
      failedCount: result.failed.length,
      sentCount: result.sentIds.length
    },
    performedBy: req.user._id,
    subjectId: event._id.toString(),
    subjectType: 'event',
    summary: `Sent event interest email for "${event.name}".`
  });

  res.json({
    success: true,
    message:
      result.failed.length > 0
        ? `Sent ${result.sentIds.length} email(s). ${result.failed.length} failed.`
        : `Sent ${result.sentIds.length} email(s) successfully.`,
    data: {
      registrationLink: result.registrationLink,
      sentCount: result.sentIds.length,
      failedCount: result.failed.length,
      failed: result.failed
    }
  });
});
