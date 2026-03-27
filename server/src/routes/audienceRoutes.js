import { Router } from 'express';

import {
  createAudienceCampaignItem,
  createAudienceCampaignTemplateItem,
  exportAudienceCampaigns,
  exportAudienceUsers,
  getAudienceCampaignConfiguration,
  getAudienceCampaignDashboardSummary,
  getAudienceCampaigns,
  getAudienceCampaignTemplateLibrary,
  getAudienceUnsubscribedUsers,
  getAudienceUserCampaignHistoryItems,
  getAudienceUsers,
  reviewAudienceCampaignItem,
  saveAudienceCampaignConfiguration,
  sendAudienceCampaignTestMessage,
  trackAudienceCampaignClick,
  trackAudienceCampaignOpen,
  unsubscribeAudienceEmail,
  updateAudienceCampaignTemplateItem,
  updateAudienceUserPreferenceItem,
  deleteAudienceCampaignTemplateItem
} from '../controllers/audienceController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  audienceCampaignApprovalSchema,
  audienceCampaignConfigSchema,
  audienceCampaignListQuerySchema,
  audienceCampaignTemplateCreateSchema,
  audienceCampaignTemplateUpdateSchema,
  audienceCampaignTestSchema,
  audiencePreferenceUpdateSchema,
  audienceTemplateDeleteSchema,
  audienceTrackingSchema,
  audienceUnsubscribedUsersQuerySchema,
  audienceUnsubscribeSchema,
  audienceUserCampaignHistorySchema,
  audienceUsersExportQuerySchema,
  audienceUsersQuerySchema,
  sendAudienceCampaignSchema
} from '../validators/audienceValidation.js';

const router = Router();

router.get('/unsubscribe', validate(audienceUnsubscribeSchema), unsubscribeAudienceEmail);
router.get('/tracking/open', validate(audienceTrackingSchema), trackAudienceCampaignOpen);
router.get('/tracking/click', validate(audienceTrackingSchema), trackAudienceCampaignClick);

router.use(authenticate, authorizePermissions(adminPermissions.users));

router.get('/users/export', validate(audienceUsersExportQuerySchema), exportAudienceUsers);
router.get('/users/history', validate(audienceUserCampaignHistorySchema), getAudienceUserCampaignHistoryItems);
router.get('/users/unsubscribed', validate(audienceUnsubscribedUsersQuerySchema), getAudienceUnsubscribedUsers);
router.get('/users', validate(audienceUsersQuerySchema), getAudienceUsers);
router.put(
  '/users/:email/preferences',
  validate(audiencePreferenceUpdateSchema),
  updateAudienceUserPreferenceItem
);

router.get('/campaign-config', getAudienceCampaignConfiguration);
router.put(
  '/campaign-config',
  validate(audienceCampaignConfigSchema),
  saveAudienceCampaignConfiguration
);
router.get('/campaign-dashboard', getAudienceCampaignDashboardSummary);
router.get('/campaigns/export', exportAudienceCampaigns);
router.get('/campaigns', validate(audienceCampaignListQuerySchema), getAudienceCampaigns);
router.post('/campaigns', validate(sendAudienceCampaignSchema), createAudienceCampaignItem);
router.post('/campaigns/test', validate(audienceCampaignTestSchema), sendAudienceCampaignTestMessage);
router.post(
  '/campaigns/:campaignId/review',
  validate(audienceCampaignApprovalSchema),
  reviewAudienceCampaignItem
);

router.get('/campaign-templates', getAudienceCampaignTemplateLibrary);
router.post(
  '/campaign-templates',
  validate(audienceCampaignTemplateCreateSchema),
  createAudienceCampaignTemplateItem
);
router.put(
  '/campaign-templates/:templateId',
  validate(audienceCampaignTemplateUpdateSchema),
  updateAudienceCampaignTemplateItem
);
router.delete(
  '/campaign-templates/:templateId',
  validate(audienceTemplateDeleteSchema),
  deleteAudienceCampaignTemplateItem
);

export default router;
