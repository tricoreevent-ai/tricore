import { Event } from '../models/Event.js';
import { EventInterest } from '../models/EventInterest.js';
import { ApiError } from '../utils/ApiError.js';
import {
  hasRegistrationDeadlinePassed,
  hasRegistrationStarted
} from './registrationService.js';

const visibleEventCondition = {
  $or: [{ isHidden: false }, { isHidden: { $exists: false } }]
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeText = (value) => String(value || '').trim();

export const getAdminEventById = async (eventId) => {
  const event = await Event.findOne({ _id: eventId, isDeleted: false });

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  return event;
};

export const getPublicEventByIdForInterest = async (eventId) => {
  const event = await Event.findOne({
    _id: eventId,
    isDeleted: false,
    ...visibleEventCondition
  });

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  return event;
};

export const ensureNotifyLaterAvailableForEvent = (event, referenceDate = new Date()) => {
  if (!event?.registrationEnabled) {
    throw new ApiError(400, 'Registration is currently disabled for this event.');
  }

  if (hasRegistrationStarted(event, referenceDate)) {
    throw new ApiError(400, 'Registration is already open for this event.');
  }

  if (hasRegistrationDeadlinePassed(event, referenceDate)) {
    throw new ApiError(400, 'Registration deadline has passed for this event.');
  }
};

export const upsertEventInterest = async ({
  eventId,
  userId,
  name,
  email,
  phone
}) => {
  const normalizedEmail = normalizeEmail(email);
  const payload = {
    name: normalizeText(name),
    email: normalizedEmail,
    phone: normalizeText(phone),
    ...(userId ? { userId } : {})
  };

  const existing = await EventInterest.findOne({
    eventId,
    email: normalizedEmail
  });

  if (existing) {
    existing.name = payload.name;
    existing.phone = payload.phone;

    if (payload.userId) {
      existing.userId = payload.userId;
    }

    await existing.save();
    return {
      interest: existing,
      created: false
    };
  }

  try {
    const interest = await EventInterest.create({
      eventId,
      ...payload
    });

    return {
      interest,
      created: true
    };
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    const interest = await EventInterest.findOne({
      eventId,
      email: normalizedEmail
    });

    if (!interest) {
      throw error;
    }

    interest.name = payload.name;
    interest.phone = payload.phone;

    if (payload.userId) {
      interest.userId = payload.userId;
    }

    await interest.save();

    return {
      interest,
      created: false
    };
  }
};

export const getEventInterests = async (eventId) =>
  EventInterest.find({ eventId })
    .populate('userId', 'name email role')
    .sort({ createdAt: -1 });

export const buildEventInterestSummary = (interests = []) => ({
  totalCount: interests.length,
  automatedNotifiedCount: interests.filter((interest) =>
    Boolean(interest.registrationOpenedNotifiedAt)
  ).length,
  manualSentCount: interests.filter((interest) => Boolean(interest.lastManualEmailSentAt)).length,
  pendingCount: interests.filter((interest) => !interest.registrationOpenedNotifiedAt).length
});

export const resolveEventInterestAudience = async ({
  eventId,
  audience,
  interestIds = []
}) => {
  const query = { eventId };

  if (audience === 'pending') {
    query.registrationOpenedNotifiedAt = null;
  }

  if (audience === 'selected') {
    if (!interestIds.length) {
      throw new ApiError(400, 'Select at least one interested contact.');
    }

    query._id = { $in: interestIds };
  }

  const interests = await EventInterest.find(query).sort({ createdAt: -1 });

  if (!interests.length) {
    throw new ApiError(404, 'No interested contacts matched the selected audience.');
  }

  return interests;
};

export const markEventInterestNotifications = async ({
  interests,
  sentIds,
  mode,
  sentAt = new Date()
}) => {
  const normalizedIds = new Set(sentIds.map((id) => String(id)));
  const operations = interests
    .filter((interest) => normalizedIds.has(String(interest._id)))
    .map((interest) => {
      const $set =
        mode === 'automatic'
          ? { registrationOpenedNotifiedAt: sentAt }
          : { lastManualEmailSentAt: sentAt };

      return {
        updateOne: {
          filter: { _id: interest._id },
          update: {
            $set,
            $inc: { notificationCount: 1 }
          }
        }
      };
    });

  if (!operations.length) {
    return;
  }

  await EventInterest.bulkWrite(operations);
};
