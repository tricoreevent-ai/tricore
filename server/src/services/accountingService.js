import mongoose from 'mongoose';

import { Payment } from '../models/Payment.js';
import { Registration } from '../models/Registration.js';
import { Transaction } from '../models/Transaction.js';
import {
  buildPaymentStatusQuery,
  isPaymentConfirmed,
  normalizePaymentStatus
} from './paymentStatusService.js';
export const paymentModes = ['online', 'cash', 'upi', 'bank'];
export const transactionScopes = ['event', 'common'];

const toPlainTransaction = (transaction) =>
  typeof transaction?.toObject === 'function' ? transaction.toObject() : transaction;

export const getDateFilter = (query, field = 'date') => {
  const dateFilter = {};

  if (query.month && query.year) {
    const startDate = new Date(Date.UTC(Number(query.year), Number(query.month) - 1, 1));
    const endDate = new Date(Date.UTC(Number(query.year), Number(query.month), 0, 23, 59, 59, 999));
    dateFilter[field] = {
      $gte: startDate,
      $lte: endDate
    };
    return dateFilter;
  }

  if (query.dateFrom || query.dateTo) {
    dateFilter[field] = {};

    if (query.dateFrom) {
      dateFilter[field].$gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
    }

    if (query.dateTo) {
      dateFilter[field].$lte = new Date(`${query.dateTo}T23:59:59.999Z`);
    }
  }

  return dateFilter;
};

export const buildTransactionFilters = (query) => {
  const filters = {};

  if (query.scope) {
    filters.scope = query.scope;
  }

  if (query.eventId) {
    filters.eventId = new mongoose.Types.ObjectId(query.eventId);
  }

  if (query.type) {
    filters.type = query.type;
  }

  if (query.category) {
    filters.category = query.category;
  }

  if (query.paymentMode) {
    filters.paymentMode = query.paymentMode;
  }

  if (query.source) {
    filters.source = query.source;
  }

  return {
    ...filters,
    ...getDateFilter(query)
  };
};

export const createRegistrationIncomeTransaction = async ({
  payment,
  registration,
  reference,
  createdBy,
  paymentMode
}) => {
  if (!payment || !isPaymentConfirmed(payment.status) || payment.amount <= 0) {
    return null;
  }

  return Transaction.findOneAndUpdate(
    { paymentId: payment._id },
    {
      $set: {
        registrationId: registration?._id,
        reference: reference || registration?.teamName || registration?.name || 'Registration Payment',
        date: payment.updatedAt || payment.createdAt || new Date()
      },
      $setOnInsert: {
        scope: 'event',
        eventId: payment.eventId,
        type: 'income',
        category: 'registration',
        amount: payment.amount,
        paymentMode: paymentMode || 'online',
        notes: 'Auto-recorded from successful registration payment.',
        source: 'payment',
        paymentId: payment._id,
        createdBy
      }
    },
    {
      upsert: true,
      new: true
    }
  );
};

export const getTransactionSummary = async (filters = {}) => {
  const summary = await Transaction.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  const totals = summary.reduce(
    (accumulator, item) => {
      accumulator[item._id] = item.total;
      return accumulator;
    },
    {
      income: 0,
      expense: 0
    }
  );

  return {
    totalIncome: totals.income || 0,
    totalExpenses: totals.expense || 0,
    netProfit: (totals.income || 0) - (totals.expense || 0)
  };
};

export const getTopPerformingEvent = async (filters = {}) => {
  const eventPerformance = await Transaction.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          eventId: '$eventId',
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    },
    {
      $group: {
        _id: '$_id.eventId',
        totalIncome: {
          $sum: {
            $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0]
          }
        },
        totalExpenses: {
          $sum: {
            $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0]
          }
        }
      }
    },
    {
      $addFields: {
        netProfit: { $subtract: ['$totalIncome', '$totalExpenses'] }
      }
    },
    {
      $sort: { netProfit: -1 }
    },
    {
      $lookup: {
        from: 'events',
        localField: '_id',
        foreignField: '_id',
        as: 'event'
      }
    },
    { $unwind: '$event' },
    { $limit: 1 }
  ]);

  return eventPerformance[0] || null;
};

export const getLedgerBalances = async (filters = {}) => {
  const summary = await Transaction.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$paymentMode',
        income: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
          }
        },
        expense: {
          $sum: {
            $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
          }
        }
      }
    }
  ]);

  const byMode = summary.reduce((accumulator, item) => {
    accumulator[item._id] = (item.income || 0) - (item.expense || 0);
    return accumulator;
  }, {});

  const bankBalance = ['online', 'upi', 'bank'].reduce(
    (total, mode) => total + (byMode[mode] || 0),
    0
  );
  const cashBalance = byMode.cash || 0;

  const partnerSummary = await Transaction.aggregate([
    {
      $match: {
        ...filters,
        category: {
          $in: ['partner_share', 'partner_distribution']
        }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  const partnerBalance = partnerSummary.reduce((total, item) => {
    if (item._id === 'income') {
      return total + item.total;
    }

    return total - item.total;
  }, 0);

  return {
    bankBalance,
    cashBalance,
    partnerBalance
  };
};

export const getPaymentStatusReport = async (query = {}) => {
  if (query.scope === 'common') {
    return {
      counts: {
        Confirmed: 0,
        Pending: 0,
        'Under Review': 0,
        Failed: 0
      },
      paidUsers: [],
      pendingUsers: [],
      underReviewUsers: [],
      failedUsers: []
    };
  }

  const paymentFilters = {};

  if (query.eventId) {
    paymentFilters.eventId = query.eventId;
  }

  if (query.status) {
    paymentFilters.status = buildPaymentStatusQuery(query.status);
  }

  const dateFilters = getDateFilter(query, 'createdAt');

  const payments = await Payment.find({
    ...paymentFilters,
    ...dateFilters
  })
    .populate('userId', 'name email')
    .populate('eventId', 'name')
    .sort({ createdAt: -1 });

  const counts = payments.reduce(
    (accumulator, payment) => {
      const normalizedStatus = normalizePaymentStatus(payment.status);
      accumulator[normalizedStatus] = (accumulator[normalizedStatus] || 0) + 1;
      return accumulator;
    },
    {
      Confirmed: 0,
      Pending: 0,
      'Under Review': 0,
      Failed: 0
    }
  );

  return {
    counts,
    paidUsers: payments.filter((payment) => normalizePaymentStatus(payment.status) === 'Confirmed'),
    pendingUsers: payments.filter((payment) => payment.status === 'Pending'),
    underReviewUsers: payments.filter((payment) => payment.status === 'Under Review'),
    failedUsers: payments.filter((payment) => payment.status === 'Failed')
  };
};

export const attachRegistrationReferences = async (transactions) => {
  const plainTransactions = transactions.map(toPlainTransaction);
  const registrationIds = plainTransactions
    .map((transaction) => transaction.registrationId)
    .filter(Boolean);

  if (!registrationIds.length) {
    return plainTransactions.map((transaction) => ({
      ...transaction,
      registrationReference: ''
    }));
  }

  const registrations = await Registration.find({ _id: { $in: registrationIds } }).select(
    'teamName name'
  );
  const byId = new Map(registrations.map((registration) => [registration._id.toString(), registration]));

  return plainTransactions.map((transaction) => {
    const registration = transaction.registrationId
      ? byId.get(transaction.registrationId.toString())
      : null;

    return {
      ...transaction,
      registrationReference: registration?.teamName || registration?.name || ''
    };
  });
};
