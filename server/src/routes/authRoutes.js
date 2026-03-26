import { Router } from 'express';

import {
  adminLogin,
  changeAdminPassword,
  createAdminRoleTemplate,
  deleteAdminRoleTemplate,
  createAdminUser,
  getAdminRoleTemplates,
  getCurrentAdminPermissions,
  getAdminUsers,
  getCurrentUser,
  googleAuth,
  updateAdminRoleTemplateStatus,
  updateAdminRoleTemplate,
  updateAdminUserAccess,
  updateCurrentUserPayoutDetails
} from '../controllers/authController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adminLoginSchema,
  changeAdminPasswordSchema,
  createAdminRoleTemplateSchema,
  createAdminUserSchema,
  deleteAdminRoleTemplateSchema,
  googleAuthSchema,
  updateAdminRoleTemplateStatusSchema,
  updateAdminRoleTemplateSchema,
  updateAdminUserAccessSchema,
  updatePayoutDetailsSchema
} from '../validators/authValidation.js';

const router = Router();

router.post('/google', validate(googleAuthSchema), googleAuth);
router.post('/admin/login', validate(adminLoginSchema), adminLogin);
router.get('/me', authenticate, getCurrentUser);
router.get(
  '/admin/permissions',
  authenticate,
  authorizePermissions(adminPermissions.overview),
  getCurrentAdminPermissions
);
router.put('/me/payout-details', authenticate, validate(updatePayoutDetailsSchema), updateCurrentUserPayoutDetails);
router.get('/admin/users', authenticate, authorizePermissions(adminPermissions.users), getAdminUsers);
router.get(
  '/admin/role-templates',
  authenticate,
  authorizePermissions(adminPermissions.users),
  getAdminRoleTemplates
);
router.post(
  '/admin/users',
  authenticate,
  authorizePermissions(adminPermissions.users),
  validate(createAdminUserSchema),
  createAdminUser
);
router.post(
  '/admin/role-templates',
  authenticate,
  authorizePermissions(adminPermissions.users),
  validate(createAdminRoleTemplateSchema),
  createAdminRoleTemplate
);
router.put(
  '/admin/users/:id/access',
  authenticate,
  authorizePermissions(adminPermissions.users),
  validate(updateAdminUserAccessSchema),
  updateAdminUserAccess
);
router.put(
  '/admin/role-templates/:key',
  authenticate,
  authorizePermissions(adminPermissions.users),
  validate(updateAdminRoleTemplateSchema),
  updateAdminRoleTemplate
);
router.patch(
  '/admin/role-templates/:key/status',
  authenticate,
  authorizePermissions(adminPermissions.users),
  validate(updateAdminRoleTemplateStatusSchema),
  updateAdminRoleTemplateStatus
);
router.delete(
  '/admin/role-templates/:key',
  authenticate,
  authorizePermissions(adminPermissions.users),
  validate(deleteAdminRoleTemplateSchema),
  deleteAdminRoleTemplate
);
router.post(
  '/admin/change-password',
  authenticate,
  authorizePermissions(adminPermissions.overview),
  validate(changeAdminPasswordSchema),
  changeAdminPassword
);

export default router;
