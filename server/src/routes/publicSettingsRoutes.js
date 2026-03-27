import { Router } from 'express';

import {
  getPublicHomeBannerConfiguration,
  getPublicHomePageConfiguration,
  getPublicPaymentConfiguration,
  getPublicSiteConfiguration
} from '../controllers/settingsController.js';

const router = Router();

router.get('/home-banners', getPublicHomeBannerConfiguration);
router.get('/home-page', getPublicHomePageConfiguration);
router.get('/payment-settings', getPublicPaymentConfiguration);
router.get('/site-settings', getPublicSiteConfiguration);

export default router;
