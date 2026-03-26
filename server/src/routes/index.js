import { Router } from 'express';

import { getDbStatus } from '../config/db.js';
import accountingRoutes from './accountingRoutes.js';
import activityLogRoutes from './activityLogRoutes.js';
import authRoutes from './authRoutes.js';
import contactRoutes from './contactRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import eventRoutes from './eventRoutes.js';
import matchRoutes from './matchRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import publicSettingsRoutes from './publicSettingsRoutes.js';
import registrationRoutes from './registrationRoutes.js';
import securityAlertRoutes from './securityAlertRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'TriCore Events API is running.',
    data: {
      database: getDbStatus()
    }
  });
});

router.use('/auth', authRoutes);
router.use('/contact', contactRoutes);
router.use('/', publicSettingsRoutes);
router.use('/events', eventRoutes);
router.use('/register', registrationRoutes);
router.use('/', paymentRoutes);
router.use('/matches', matchRoutes);
router.use('/registrations', registrationRoutes);
router.use('/settings', settingsRoutes);
router.use('/transactions', accountingRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/security-alerts', securityAlertRoutes);
router.use('/', dashboardRoutes);

export default router;
