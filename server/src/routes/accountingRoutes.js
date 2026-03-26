import { Router } from 'express';

import {
  createManagedAccountingCategory,
  createTransaction,
  deleteManagedAccountingCategory,
  deleteTransaction,
  getAccountingDashboard,
  getManagedAccountingCategories,
  getAccountingReports,
  getTransactions,
  requestTransactionOtp,
  updateManagedAccountingCategory,
  updateTransaction
} from '../controllers/accountingController.js';
import { adminPermissions, fullAccessAdminRoles } from '../constants/adminAccess.js';
import { authenticate, authorize, authorizePermissions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  accountingCategoriesQuerySchema,
  accountingReportsQuerySchema,
  createAccountingCategorySchema,
  createTransactionSchema,
  deleteAccountingCategorySchema,
  deleteTransactionSchema,
  requestTransactionOtpSchema,
  transactionsQuerySchema,
  updateAccountingCategorySchema,
  updateTransactionSchema
} from '../validators/accountingValidation.js';

const router = Router();

router.use(authenticate);

router.get(
  '/dashboard',
  authorizePermissions(adminPermissions.accountingTransactions, adminPermissions.accountingReports),
  validate(transactionsQuerySchema),
  getAccountingDashboard
);
router.get(
  '/reports',
  authorizePermissions(adminPermissions.accountingReports),
  validate(accountingReportsQuerySchema),
  getAccountingReports
);
router.get(
  '/',
  authorizePermissions(adminPermissions.accountingTransactions),
  validate(transactionsQuerySchema),
  getTransactions
);
router.get(
  '/categories',
  authorizePermissions(adminPermissions.accountingTransactions),
  validate(accountingCategoriesQuerySchema),
  getManagedAccountingCategories
);
router.post(
  '/categories',
  authorizePermissions(adminPermissions.accountingTransactions),
  validate(createAccountingCategorySchema),
  createManagedAccountingCategory
);
router.put(
  '/categories/:key',
  authorizePermissions(adminPermissions.accountingTransactions),
  validate(updateAccountingCategorySchema),
  updateManagedAccountingCategory
);
router.delete(
  '/categories/:key',
  authorizePermissions(adminPermissions.accountingTransactions),
  validate(deleteAccountingCategorySchema),
  deleteManagedAccountingCategory
);
router.post(
  '/',
  authorizePermissions(adminPermissions.accountingTransactions),
  validate(createTransactionSchema),
  createTransaction
);
router.post(
  '/:id/request-otp',
  authorize(...fullAccessAdminRoles),
  validate(requestTransactionOtpSchema),
  requestTransactionOtp
);
router.put(
  '/:id',
  authorize(...fullAccessAdminRoles),
  validate(updateTransactionSchema),
  updateTransaction
);
router.delete(
  '/:id',
  authorize(...fullAccessAdminRoles),
  validate(deleteTransactionSchema),
  deleteTransaction
);

export default router;
