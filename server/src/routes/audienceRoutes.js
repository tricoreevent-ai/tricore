import { Router } from 'express';

import {
  exportAudienceUsers,
  getAudienceCampaignConfiguration,
  getAudienceCampaigns,
  getAudienceUsers,
  saveAudienceCampaignConfiguration,
  sendAudienceCampaign,
  unsubscribeAudienceEmail
} from '../controllers/audienceController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  audienceCampaignConfigSchema,
  audienceCampaignListQuerySchema,
  audienceUnsubscribeSchema,
  audienceUsersExportQuerySchema,
  audienceUsersQuerySchema,
  sendAudienceCampaignSchema
} from '../validators/audienceValidation.js';

const router = Router();

router.get('/unsubscribe', validate(audienceUnsubscribeSchema), unsubscribeAudienceEmail);

router.use(authenticate, authorizePermissions(adminPermissions.users));
router.get('/users/export', validate(audienceUsersExportQuerySchema), exportAudienceUsers);
router.get('/users', validate(audienceUsersQuerySchema), getAudienceUsers);
router.get('/campaign-config', getAudienceCampaignConfiguration);
router.put(
  '/campaign-config',
  validate(audienceCampaignConfigSchema),
  saveAudienceCampaignConfiguration
);
router.get('/campaigns', validate(audienceCampaignListQuerySchema), getAudienceCampaigns);
router.post('/campaigns', validate(sendAudienceCampaignSchema), sendAudienceCampaign);

export default router;
