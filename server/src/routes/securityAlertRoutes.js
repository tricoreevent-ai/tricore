import { Router } from 'express';

import {
  acknowledgeSecurityAlertById,
  listSecurityAlerts
} from '../controllers/securityAlertController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  acknowledgeSecurityAlertSchema,
  securityAlertQuerySchema
} from '../validators/securityAlertValidation.js';

const router = Router();

router.get(
  '/',
  authenticate,
  authorizePermissions(
    adminPermissions.overview,
    adminPermissions.reports,
    adminPermissions.settings
  ),
  validate(securityAlertQuerySchema),
  listSecurityAlerts
);

router.post(
  '/:id/acknowledge',
  authenticate,
  authorizePermissions(
    adminPermissions.overview,
    adminPermissions.reports,
    adminPermissions.settings
  ),
  validate(acknowledgeSecurityAlertSchema),
  acknowledgeSecurityAlertById
);

export default router;
