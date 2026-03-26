import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  acknowledgeSecurityAlert,
  getSecurityAlerts
} from '../services/securityAlertService.js';

export const listSecurityAlerts = asyncHandler(async (req, res) => {
  const result = await getSecurityAlerts({
    status: req.query.status,
    severity: req.query.severity,
    category: req.query.category,
    page: req.query.page,
    limit: req.query.limit
  });

  res.json({
    success: true,
    data: result
  });
});

export const acknowledgeSecurityAlertById = asyncHandler(async (req, res) => {
  const alert = await acknowledgeSecurityAlert({
    alertId: req.params.id,
    userId: req.user._id
  });

  if (!alert) {
    throw new ApiError(404, 'Security alert not found.');
  }

  res.json({
    success: true,
    data: alert
  });
});
