import { deriveRegistrationStatus, normalizePaymentStatus } from './paymentStatusService.js';

const toPlain = (value) =>
  typeof value?.toObject === 'function' ? value.toObject() : value;

export const serializePaymentRecord = (payment) => {
  if (!payment) {
    return payment;
  }

  const next = toPlain(payment);

  return {
    ...next,
    status: normalizePaymentStatus(next.status)
  };
};

export const serializeRegistrationRecord = (registration) => {
  if (!registration) {
    return registration;
  }

  const next = toPlain(registration);
  const payment = serializePaymentRecord(next.paymentId);
  const status = next.status || deriveRegistrationStatus(payment?.status);

  return {
    ...next,
    status,
    paymentId: payment
  };
};
