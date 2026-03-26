import { Event } from '../models/Event.js';
import { Match } from '../models/Match.js';
import { Payment } from '../models/Payment.js';
import { Registration } from '../models/Registration.js';
import { SecurityAlert } from '../models/SecurityAlert.js';
import { confirmedPaymentStatuses, normalizePaymentStatus } from '../services/paymentStatusService.js';
import { serializeRegistrationRecord } from '../services/registrationViewService.js';
import { sendCsv } from '../utils/csv.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getUserDashboard = asyncHandler(async (req, res) => {
  const registrations = await Registration.find({ userId: req.user._id })
    .populate('eventId')
    .populate('paymentId')
    .sort({ createdAt: -1 });

  const eventIds = registrations.map((registration) => registration.eventId?._id).filter(Boolean);

  const matches = await Match.find({
    eventId: { $in: eventIds }
  })
    .populate('eventId', 'name sportType')
    .sort({ scheduledAt: 1 });

  res.json({
    success: true,
    data: {
      registrations: registrations.map((registration) => serializeRegistrationRecord(registration)),
      matches
    }
  });
});

export const getAdminDashboard = asyncHandler(async (_req, res) => {
  const [
    totalEvents,
    totalRegistrations,
    revenueAggregation,
    recentPayments,
    paymentStatusAggregation,
    monthlyRevenueTrend,
    sportRegistrationBreakdown,
    upcomingEvents,
    openSecurityAlerts,
    latestAlerts
  ] = await Promise.all([
    Event.countDocuments({ isDeleted: false }),
    Registration.countDocuments(),
    Payment.aggregate([
      { $match: { status: { $in: confirmedPaymentStatuses } } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]),
    Payment.find({ status: { $in: confirmedPaymentStatuses } })
      .populate('eventId', 'name')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5),
    Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),
    Payment.aggregate([
      { $match: { status: { $in: confirmedPaymentStatuses } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$createdAt'
            }
          },
          totalRevenue: { $sum: '$amount' },
          confirmedPayments: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 6 },
      { $sort: { _id: 1 } }
    ]),
    Registration.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $group: {
          _id: '$event.sportType',
          totalRegistrations: { $sum: 1 }
        }
      },
      { $sort: { totalRegistrations: -1 } },
      { $limit: 6 }
    ]),
    Event.find({
      isDeleted: false,
      startDate: { $gte: new Date() }
    })
      .select('name venue startDate registrationDeadline registrationCount maxParticipants sportType')
      .sort({ startDate: 1 })
      .limit(4),
    SecurityAlert.countDocuments({ status: 'open' }),
    SecurityAlert.find({ status: 'open' })
      .sort({ lastSeenAt: -1 })
      .limit(5)
  ]);

  const paymentStatusCounts = paymentStatusAggregation.reduce(
    (accumulator, item) => {
      const normalizedStatus = normalizePaymentStatus(item._id);
      accumulator[normalizedStatus] = (accumulator[normalizedStatus] || 0) + item.count;
      return accumulator;
    },
    {
      Confirmed: 0,
      Pending: 0,
      'Under Review': 0,
      Failed: 0
    }
  );

  res.json({
    success: true,
    data: {
      totalEvents,
      totalRegistrations,
      totalRevenue: revenueAggregation[0]?.totalRevenue || 0,
      recentPayments,
      paymentStatusCounts,
      monthlyRevenueTrend: monthlyRevenueTrend.map((item) => ({
        month: item._id,
        label: item._id,
        totalRevenue: item.totalRevenue,
        confirmedPayments: item.confirmedPayments
      })),
      sportRegistrationBreakdown: sportRegistrationBreakdown.map((item) => ({
        sportType: item._id || 'Other',
        totalRegistrations: item.totalRegistrations
      })),
      upcomingEvents,
      openSecurityAlerts,
      openAlerts: openSecurityAlerts,
      latestAlerts
    }
  });
});

export const getAccountingReport = asyncHandler(async (req, res) => {
  const filters = {};

  if (req.query.status) {
    filters.status = req.query.status;
  }

  if (req.query.eventId) {
    filters.eventId = req.query.eventId;
  }

  const payments = await Payment.find(filters)
    .populate('userId', 'name email')
    .populate('eventId', 'name sportType')
    .sort({ createdAt: -1 });

  const summary = payments.reduce(
    (accumulator, payment) => {
      const normalizedStatus = normalizePaymentStatus(payment.status);
      accumulator.totalRevenue += normalizedStatus === 'Confirmed' ? payment.amount : 0;
      accumulator.counts[normalizedStatus] = (accumulator.counts[normalizedStatus] || 0) + 1;
      return accumulator;
    },
    {
      totalRevenue: 0,
      counts: {}
    }
  );

  if (req.query.format === 'csv') {
    sendCsv(
      res,
      payments.map((payment) => ({
        event: payment.eventId?.name || '',
        user: payment.userId?.name || '',
        email: payment.userId?.email || '',
        amount: payment.amount,
        status: payment.status,
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        createdAt: payment.createdAt.toISOString()
      })),
      ['event', 'user', 'email', 'amount', 'status', 'orderId', 'paymentId', 'createdAt'],
      'accounting-report.csv'
    );
    return;
  }

  res.json({
    success: true,
    data: {
      payments,
      summary
    }
  });
});

export const getReportsOverview = asyncHandler(async (req, res) => {
  const [eventMetrics, sportTypeAnalytics] = await Promise.all([
    Event.aggregate([
      { $match: { isDeleted: false } },
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
        $project: {
          name: 1,
          sportType: 1,
          venue: 1,
          registrationCount: { $size: '$registrations' },
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
        $sort: { registrationCount: -1 }
      }
    ]),
    Registration.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $group: {
          _id: '$event.sportType',
          totalRegistrations: { $sum: 1 }
        }
      },
      { $sort: { totalRegistrations: -1 } }
    ])
  ]);

  if (req.query.format === 'csv') {
    sendCsv(
      res,
      eventMetrics,
      ['name', 'sportType', 'venue', 'registrationCount', 'revenue'],
      'reports-overview.csv'
    );
    return;
  }

  res.json({
    success: true,
    data: {
      eventMetrics,
      sportTypeAnalytics
    }
  });
});
