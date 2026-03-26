import { Router } from 'express';

import { getActivityLogs } from '../controllers/activityLogController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { activityLogQuerySchema } from '../validators/activityLogValidation.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorizePermissions(adminPermissions.reports, adminPermissions.accountingReports),
  validate(activityLogQuerySchema),
  getActivityLogs
);

export default router;
