import { ActivityLog } from '../models/ActivityLog.js';

const normalizeText = (value) => String(value || '').trim();

export const recordActivity = async ({
  action,
  category,
  details = '',
  metadata = {},
  performedBy = null,
  subjectId = '',
  subjectType,
  summary
}) => {
  try {
    await ActivityLog.create({
      category: normalizeText(category),
      action: normalizeText(action),
      subjectType: normalizeText(subjectType),
      subjectId: normalizeText(subjectId),
      summary: normalizeText(summary),
      details: normalizeText(details),
      metadata,
      performedBy
    });
  } catch (error) {
    console.warn('Activity log warning:', error.message);
  }
};
