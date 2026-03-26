import { Router } from 'express';

import {
  getPublicHomeBannerConfiguration,
  getPublicHomePageConfiguration,
  getPublicPaymentConfiguration
} from '../controllers/settingsController.js';

const router = Router();

router.get('/home-banners', getPublicHomeBannerConfiguration);
router.get('/home-page', getPublicHomePageConfiguration);
router.get('/payment-settings', getPublicPaymentConfiguration);

export default router;
