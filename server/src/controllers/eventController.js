import mongoose from 'mongoose';

import { CalendarSportsEvent } from '../models/CalendarSportsEvent.js';
import { Event } from '../models/Event.js';
import { Payment } from '../models/Payment.js';
import { Registration } from '../models/Registration.js';
import { Transaction } from '../models/Transaction.js';
import { hasAdminPortalAccess } from '../constants/adminAccess.js';
import { recordActivity } from '../services/activityLogService.js';
import {
  buildCalendarRangeFromQuery,
  getCalendarFeed
} from '../services/calendarFeedService.js';
import { confirmedPaymentStatuses } from '../services/paymentStatusService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const toEventDocument = (payload) => ({
  ...payload,
  startDate: new Date(payload.startDate),
  endDate: new Date(payload.endDate),
  registrationDeadline: payload.registrationDeadline
    ? new Date(payload.registrationDeadline)
    : null,
  registrationStartDate: payload.registrationStartDate
    ? new Date(payload.registrationStartDate)
    : null
});

const startOfToday = (referenceDate = new Date()) => {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const hasDateValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== '';

const validateEventRegistrationWindow = (payload, referenceDate = new Date()) => {
  const hasStart = hasDateValue(payload.registrationStartDate);
  const hasDeadline = hasDateValue(payload.registrationDeadline);

  if (hasStart !== hasDeadline) {
    throw new ApiError(
      400,
      'Enter both Registration Start Date and Registration Deadline, or leave both blank to keep the event as Coming Soon.'
    );
  }

  if (!hasStart && !hasDeadline) {
    return;
  }

  const registrationStart = new Date(payload.registrationStartDate);
  const registrationDeadlineCutoff = endOfDay(payload.registrationDeadline);
  const eventStartCutoff = endOfDay(payload.startDate);

  if (Number.isNaN(registrationStart.getTime()) || Number.isNaN(registrationDeadlineCutoff.getTime())) {
    throw new ApiError(400, 'Registration dates must be valid.');
  }

  if (registrationStart > registrationDeadlineCutoff) {
    throw new ApiError(400, 'Registration Start Date must be before the Registration Deadline.');
  }

  if (registrationDeadlineCutoff > eventStartCutoff) {
    throw new ApiError(400, 'Registration Deadline must be on or before the event start date.');
  }

  if (new Date(payload.startDate) >= startOfToday(referenceDate)) {
    const todayStart = startOfToday(referenceDate);

    if (registrationStart < todayStart || registrationDeadlineCutoff < todayStart) {
      throw new ApiError(400, 'Registration dates must be today or in the future.');
    }
  }
};

const disableEventCaching = (res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store'
  });
};

const visibleEventCondition = {
  $or: [{ isHidden: false }, { isHidden: { $exists: false } }]
};

const getEventUsageCounts = async (eventId) => {
  const [paymentCount, registrationCount, transactionCount] = await Promise.all([
    Payment.countDocuments({ eventId }),
    Registration.countDocuments({ eventId }),
    Transaction.countDocuments({ eventId })
  ]);

  return {
    paymentCount,
    registrationCount,
    transactionCount
  };
};

const buildEventDateMatchStage = (query = {}) => {
  const matchStage = {};
  const overlapConditions = [];

  if (query.dateFrom) {
    overlapConditions.push({
      endDate: { $gte: new Date(`${query.dateFrom}T00:00:00.000Z`) }
    });
  }

  if (query.dateTo) {
    overlapConditions.push({
      startDate: { $lte: new Date(`${query.dateTo}T23:59:59.999Z`) }
    });
  }

  if (overlapConditions.length) {
    matchStage.$and = overlapConditions;
  }

  return matchStage;
};

const buildEventMatchStage = (query = {}, user = null) => {
  const matchStage = {
    isDeleted: false,
    ...buildEventDateMatchStage(query)
  };
  const includeHidden =
    query.includeHidden === 'true' && hasAdminPortalAccess(user);

  if (!includeHidden) {
    Object.assign(matchStage, visibleEventCondition);
  }

  if (query.visibility === 'visible') {
    Object.assign(matchStage, visibleEventCondition);
  }

  if (query.visibility === 'hidden') {
    delete matchStage.$or;
    matchStage.isHidden = true;
  }

  if (query.sportType) {
    matchStage.sportType = query.sportType;
  }

  return matchStage;
};

const buildEventPipeline = (matchStage) => [
  { $match: matchStage },
  { $sort: { startDate: 1 } },
  {
    $lookup: {
      from: 'registrations',
      localField: '_id',
      foreignField: 'eventId',
      as: 'registrations'
    }
  },
  {
    $lookup: {
      from: 'payments',
      localField: '_id',
      foreignField: 'eventId',
      as: 'payments'
    }
  },
  {
    $lookup: {
      from: 'eventinterests',
      localField: '_id',
      foreignField: 'eventId',
      as: 'interests'
    }
  },
  {
    $addFields: {
      registrationCount: { $size: '$registrations' },
      interestCount: { $size: '$interests' },
      revenue: {
        $sum: {
          $map: {
                input: {
                  $filter: {
                    input: '$payments',
                    as: 'payment',
                    cond: { $in: ['$$payment.status', confirmedPaymentStatuses] }
                  }
                },
            as: 'paid',
            in: '$$paid.amount'
          }
        }
      }
    }
  },
  {
    $project: {
      registrations: 0,
      payments: 0,
      interests: 0
    }
  }
];

export const getEvents = asyncHandler(async (req, res) => {
  disableEventCaching(res);

  const matchStage = buildEventMatchStage(req.query, req.user);

  const events = await Event.aggregate(buildEventPipeline(matchStage));

  res.json({
    success: true,
    data: events
  });
});

export const getAdminCalendarFeed = asyncHandler(async (req, res) => {
  disableEventCaching(res);

  const { dateFrom, dateTo } = buildCalendarRangeFromQuery(req.query);
  const data = await getCalendarFeed({
    dateFrom,
    dateTo,
    includeHiddenEvents: true
  });

  res.json({
    success: true,
    data
  });
});

export const getSportsCalendarEvents = asyncHandler(async (_req, res) => {
  const items = await CalendarSportsEvent.find()
    .sort({ startDate: 1, name: 1 })
    .populate('createdBy', 'name username email')
    .populate('updatedBy', 'name username email');

  res.json({
    success: true,
    data: items
  });
});

export const createSportsCalendarEvent = asyncHandler(async (req, res) => {
  const item = await CalendarSportsEvent.create({
    ...req.body,
    startDate: new Date(req.body.startDate),
    endDate: new Date(req.body.endDate),
    createdBy: req.user._id,
    updatedBy: req.user._id
  });

  await recordActivity({
    action: 'create',
    category: 'calendar',
    details: `Added sports fixture ${item.name} from ${item.startDate.toISOString()} to ${item.endDate.toISOString()}.`,
    performedBy: req.user._id,
    subjectId: item._id.toString(),
    subjectType: 'sports_calendar_event',
    summary: `Created sports calendar event "${item.name}".`
  });

  res.status(201).json({
    success: true,
    data: item
  });
});

export const updateSportsCalendarEvent = asyncHandler(async (req, res) => {
  const existing = await CalendarSportsEvent.findById(req.params.id);

  if (!existing) {
    throw new ApiError(404, 'Sports calendar event not found.');
  }

  const payload = {
    ...req.body,
    updatedBy: req.user._id
  };

  if (payload.startDate) {
    payload.startDate = new Date(payload.startDate);
  }

  if (payload.endDate) {
    payload.endDate = new Date(payload.endDate);
  }

  const item = await CalendarSportsEvent.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  });

  await recordActivity({
    action: 'update',
    category: 'calendar',
    details: `Updated sports fixture ${item.name}.`,
    performedBy: req.user._id,
    subjectId: item._id.toString(),
    subjectType: 'sports_calendar_event',
    summary: `Updated sports calendar event "${item.name}".`
  });

  res.json({
    success: true,
    data: item
  });
});

export const deleteSportsCalendarEvent = asyncHandler(async (req, res) => {
  const item = await CalendarSportsEvent.findById(req.params.id);

  if (!item) {
    throw new ApiError(404, 'Sports calendar event not found.');
  }

  await item.deleteOne();
  await recordActivity({
    action: 'delete',
    category: 'calendar',
    details: `Deleted sports fixture ${item.name}.`,
    performedBy: req.user._id,
    subjectId: item._id.toString(),
    subjectType: 'sports_calendar_event',
    summary: `Deleted sports calendar event "${item.name}".`
  });

  res.json({
    success: true,
    message: 'Sports calendar event deleted successfully.'
  });
});

export const getEventCatalog = asyncHandler(async (req, res) => {
  disableEventCaching(res);

  const matchStage = buildEventMatchStage({ ...req.query, includeHidden: 'true' }, req.user);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Number.parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;
  const [catalogResult] = await Event.aggregate([
    ...buildEventPipeline(matchStage),
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limit }],
        metadata: [{ $count: 'totalCount' }]
      }
    }
  ]);
  const items = catalogResult?.items || [];
  const totalCount = catalogResult?.metadata?.[0]?.totalCount || 0;

  res.json({
    success: true,
    data: {
      items,
      totalCount,
      page,
      limit
    }
  });
});

export const getEventById = asyncHandler(async (req, res) => {
  disableEventCaching(res);

  const [event] = await Event.aggregate(
    buildEventPipeline({
      _id: new mongoose.Types.ObjectId(req.params.id),
      isDeleted: false,
      ...visibleEventCondition
    })
  );

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  res.json({
    success: true,
    data: event
  });
});

export const createEvent = asyncHandler(async (req, res) => {
  validateEventRegistrationWindow(req.body);
  const event = await Event.create(toEventDocument(req.body));
  await recordActivity({
    action: 'create',
    category: 'event',
    details: `Created event at ${event.venue} from ${event.startDate.toISOString()} to ${event.endDate.toISOString()}.`,
    performedBy: req.user._id,
    subjectId: event._id.toString(),
    subjectType: 'event',
    summary: `Created event "${event.name}".`
  });

  res.status(201).json({
    success: true,
    data: event
  });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const existing = await Event.findOne({ _id: req.params.id, isDeleted: false });

  if (!existing) {
    throw new ApiError(404, 'Event not found.');
  }

  const payload = {
    ...req.body
  };

  if (payload.startDate) {
    payload.startDate = new Date(payload.startDate);
  }

  if (payload.endDate) {
    payload.endDate = new Date(payload.endDate);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'registrationDeadline')) {
    payload.registrationDeadline = payload.registrationDeadline
      ? new Date(payload.registrationDeadline)
      : null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'registrationStartDate')) {
    payload.registrationStartDate = payload.registrationStartDate
      ? new Date(payload.registrationStartDate)
      : null;
  }

  validateEventRegistrationWindow({
    startDate: payload.startDate || existing.startDate,
    registrationStartDate:
      Object.prototype.hasOwnProperty.call(req.body, 'registrationStartDate')
        ? req.body.registrationStartDate
        : existing.registrationStartDate,
    registrationDeadline:
      Object.prototype.hasOwnProperty.call(req.body, 'registrationDeadline')
        ? req.body.registrationDeadline
        : existing.registrationDeadline
  });

  if (payload.isHidden === true) {
    payload.registrationEnabled = false;
  }

  const event = await Event.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  });
  await recordActivity({
    action: 'update',
    category: 'event',
    details: `Updated event ${event.name} at ${event.venue}.`,
    performedBy: req.user._id,
    subjectId: event._id.toString(),
    subjectType: 'event',
    summary: `Updated event "${event.name}".`
  });

  res.json({
    success: true,
    data: event
  });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findOne({ _id: req.params.id, isDeleted: false });

  if (!event) {
    throw new ApiError(404, 'Event not found.');
  }

  const usage = await getEventUsageCounts(event._id);

  if (usage.paymentCount || usage.registrationCount || usage.transactionCount) {
    throw new ApiError(
      409,
      'This event already has payments, registrations, or transactions. Delete is blocked. Hide the event instead.',
      usage
    );
  }

  event.isDeleted = true;
  event.registrationEnabled = false;
  await event.save();

  await recordActivity({
    action: 'delete',
    category: 'event',
    details: `Soft-deleted event ${event.name}.`,
    performedBy: req.user._id,
    subjectId: event._id.toString(),
    subjectType: 'event',
    summary: `Deleted event "${event.name}".`
  });

  res.json({
    success: true,
    message: 'Event deleted successfully.'
  });
});
