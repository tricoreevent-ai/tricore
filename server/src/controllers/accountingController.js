import { Event } from '../models/Event.js';
import { Transaction } from '../models/Transaction.js';
import { isFullAccessAdminRole } from '../constants/adminAccess.js';
import {
  attachRegistrationReferences,
  buildTransactionFilters,
  getDateFilter,
  getLedgerBalances,
  getPaymentStatusReport,
  getTopPerformingEvent,
  getTransactionSummary
} from '../services/accountingService.js';
import {
  createAccountingCategory,
  deleteAccountingCategory,
  getAccountingCategories,
  getAccountingCategoryLabelMap,
  updateAccountingCategory,
  validateTransactionCategory
} from '../services/accountingCategoryService.js';
import { recordActivity } from '../services/activityLogService.js';
import { requestAdminOtp, verifyAdminOtp } from '../services/adminOtpService.js';
import {
  getInvoiceSettings,
  reserveNextInvoiceDocumentNumber
} from '../services/invoiceSettingsService.js';
import { getTransactionOtpSettingsForEnforcement } from '../services/transactionOtpSettingsService.js';
import { sendCsv } from '../utils/csv.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const buildCategoryBreakdown = async (filters, type) => {
  const categoryLabels = await getAccountingCategoryLabelMap();
  const categoryBreakdown = await Transaction.aggregate([
    {
      $match: {
        ...filters,
        type
      }
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' }
      }
    },
    { $sort: { total: -1 } }
  ]);

  return categoryBreakdown.map((item) => ({
    category: item._id,
    label: categoryLabels[item._id] || item._id,
    total: item.total
  }));
};

const normalizeText = (value) => String(value || '').trim();
const normalizeOptionalNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};
const roundCurrency = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const normalizeDateValue = (value, fallback = null) => {
  if (!value && fallback) {
    return new Date(fallback);
  }

  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
};

const addDaysToDateValue = (value, days = 0) => {
  const normalizedDate = normalizeDateValue(value);

  if (!normalizedDate) {
    return null;
  }

  const nextDate = new Date(normalizedDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + Number(days || 0));
  return nextDate;
};

const buildInvoiceDetails = async (invoiceDetails = {}, base = {}) => {
  // Pull invoice defaults from settings so tax defaults and document numbering stay centralized.
  const invoiceSettings = await getInvoiceSettings();
  const normalizedSubtotal =
    normalizeOptionalNumber(invoiceDetails.subtotal) ??
    normalizeOptionalNumber(base.amount) ??
    0;
  const normalizedIssueDate = normalizeDateValue(invoiceDetails.issueDate, base.date);
  const normalizedTaxRate =
    normalizeOptionalNumber(invoiceDetails.taxRate) ??
    normalizeOptionalNumber(invoiceSettings.defaultTaxRate) ??
    0;
  const explicitTaxAmount = normalizeOptionalNumber(invoiceDetails.taxAmount);
  const normalizedTaxAmount =
    explicitTaxAmount ?? (normalizedTaxRate > 0 ? roundCurrency((normalizedSubtotal * normalizedTaxRate) / 100) : 0);
  const normalizedTotal =
    normalizeOptionalNumber(invoiceDetails.total) ??
    roundCurrency(normalizedSubtotal + normalizedTaxAmount);
  const taxLabelInput = normalizeText(invoiceDetails.taxLabel);
  const hasTaxMetadata = taxLabelInput || normalizedTaxRate > 0 || normalizedTaxAmount > 0;
  const documentNumber =
    normalizeText(invoiceDetails.documentNumber || base.referenceDocument) ||
    (await reserveNextInvoiceDocumentNumber(normalizedIssueDate || new Date(base.date || Date.now())));

  return {
    documentNumber,
    issueDate: normalizedIssueDate,
    dueDate:
      normalizeDateValue(invoiceDetails.dueDate) ||
      addDaysToDateValue(normalizedIssueDate || base.date, invoiceSettings.paymentTermsDays || 0),
    billToName: normalizeText(invoiceDetails.billToName),
    billToCompany: normalizeText(invoiceDetails.billToCompany),
    billToEmail: normalizeText(invoiceDetails.billToEmail),
    billToPhone: normalizeText(invoiceDetails.billToPhone),
    billingAddress: normalizeText(invoiceDetails.billingAddress),
    itemDescription: normalizeText(invoiceDetails.itemDescription || base.reference),
    taxLabel: taxLabelInput || (hasTaxMetadata ? normalizeText(invoiceSettings.defaultTaxLabel || 'GST') : ''),
    taxRate: normalizedTaxRate,
    taxAmount: normalizedTaxAmount,
    subtotal: normalizedSubtotal,
    total: normalizedTotal
  };
};

const serializeTransaction = (transaction, categoryLabels, user) => ({
  ...transaction,
  categoryLabel: categoryLabels[transaction.category] || transaction.category,
  canEdit: transaction.source === 'manual' && isFullAccessAdminRole(user.role),
  canDelete: transaction.source === 'manual' && isFullAccessAdminRole(user.role)
});

const buildTimeline = async (filters) =>
  Transaction.aggregate([
    { $match: filters },
    {
      $group: {
        _id: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$date'
            }
          },
          type: '$type'
        },
        total: { $sum: '$amount' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        income: {
          $sum: {
            $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0]
          }
        },
        expenses: {
          $sum: {
            $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0]
          }
        }
      }
    },
    {
      $addFields: {
        netProfit: { $subtract: ['$income', '$expenses'] }
      }
    },
    { $sort: { _id: 1 } }
  ]);

export const createTransaction = asyncHandler(async (req, res) => {
  await validateTransactionCategory(req.body.type, req.body.category);

  if (req.body.scope !== 'common' && !req.body.eventId) {
    throw new ApiError(400, 'Event is required for event-based transactions.');
  }

  if (req.body.scope !== 'common') {
    const event = await Event.findOne({ _id: req.body.eventId, isDeleted: false });

    if (!event) {
      throw new ApiError(404, 'Event not found.');
    }
  }

  const transaction = await Transaction.create({
    ...req.body,
    eventId: req.body.scope === 'common' ? undefined : req.body.eventId,
    date: new Date(req.body.date),
    invoiceDetails: await buildInvoiceDetails(req.body.invoiceDetails, req.body),
    createdBy: req.user._id,
    source: 'manual'
  });

  const populated = await Transaction.findById(transaction._id)
    .populate('eventId', 'name sportType')
    .populate('createdBy', 'name username');
  const categoryLabels = await getAccountingCategoryLabelMap();
  await recordActivity({
    action: 'create',
    category: 'transaction',
    details: `Recorded ${transaction.type} transaction ${transaction.reference} for ${transaction.amount}.`,
    performedBy: req.user._id,
    subjectId: transaction._id.toString(),
    subjectType: 'transaction',
    summary: `Created ${transaction.type} transaction "${transaction.reference}".`
  });

  res.status(201).json({
    success: true,
    data: serializeTransaction(populated.toObject(), categoryLabels, req.user)
  });
});

export const getTransactions = asyncHandler(async (req, res) => {
  const filters = buildTransactionFilters(req.query);

  // Pagination parameters: page (1-based), limit (items per page)
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;

  // Get total count for pagination controls
  const totalCount = await Transaction.countDocuments(filters);

  // Fetch paginated transactions
  const transactionQuery = Transaction.find(filters)
    .populate('eventId', 'name sportType')
    .populate('createdBy', 'name username')
    .populate('paymentId', 'status paymentId orderId')
    .sort({ date: -1, createdAt: -1 });

  const transactions =
    req.query.format === 'csv'
      ? await transactionQuery
      : await transactionQuery.skip(skip).limit(limit);

  const withReferences = await attachRegistrationReferences(transactions);
  const categoryLabels = await getAccountingCategoryLabelMap();
  const summary = await getTransactionSummary(filters);

  if (req.query.format === 'csv') {
    sendCsv(
      res,
      withReferences.map((transaction) => ({
        scope: transaction.scope,
        event: transaction.eventId?.name || '',
        type: transaction.type,
        category: categoryLabels[transaction.category] || transaction.category,
        amount: transaction.amount,
        date: new Date(transaction.date).toISOString(),
        reference: transaction.reference,
        referenceDocument: transaction.referenceDocument || '',
        paymentMode: transaction.paymentMode,
        source: transaction.source,
        notes: transaction.notes || ''
      })),
      ['scope', 'event', 'type', 'category', 'amount', 'date', 'reference', 'referenceDocument', 'paymentMode', 'source', 'notes'],
      'transactions.csv'
    );
    return;
  }

  // Return paginated results with totalCount for frontend
  res.json({
    success: true,
    data: {
      transactions: withReferences.map((transaction) =>
        serializeTransaction(transaction, categoryLabels, req.user)
      ),
      summary,
      totalCount,
      page,
      limit
    }
  });
});

export const updateTransaction = asyncHandler(async (req, res) => {
  if (!isFullAccessAdminRole(req.user.role)) {
    throw new ApiError(403, 'Only super admin users can edit transactions.');
  }

  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found.');
  }

  if (transaction.source !== 'manual') {
    throw new ApiError(400, 'Auto-recorded payment transactions cannot be edited.');
  }

  const otpSettings = await getTransactionOtpSettingsForEnforcement();

  if (otpSettings.enabled) {
    await verifyAdminOtp({
      code: req.body.otpCode,
      purpose: 'transaction_update',
      requestedBy: req.user._id,
      resourceId: req.params.id,
      resourceType: 'transaction'
    });
  }

  const nextType = req.body.type || transaction.type;
  const nextCategory = req.body.category || transaction.category;
  const nextScope = req.body.scope || transaction.scope || (transaction.eventId ? 'event' : 'common');
  await validateTransactionCategory(nextType, nextCategory);

  const nextEventId =
    nextScope === 'common' ? undefined : req.body.eventId || transaction.eventId;

  if (nextScope !== 'common') {
    if (!nextEventId) {
      throw new ApiError(400, 'Event is required for event-based transactions.');
    }

    const event = await Event.findOne({ _id: nextEventId, isDeleted: false });

    if (!event) {
      throw new ApiError(404, 'Event not found.');
    }
  }

  const { invoiceDetails, otpCode: _otpCode, ...transactionFields } = req.body;
  const nextDate = req.body.date ? new Date(req.body.date) : transaction.date;

  Object.assign(transaction, transactionFields);
  transaction.scope = nextScope;
  transaction.eventId = nextEventId;
  transaction.date = nextDate;
  transaction.invoiceDetails = await buildInvoiceDetails(invoiceDetails || transaction.invoiceDetails, {
    amount: req.body.amount ?? transaction.amount,
    date: nextDate,
    reference: req.body.reference ?? transaction.reference,
    referenceDocument: req.body.referenceDocument ?? transaction.referenceDocument
  });

  await transaction.save();

  const populated = await Transaction.findById(transaction._id)
    .populate('eventId', 'name sportType')
    .populate('createdBy', 'name username');
  const categoryLabels = await getAccountingCategoryLabelMap();
  await recordActivity({
    action: 'update',
    category: 'transaction',
    details: `Updated transaction ${transaction.reference} to ${transaction.type} ${transaction.amount}.`,
    performedBy: req.user._id,
    subjectId: transaction._id.toString(),
    subjectType: 'transaction',
    summary: `Updated transaction "${transaction.reference}".`
  });

  res.json({
    success: true,
    data: serializeTransaction(populated.toObject(), categoryLabels, req.user)
  });
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  if (!isFullAccessAdminRole(req.user.role)) {
    throw new ApiError(403, 'Only super admin users can delete transactions.');
  }

  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found.');
  }

  if (transaction.source !== 'manual') {
    throw new ApiError(400, 'Auto-recorded payment transactions cannot be deleted.');
  }

  const otpSettings = await getTransactionOtpSettingsForEnforcement();

  if (otpSettings.enabled) {
    await verifyAdminOtp({
      code: req.body.otpCode,
      purpose: 'transaction_delete',
      requestedBy: req.user._id,
      resourceId: req.params.id,
      resourceType: 'transaction'
    });
  }

  await Transaction.findByIdAndDelete(req.params.id);
  await recordActivity({
    action: 'delete',
    category: 'transaction',
    details: `Deleted transaction ${transaction.reference} valued at ${transaction.amount}.`,
    performedBy: req.user._id,
    subjectId: transaction._id.toString(),
    subjectType: 'transaction',
    summary: `Deleted transaction "${transaction.reference}".`
  });

  res.json({
    success: true,
    message: 'Transaction deleted successfully.'
  });
});

export const requestTransactionOtp = asyncHandler(async (req, res) => {
  if (!isFullAccessAdminRole(req.user.role)) {
    throw new ApiError(403, 'Only super admin users can request transaction approval OTP codes.');
  }

  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found.');
  }

  if (transaction.source !== 'manual') {
    throw new ApiError(400, 'Auto-recorded payment transactions cannot be edited or deleted.');
  }

  const otpSettings = await getTransactionOtpSettingsForEnforcement();

  if (!otpSettings.enabled) {
    res.json({
      success: true,
      message: 'Transaction OTP approval is disabled.',
      data: {
        required: false,
        email: '',
        expiresAt: null
      }
    });
    return;
  }

  const purpose = req.body.action === 'delete' ? 'transaction_delete' : 'transaction_update';
  const approval = await requestAdminOtp({
    purpose,
    requestedBy: req.user._id,
    resourceId: req.params.id,
    resourceLabel: `${req.body.action} for transaction ${transaction.reference}`,
    resourceType: 'transaction'
  });

  res.json({
    success: true,
    message: `OTP sent to ${approval.email}.`,
    data: {
      ...approval,
      required: true
    }
  });
});

export const getManagedAccountingCategories = asyncHandler(async (req, res) => {
  const categories = await getAccountingCategories({ type: req.query.type });
  const categoryLabels = categories.reduce((accumulator, category) => {
    accumulator[category.key] = category.label;
    return accumulator;
  }, {});

  res.json({
    success: true,
    data: {
      categories,
      labelsByKey: categoryLabels
    }
  });
});

export const createManagedAccountingCategory = asyncHandler(async (req, res) => {
  const settings = await createAccountingCategory({
    payload: req.body,
    userId: req.user._id
  });

  await recordActivity({
    action: 'create',
    category: 'transaction',
    details: `Created accounting category ${req.body.label} (${req.body.type}).`,
    performedBy: req.user._id,
    subjectId: req.body.label,
    subjectType: 'accounting_category',
    summary: `Created accounting category "${req.body.label}".`
  });

  res.status(201).json({
    success: true,
    data: settings
  });
});

export const updateManagedAccountingCategory = asyncHandler(async (req, res) => {
  const settings = await updateAccountingCategory({
    key: req.params.key,
    payload: req.body,
    userId: req.user._id
  });

  await recordActivity({
    action: 'update',
    category: 'transaction',
    details: `Updated accounting category ${req.params.key} to ${req.body.label} (${req.body.type}).`,
    performedBy: req.user._id,
    subjectId: req.params.key,
    subjectType: 'accounting_category',
    summary: `Updated accounting category "${req.body.label}".`
  });

  res.json({
    success: true,
    data: settings
  });
});

export const deleteManagedAccountingCategory = asyncHandler(async (req, res) => {
  const settings = await deleteAccountingCategory({
    key: req.params.key,
    userId: req.user._id
  });

  await recordActivity({
    action: 'delete',
    category: 'transaction',
    details: `Deleted accounting category ${req.params.key}.`,
    performedBy: req.user._id,
    subjectId: req.params.key,
    subjectType: 'accounting_category',
    summary: `Deleted accounting category "${req.params.key}".`
  });

  res.json({
    success: true,
    data: settings,
    message: 'Accounting category deleted successfully.'
  });
});

export const getAccountingDashboard = asyncHandler(async (req, res) => {
  const filters = buildTransactionFilters(req.query);
  const [summary, topPerformingEvent, ledgerBalances] = await Promise.all([
    getTransactionSummary(filters),
    getTopPerformingEvent(filters),
    getLedgerBalances(filters)
  ]);

  res.json({
    success: true,
    data: {
      ...summary,
      ...ledgerBalances,
      topPerformingEvent: topPerformingEvent
        ? {
            eventId: topPerformingEvent.event._id,
            name: topPerformingEvent.event.name,
            totalIncome: topPerformingEvent.totalIncome,
            totalExpenses: topPerformingEvent.totalExpenses,
            netProfit: topPerformingEvent.netProfit
          }
        : null
    }
  });
});

export const getAccountingReports = asyncHandler(async (req, res) => {
  const filters = buildTransactionFilters(req.query);
  const summary = await getTransactionSummary(filters);
  const [eventProfitReport, incomeBreakdown, expenseBreakdown, paymentStatusReport, timeline, ledgerBalances] =
    await Promise.all([
      Transaction.aggregate([
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
            netProfitLoss: { $subtract: ['$totalIncome', '$totalExpenses'] }
          }
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
        {
          $project: {
            _id: 0,
            eventId: '$event._id',
            eventName: '$event.name',
            sportType: '$event.sportType',
            totalIncome: 1,
            totalExpenses: 1,
            netProfitLoss: 1
          }
        },
        { $sort: { netProfitLoss: -1 } }
      ]),
      buildCategoryBreakdown(filters, 'income'),
      buildCategoryBreakdown(filters, 'expense'),
      getPaymentStatusReport(req.query),
      buildTimeline(filters),
      getLedgerBalances(filters)
    ]);

  if (req.query.format === 'csv') {
    sendCsv(
      res,
      eventProfitReport,
      ['eventName', 'sportType', 'totalIncome', 'totalExpenses', 'netProfitLoss'],
      'accounting-reports.csv'
    );
    return;
  }

  res.json({
    success: true,
    data: {
      overallBusinessReport: summary,
      eventProfitReport,
      incomeReport: {
        totalIncome: summary.totalIncome,
        breakdown: incomeBreakdown
      },
      expenseReport: {
        totalExpenses: summary.totalExpenses,
        breakdown: expenseBreakdown
      },
      balanceSheet: {
        totalCredits: summary.totalIncome,
        totalDebits: summary.totalExpenses,
        closingBalance: summary.netProfit,
        ...ledgerBalances
      },
      paymentStatusReport,
      dateWiseReport: {
        timeline
      }
    }
  });
});
