import { Payment } from '../models/Payment.js';
import { Registration } from '../models/Registration.js';
import { createRegistrationIncomeTransaction } from '../services/accountingService.js';
import { recordActivity } from '../services/activityLogService.js';
import {
  ensureRegistrationWindow,
  ensureUniqueRegistration,
  getOpenEvent,
  normalizeRegistrationData,
  validateRegistrationForEvent
} from '../services/registrationService.js';
import { getPaymentSettings } from '../services/paymentSettingsService.js';
import {
  notifyManualPaymentSubmitted,
  notifyPaymentConfirmed,
  notifyRegistrationCreated
} from '../services/registrationNotificationService.js';
import { paymentModes } from '../services/accountingService.js';
import {
  acknowledgeSecurityAlertByFingerprint,
  buildManualPaymentReviewAlertFingerprint,
  buildPendingRegistrationPaymentAlertFingerprint,
  emitAdminAlert
} from '../services/securityAlertService.js';
import {
  buildPaymentStatusQuery,
  normalizePaymentStatus,
  paymentStatuses
} from '../services/paymentStatusService.js';
import { serializeRegistrationRecord } from '../services/registrationViewService.js';
import { sendCsv } from '../utils/csv.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const buildRegistrationPaymentAlertCandidate = ({
  event,
  payment,
  registration,
  user,
  reviewRequired = false
}) => ({
  fingerprint: reviewRequired
    ? buildManualPaymentReviewAlertFingerprint({
        userId: user?._id,
        eventId: event?._id
      })
    : buildPendingRegistrationPaymentAlertFingerprint({
        userId: user?._id,
        eventId: event?._id
      }),
  type: reviewRequired ? 'manual_payment_under_review' : 'pending_registration_payment',
  category: reviewRequired ? 'payment' : 'registration',
  severity: 'high',
  title: reviewRequired ? 'Manual payment proof under review' : 'Registration payment pending',
  message: reviewRequired
    ? `${registration?.teamName || registration?.name || registration?.email || 'A registration'} submitted payment proof for ${event?.name || 'an event'} and is waiting for admin review.`
    : `${registration?.teamName || registration?.name || registration?.email || 'A registration'} is waiting to complete payment for ${event?.name || 'an event'}.`,
  metadata: {
    eventName: event?.name || '-',
    registrant: registration?.teamName || registration?.name || registration?.email || '-',
    userName: user?.name || user?.username || '-',
    userEmail: user?.email || registration?.email || '-',
    amount: payment?.amount || 0,
    orderId: payment?.orderId || '-',
    paymentStatus: payment?.status || '-',
    paymentMethod: payment?.method || '-',
    manualReference: payment?.manualReference || '-'
  },
  subjectId: registration?._id?.toString?.() || payment?._id?.toString?.() || '',
  subjectType: reviewRequired ? 'manual_payment_review' : 'registration_pending_payment',
  notifyByEmail: false
});

const registrationPopulateConfig = [
  { path: 'userId', select: 'name email role' },
  { path: 'eventId', select: 'name sportType startDate endDate venue' },
  {
    path: 'paymentId',
    select:
      'amount status method manualReference paymentId orderId confirmedAt confirmedBy receipt receiptFilename proofSubmittedAt'
  }
];

const populateRegistrationRecord = (registrationId) =>
  Registration.findById(registrationId).populate(registrationPopulateConfig);

const findOwnedRegistration = async (registrationId, user) => {
  const email = String(user?.email || '').trim().toLowerCase();

  return Registration.findOne({
    _id: registrationId,
    $or: [{ userId: user._id }, ...(email ? [{ email }] : [])]
  });
};

export const createRegistration = asyncHandler(async (req, res) => {
  const event = await getOpenEvent(req.body.eventId);
  await ensureRegistrationWindow(event);

  if (event.entryFee > 0) {
    throw new ApiError(400, 'This event requires payment before registration can be completed.');
  }

  const registrationData = normalizeRegistrationData(req.body);
  validateRegistrationForEvent(event, registrationData);
  await ensureUniqueRegistration(event._id, registrationData);

  const confirmedAt = new Date();
  const payment = await Payment.create({
    userId: req.user._id,
    eventId: event._id,
    amount: 0,
    status: paymentStatuses.confirmed,
    method: 'free',
    orderId: `free_${event._id}_${Date.now()}`,
    paymentId: `FREE_${Date.now()}`,
    confirmedAt
  });

  const registration = await Registration.create({
    ...registrationData,
    userId: req.user._id,
    eventId: event._id,
    paymentId: payment._id,
    status: 'Confirmed',
    confirmedAt
  });

  await notifyRegistrationCreated({ event, registration, payment });
  await recordActivity({
    action: 'create',
    category: 'registration',
    details: `Free registration created for ${registration.teamName || registration.name || registration.email}.`,
    performedBy: req.user._id,
    subjectId: registration._id.toString(),
    subjectType: 'registration',
    summary: `Created registration for "${event.name}".`
  });

  res.status(201).json({
    success: true,
    data: {
      registration: serializeRegistrationRecord({ ...registration.toObject(), paymentId: payment.toObject() }),
      payment: {
        ...payment.toObject(),
        status: normalizePaymentStatus(payment.status)
      }
    }
  });
});

export const createManualRegistration = asyncHandler(async (req, res) => {
  const event = await getOpenEvent(req.body.eventId);
  await ensureRegistrationWindow(event);

  if (event.entryFee <= 0) {
    throw new ApiError(400, 'Manual payment is only available for paid events.');
  }

  const paymentSettings = await getPaymentSettings();

  if (!paymentSettings.manualPaymentEnabled) {
    throw new ApiError(400, 'Manual payment is currently disabled in application settings.');
  }

  const registrationData = normalizeRegistrationData(req.body);
  validateRegistrationForEvent(event, registrationData);
  await ensureUniqueRegistration(event._id, registrationData);

  const manualReference = String(req.body.manualReference || '').trim();
  const receiptDataUrl = String(req.body.receiptDataUrl || '').trim();
  const receiptFilename = String(req.body.receiptFilename || '').trim();
  const nextStatus = receiptDataUrl ? paymentStatuses.underReview : paymentStatuses.pending;

  const payment = await Payment.create({
    userId: req.user._id,
    eventId: event._id,
    amount: event.entryFee,
    status: nextStatus,
    method: 'manual',
    manualReference,
    orderId: `manual_${event._id}_${Date.now()}`,
    receipt: receiptDataUrl,
    receiptFilename,
    proofSubmittedAt: receiptDataUrl ? new Date() : null
  });

  const registration = await Registration.create({
    ...registrationData,
    userId: req.user._id,
    eventId: event._id,
    paymentId: payment._id,
    status: 'Registered'
  });

  await notifyRegistrationCreated({ event, registration, payment });

  if (receiptDataUrl) {
    await notifyManualPaymentSubmitted({ event, registration, payment });
  }
  await emitAdminAlert(
    buildRegistrationPaymentAlertCandidate({
      event,
      payment,
      registration,
      user: req.user,
      reviewRequired: Boolean(receiptDataUrl)
    })
  );
  await recordActivity({
    action: 'create',
    category: 'registration',
    details: `Manual registration submitted for ${registration.teamName || registration.name || registration.email} with payment status ${normalizePaymentStatus(payment.status)}.`,
    performedBy: req.user._id,
    subjectId: registration._id.toString(),
    subjectType: 'registration',
    summary: `Created manual registration for "${event.name}".`
  });

  res.status(201).json({
    success: true,
    data: {
      registration: serializeRegistrationRecord({ ...registration.toObject(), paymentId: payment.toObject() }),
      payment: {
        ...payment.toObject(),
        status: normalizePaymentStatus(payment.status)
      }
    }
  });
});

export const confirmRegistrationPayment = asyncHandler(async (req, res) => {
  const registration = await Registration.findById(req.params.id)
    .populate('eventId')
    .populate('paymentId');

  if (!registration) {
    throw new ApiError(404, 'Registration not found.');
  }

  const payment = registration.paymentId;
  if (!payment) {
    throw new ApiError(400, 'Registration payment record is missing.');
  }

  if (normalizePaymentStatus(payment.status) === paymentStatuses.confirmed) {
    res.json({
      success: true,
      message: 'Payment is already confirmed.',
      data: {
        registration: serializeRegistrationRecord(registration),
        payment: {
          ...payment.toObject(),
          status: paymentStatuses.confirmed
        }
      }
    });
    return;
  }

  const manualReference = String(req.body.manualReference || '').trim();
  if (manualReference) {
    payment.manualReference = manualReference;
    payment.paymentId = manualReference;
  }

  const paymentMode = paymentModes.includes(req.body.paymentMode)
    ? req.body.paymentMode
    : payment.method === 'manual'
      ? 'upi'
      : 'online';

  const confirmedAt = new Date();
  payment.status = paymentStatuses.confirmed;
  payment.confirmedBy = req.user._id;
  payment.confirmedAt = confirmedAt;
  registration.status = 'Confirmed';
  registration.confirmedAt = confirmedAt;

  await Promise.all([payment.save(), registration.save()]);
  await acknowledgeSecurityAlertByFingerprint({
    fingerprint: buildPendingRegistrationPaymentAlertFingerprint({
      userId: registration.userId,
      eventId: registration.eventId?._id || registration.eventId
    })
  });
  await acknowledgeSecurityAlertByFingerprint({
    fingerprint: buildManualPaymentReviewAlertFingerprint({
      userId: registration.userId,
      eventId: registration.eventId?._id || registration.eventId
    }),
    userId: req.user._id
  });

  await createRegistrationIncomeTransaction({
    payment,
    registration,
    reference: registration.teamName || registration.name || 'Registration Payment',
    createdBy: req.user._id,
    paymentMode
  });

  await notifyPaymentConfirmed({
    event: registration.eventId,
    registration,
    payment
  });
  await recordActivity({
    action: 'confirm_payment',
    category: 'registration',
    details: `Payment confirmed for ${registration.teamName || registration.name || registration.email} using ${paymentMode}.`,
    performedBy: req.user._id,
    subjectId: registration._id.toString(),
    subjectType: 'registration',
    summary: `Confirmed registration payment for "${registration.eventId?.name || 'event'}".`
  });

  res.json({
    success: true,
    message: 'Payment confirmed successfully.',
    data: {
      registration: serializeRegistrationRecord(registration),
      payment: {
        ...payment.toObject(),
        status: paymentStatuses.confirmed
      }
    }
  });
});

export const getRegistrations = asyncHandler(async (req, res) => {
  const filters = {};
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Number.parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;

  if (req.query.eventId) {
    filters.eventId = req.query.eventId;
  }

  if (req.query.status) {
    const paymentIds = await Payment.find({
      status: buildPaymentStatusQuery(req.query.status)
    }).distinct('_id');

    filters.paymentId = { $in: paymentIds };
  }

  if (req.query.dateFrom || req.query.dateTo) {
    filters.createdAt = {};

    if (req.query.dateFrom) {
      filters.createdAt.$gte = new Date(`${req.query.dateFrom}T00:00:00.000Z`);
    }

    if (req.query.dateTo) {
      filters.createdAt.$lte = new Date(`${req.query.dateTo}T23:59:59.999Z`);
    }
  }

  const totalCount = await Registration.countDocuments(filters);
  const registrationQuery = Registration.find(filters)
    .populate('userId', 'name email role')
    .populate('eventId', 'name sportType startDate endDate venue')
    .populate('paymentId', 'amount status method manualReference paymentId orderId confirmedAt confirmedBy receipt receiptFilename proofSubmittedAt')
    .sort({ createdAt: -1 });

  const registrations =
    req.query.format === 'csv'
      ? await registrationQuery
      : await registrationQuery.skip(skip).limit(limit);
  const serialized = registrations.map((registration) => serializeRegistrationRecord(registration));

  if (req.query.format === 'csv') {
    sendCsv(
      res,
      serialized.map((registration) => ({
        event: registration.eventId?.name || '',
        sportType: registration.eventId?.sportType || '',
        teamName: registration.teamName || registration.name || '',
        captainName: registration.captainName || '',
        email: registration.email,
        phone1: registration.phone1,
        phone2: registration.phone2,
        address: registration.address,
        playerCount: registration.players?.length || 0,
        players: (registration.players || [])
          .map((player) => `${player.name} (${player.phone})`)
          .join('; '),
        registrationStatus: registration.status,
        paymentStatus: registration.paymentId?.status || '',
        paymentAmount: registration.paymentId?.amount || 0,
        paymentMethod: registration.paymentId?.method || '',
        paymentReference:
          registration.paymentId?.manualReference || registration.paymentId?.paymentId || '',
        submittedAt: registration.createdAt?.toISOString?.() || ''
      })),
      [
        'event',
        'sportType',
        'teamName',
        'captainName',
        'email',
        'phone1',
        'phone2',
        'address',
        'playerCount',
        'players',
        'registrationStatus',
        'paymentStatus',
        'paymentAmount',
        'paymentMethod',
        'paymentReference',
        'submittedAt'
      ],
      'registrations.csv'
    );
    return;
  }

  res.json({
    success: true,
    data: {
      items: serialized,
      totalCount,
      page,
      limit
    }
  });
});

export const updateRegistration = asyncHandler(async (req, res) => {
  const registration = await Registration.findById(req.params.id);

  if (!registration) {
    throw new ApiError(404, 'Registration not found.');
  }

  Object.assign(registration, req.body);
  await registration.save();

  const populated = await populateRegistrationRecord(registration._id);

  await recordActivity({
    action: 'update',
    category: 'registration',
    details: `Updated registration details for ${registration.teamName || registration.name || registration.email}.`,
    performedBy: req.user._id,
    subjectId: registration._id.toString(),
    subjectType: 'registration',
    summary: `Updated registration for "${populated?.eventId?.name || 'event'}".`
  });

  res.json({
    success: true,
    data: serializeRegistrationRecord(populated)
  });
});

export const updateMyRegistration = asyncHandler(async (req, res) => {
  const registration = await findOwnedRegistration(req.params.id, req.user);

  if (!registration) {
    throw new ApiError(404, 'Registration not found for this account.');
  }

  const event = await getOpenEvent(registration.eventId);
  await ensureRegistrationWindow(event, { skipCapacityCheck: true });

  const mergedPayload = {
    name: req.body.name ?? registration.name,
    teamName: req.body.teamName ?? registration.teamName,
    captainName: req.body.captainName ?? registration.captainName,
    email: req.body.email ?? registration.email,
    phone1: req.body.phone1 ?? registration.phone1,
    phone2: req.body.phone2 ?? registration.phone2,
    address: req.body.address ?? registration.address,
    players: req.body.players ?? registration.players
  };

  const registrationData = normalizeRegistrationData(mergedPayload);
  validateRegistrationForEvent(event, registrationData);
  await ensureUniqueRegistration(event._id, registrationData, registration._id);

  registration.name = registrationData.name;
  registration.teamName = registrationData.teamName;
  registration.captainName = registrationData.captainName;
  registration.email = registrationData.email;
  registration.phone1 = registrationData.phone1;
  registration.phone2 = registrationData.phone2;
  registration.address = registrationData.address;
  registration.players = registrationData.players;
  await registration.save();

  const populated = await populateRegistrationRecord(registration._id);

  await recordActivity({
    action: 'update',
    category: 'registration',
    details: `Registrant updated the roster for ${registration.teamName || registration.name || registration.email}.`,
    performedBy: req.user._id,
    subjectId: registration._id.toString(),
    subjectType: 'registration',
    summary: `Registrant updated registration for "${populated?.eventId?.name || 'event'}".`
  });

  res.json({
    success: true,
    data: serializeRegistrationRecord(populated)
  });
});

export const getMyRegistrations = asyncHandler(async (req, res) => {
  const registrations = await Registration.find({ userId: req.user._id })
    .populate('eventId')
    .populate('paymentId', 'amount status method manualReference paymentId orderId confirmedAt receipt receiptFilename proofSubmittedAt')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: registrations.map((registration) => serializeRegistrationRecord(registration))
  });
});

export const getMyRegistrationForEvent = asyncHandler(async (req, res) => {
  const email = String(req.user?.email || '').trim().toLowerCase();

  const registration = await Registration.findOne({
    eventId: req.params.eventId,
    $or: [
      { userId: req.user._id },
      ...(email ? [{ email }] : [])
    ]
  }).populate(registrationPopulateConfig);

  res.json({
    success: true,
    data: registration ? serializeRegistrationRecord(registration) : null
  });
});
