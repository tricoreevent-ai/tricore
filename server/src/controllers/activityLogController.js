import { ActivityLog } from '../models/ActivityLog.js';
import { sendCsv } from '../utils/csv.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const buildActivityFilters = (query = {}) => {
  const filters = {};

  if (query.category) {
    filters.category = query.category;
  }

  if (query.action) {
    filters.action = query.action;
  }

  if (query.subjectType) {
    filters.subjectType = query.subjectType;
  }

  if (query.dateFrom || query.dateTo) {
    filters.createdAt = {};

    if (query.dateFrom) {
      filters.createdAt.$gte = new Date(`${query.dateFrom}T00:00:00.000Z`);
    }

    if (query.dateTo) {
      filters.createdAt.$lte = new Date(`${query.dateTo}T23:59:59.999Z`);
    }
  }

  return filters;
};

export const getActivityLogs = asyncHandler(async (req, res) => {
  const filters = buildActivityFilters(req.query);
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Number.parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;

  const [totalCount, activityLogs] = await Promise.all([
    ActivityLog.countDocuments(filters),
    ActivityLog.find(filters)
      .populate('performedBy', 'name username email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
  ]);

  if (req.query.format === 'csv') {
    sendCsv(
      res,
      activityLogs.map((log) => ({
        timestamp: log.createdAt?.toISOString?.() || '',
        category: log.category,
        action: log.action,
        subjectType: log.subjectType,
        subjectId: log.subjectId,
        summary: log.summary,
        details: log.details,
        performedBy: log.performedBy?.name || log.performedBy?.username || 'System',
        email: log.performedBy?.email || ''
      })),
      ['timestamp', 'category', 'action', 'subjectType', 'subjectId', 'summary', 'details', 'performedBy', 'email'],
      'activity-history.csv'
    );
    return;
  }

  res.json({
    success: true,
    data: {
      items: activityLogs,
      totalCount,
      page,
      limit
    }
  });
});
