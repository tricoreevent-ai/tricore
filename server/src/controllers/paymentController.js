import crypto from 'node:crypto';

import { env } from '../config/env.js';
import { Payment } from '../models/Payment.js';
import { Registration } from '../models/Registration.js';
import { createRegistrationIncomeTransaction } from '../services/accountingService.js';
import {
  ensureRegistrationWindow,
  ensureUniqueRegistration,
  getOpenEvent,
  normalizeRegistrationData,
  validateRegistrationForEvent
} from '../services/registrationService.js';
import { notifyRegistrationCreated } from '../services/registrationNotificationService.js';
import {
  acknowledgeSecurityAlertByFingerprint,
  buildFailedPaymentAlertFingerprint,
  buildPendingRegistrationPaymentAlertFingerprint,
  emitAdminAlert
} from '../services/securityAlertService.js';
import { normalizePaymentStatus, paymentStatuses } from '../services/paymentStatusService.js';
import { serializeRegistrationRecord } from '../services/registrationViewService.js';
import { getRazorpayClient } from '../services/razorpayService.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const buildSignature = (orderId, paymentId) =>
  crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

const buildPendingPaymentAlertCandidate = ({ event, payment, user }) => ({
  fingerprint: buildPendingRegistrationPaymentAlertFingerprint({
    userId: user?._id,
    eventId: event?._id
  }),
  type: 'pending_registration_payment',
  category: 'registration',
  severity: 'high',
  title: 'Registration payment pending',
  message: `${user?.name || user?.username || 'A user'} started payment for ${event?.name || 'an event'} but the registration is still awaiting payment confirmation.`,
  metadata: {
    eventName: event?.name || '-',
    userName: user?.name || user?.username || '-',
    userEmail: user?.email || '-',
    amount: payment?.amount || 0,
    orderId: payment?.orderId || '-',
    paymentStatus: payment?.status || paymentStatuses.pending
  },
  subjectId: payment?._id?.toString?.() || '',
  subjectType: 'payment',
  notifyByEmail: false
});

const buildFailedPaymentAlertCandidate = ({ event, payment, user }) => ({
  fingerprint: buildFailedPaymentAlertFingerprint({
    userId: user?._id,
    eventId: event?._id
  }),
  type: 'payment_failed',
  category: 'payment',
  severity: 'critical',
  title: 'Payment verification failed',
  message: `${user?.name || user?.username || 'A user'} encountered a failed payment verification for ${event?.name || 'an event'}.`,
  metadata: {
    eventName: event?.name || '-',
    userName: user?.name || user?.username || '-',
    userEmail: user?.email || '-',
    amount: payment?.amount || 0,
    orderId: payment?.orderId || '-',
    paymentId: payment?.paymentId || '-',
    paymentStatus: payment?.status || paymentStatuses.failed
  },
  subjectId: payment?._id?.toString?.() || '',
  subjectType: 'payment'
});

export const createOrder = asyncHandler(async (req, res) => {
  const event = await getOpenEvent(req.body.eventId);
  await ensureRegistrationWindow(event);

  if (event.entryFee === 0) {
    res.json({
      success: true,
      data: {
        requiresPayment: false
      }
    });
    return;
  }

  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: Math.round(event.entryFee * 100),
    currency: 'INR',
    receipt: `evt_${event._id}_${Date.now()}`,
    notes: {
      eventId: event._id.toString(),
      userId: req.user._id.toString()
    }
  });

  const payment = await Payment.create({
    userId: req.user._id,
    eventId: event._id,
    amount: event.entryFee,
    status: paymentStatuses.pending,
    method: 'razorpay',
    orderId: order.id,
    receipt: order.receipt
  });

  await emitAdminAlert(
    buildPendingPaymentAlertCandidate({
      event,
      payment,
      user: req.user
    })
  );

  res.status(201).json({
    success: true,
    data: {
      requiresPayment: true,
      order,
      paymentId: payment._id,
      razorpayKeyId: env.razorpayKeyId
    }
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const event = await getOpenEvent(req.body.eventId);
  await ensureRegistrationWindow(event);

  if (!env.razorpayKeySecret) {
    throw new ApiError(500, 'Razorpay is not configured on the server.');
  }

  const payment = await Payment.findOne({
    orderId: req.body.razorpayOrderId,
    userId: req.user._id,
    eventId: event._id
  });

  if (!payment) {
    throw new ApiError(404, 'Payment order not found.');
  }

  const existingRegistration = await Registration.findOne({ paymentId: payment._id });

  if (existingRegistration) {
    if (normalizePaymentStatus(payment.status) === paymentStatuses.confirmed) {
      await acknowledgeSecurityAlertByFingerprint({
        fingerprint: buildPendingRegistrationPaymentAlertFingerprint({
          userId: req.user._id,
          eventId: event._id
        })
      });
      await createRegistrationIncomeTransaction({
        payment,
        registration: existingRegistration,
        reference:
          existingRegistration.teamName ||
          existingRegistration.name ||
          req.body.registration?.teamName ||
          req.body.registration?.name ||
          'Registration Payment',
        createdBy: req.user._id
      });
    }

    res.json({
      success: true,
      data: {
        registration: serializeRegistrationRecord({
          ...existingRegistration.toObject(),
          paymentId: payment.toObject()
        }),
        payment: {
          ...payment.toObject(),
          status: normalizePaymentStatus(payment.status)
        }
      }
    });
    return;
  }

  const registrationData = normalizeRegistrationData(req.body.registration);
  validateRegistrationForEvent(event, registrationData);
  await ensureUniqueRegistration(event._id, registrationData);

  const expectedSignature = buildSignature(req.body.razorpayOrderId, req.body.razorpayPaymentId);

  if (expectedSignature !== req.body.razorpaySignature) {
    payment.status = paymentStatuses.failed;
    payment.paymentId = req.body.razorpayPaymentId;
    payment.razorpaySignature = req.body.razorpaySignature;
    await payment.save();
    await acknowledgeSecurityAlertByFingerprint({
      fingerprint: buildPendingRegistrationPaymentAlertFingerprint({
        userId: req.user._id,
        eventId: event._id
      })
    });
    await emitAdminAlert(
      buildFailedPaymentAlertCandidate({
        event,
        payment,
        user: req.user
      })
    );

    throw new ApiError(400, 'Payment verification failed.');
  }

  const confirmedAt = new Date();
  payment.status = paymentStatuses.confirmed;
  payment.paymentId = req.body.razorpayPaymentId;
  payment.razorpaySignature = req.body.razorpaySignature;
  payment.confirmedAt = confirmedAt;
  await payment.save();
  await acknowledgeSecurityAlertByFingerprint({
    fingerprint: buildPendingRegistrationPaymentAlertFingerprint({
      userId: req.user._id,
      eventId: event._id
    })
  });

  const registration = await Registration.create({
    ...registrationData,
    userId: req.user._id,
    eventId: event._id,
    paymentId: payment._id,
    status: 'Confirmed',
    confirmedAt
  });

  await createRegistrationIncomeTransaction({
    payment,
    registration,
    reference: registration.teamName || registration.name || 'Registration Payment',
    createdBy: req.user._id
  });

  await notifyRegistrationCreated({ event, registration, payment });

  res.json({
    success: true,
    data: {
      registration: serializeRegistrationRecord({ ...registration.toObject(), paymentId: payment.toObject() }),
      payment: {
        ...payment.toObject(),
        status: paymentStatuses.confirmed
      }
    }
  });
});
