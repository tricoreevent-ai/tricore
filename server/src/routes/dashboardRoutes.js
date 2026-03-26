import { Router } from 'express';

import {
  getAccountingReport,
  getAdminDashboard,
  getReportsOverview,
  getUserDashboard
} from '../controllers/dashboardController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard/me', authenticate, getUserDashboard);
router.get(
  '/admin/dashboard',
  authenticate,
  authorizePermissions(adminPermissions.overview),
  getAdminDashboard
);
router.get(
  '/admin/accounting',
  authenticate,
  authorizePermissions(adminPermissions.accountingTransactions, adminPermissions.accountingReports),
  getAccountingReport
);
router.get(
  '/admin/reports/overview',
  authenticate,
  authorizePermissions(adminPermissions.reports),
  getReportsOverview
);

export default router;
