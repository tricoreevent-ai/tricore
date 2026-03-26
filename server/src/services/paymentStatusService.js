export const paymentStatuses = {
  pending: 'Pending',
  underReview: 'Under Review',
  confirmed: 'Confirmed',
  failed: 'Failed',
  legacyPaid: 'Paid'
};

export const confirmedPaymentStatuses = [
  paymentStatuses.confirmed,
  paymentStatuses.legacyPaid
];

export const isPaymentConfirmed = (status) =>
  confirmedPaymentStatuses.includes(String(status || '').trim());

export const normalizePaymentStatus = (status) => {
  const value = String(status || '').trim();

  if (isPaymentConfirmed(value)) {
    return paymentStatuses.confirmed;
  }

  if (value === paymentStatuses.underReview) {
    return paymentStatuses.underReview;
  }

  if (value === paymentStatuses.failed) {
    return paymentStatuses.failed;
  }

  return paymentStatuses.pending;
};

export const deriveRegistrationStatus = (paymentStatus) =>
  isPaymentConfirmed(paymentStatus) ? 'Confirmed' : 'Registered';

export const buildPaymentStatusQuery = (status) => {
  const normalized = normalizePaymentStatus(status);

  if (normalized === paymentStatuses.confirmed) {
    return { $in: confirmedPaymentStatuses };
  }

  return normalized;
};
