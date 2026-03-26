import { Router } from 'express';

import {
  downloadBackupNow,
  getBackupConfiguration,
  getContactForwarding,
  getEmailConfiguration,
  getHomeBannerConfiguration,
  getHomePageConfiguration,
  getInvoiceConfiguration,
  getPaymentConfiguration,
  getPublicSiteConfiguration,
  getTransactionOtpConfiguration,
  saveBackupConfiguration,
  saveContactForwarding,
  saveEmailConfiguration,
  saveHomeBannerConfiguration,
  saveHomePageConfiguration,
  saveInvoiceConfiguration,
  savePaymentConfiguration,
  savePublicSiteConfiguration,
  saveTransactionOtpConfiguration,
  restoreBackupNow,
  sendBackupNow,
  sendTestEmail
} from '../controllers/settingsController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  restoreBackupNowSchema,
  sendBackupNowSchema,
  updateBackupConfigurationSchema
} from '../validators/backupValidation.js';
import { updateContactForwardingSchema } from '../validators/contactValidation.js';
import { sendTestEmailSchema, updateEmailConfigurationSchema } from '../validators/emailValidation.js';
import { updateHomeBannerConfigurationSchema } from '../validators/homeBannerValidation.js';
import { updateHomePageContentConfigurationSchema } from '../validators/homePageContentValidation.js';
import { updateInvoiceConfigurationSchema } from '../validators/invoiceSettingsValidation.js';
import { updatePaymentConfigurationSchema } from '../validators/paymentSettingsValidation.js';
import { updatePublicSiteSettingsSchema } from '../validators/siteSettingsValidation.js';
import { updateTransactionOtpConfigurationSchema } from '../validators/transactionOtpValidation.js';

const router = Router();

router.get(
  '/contact-forwarding',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  getContactForwarding
);
router.put(
  '/contact-forwarding',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(updateContactForwardingSchema),
  saveContactForwarding
);

router.get('/email', authenticate, authorizePermissions(adminPermissions.settings), getEmailConfiguration);
router.put(
  '/email',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(updateEmailConfigurationSchema),
  saveEmailConfiguration
);
router.post(
  '/email/test',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(sendTestEmailSchema),
  sendTestEmail
);

router.get(
  '/invoice',
  authenticate,
  authorizePermissions(adminPermissions.settings, adminPermissions.accountingTransactions),
  getInvoiceConfiguration
);
router.put(
  '/invoice',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(updateInvoiceConfigurationSchema),
  saveInvoiceConfiguration
);

router.get('/backup', authenticate, authorizePermissions(adminPermissions.settings), getBackupConfiguration);
router.put(
  '/backup',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(updateBackupConfigurationSchema),
  saveBackupConfiguration
);
router.get(
  '/backup/download',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  downloadBackupNow
);
router.post(
  '/backup/send',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(sendBackupNowSchema),
  sendBackupNow
);
router.post(
  '/backup/restore',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(restoreBackupNowSchema),
  restoreBackupNow
);
router.get(
  '/transaction-otp',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  getTransactionOtpConfiguration
);
router.put(
  '/transaction-otp',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(updateTransactionOtpConfigurationSchema),
  saveTransactionOtpConfiguration
);

router.get('/payment', authenticate, authorizePermissions(adminPermissions.settings), getPaymentConfiguration);
router.put(
  '/payment',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(updatePaymentConfigurationSchema),
  savePaymentConfiguration
);

router.get('/home-banners', authenticate, authorizePermissions(adminPermissions.settings), getHomeBannerConfiguration);
router.put(
  '/home-banners',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(updateHomeBannerConfigurationSchema),
  saveHomeBannerConfiguration
);

router.get('/home-page', authenticate, authorizePermissions(adminPermissions.settings), getHomePageConfiguration);
router.put(
  '/home-page',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(updateHomePageContentConfigurationSchema),
  saveHomePageConfiguration
);

router.get(
  '/public-site',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  getPublicSiteConfiguration
);
router.put(
  '/public-site',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(updatePublicSiteSettingsSchema),
  savePublicSiteConfiguration
);

export default router;
