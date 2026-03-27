import { Router } from 'express';

import {
  approveExperimentalFixturePlanForEvent,
  autoGenerateFixtures,
  createMatch,
  generateExperimentalFixturePlanForEvent,
  getExperimentalFixturePlanForEvent,
  getMatchConfigurationForEvent,
  generateKnockoutBracket,
  getConfirmedTeamsByEvent,
  getMatchesByEvent,
  rejectExperimentalFixturePlanForEvent,
  saveExperimentalFixturePlanDraftForEvent,
  saveMatchConfigurationForEvent,
  updateMatch
} from '../controllers/matchController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  autoGenerateFixturesSchema,
  createMatchSchema,
  eventMatchesSchema,
  generateKnockoutSchema,
  matchConfigurationSchema,
  updateMatchSchema
} from '../validators/matchValidation.js';

const router = Router();

router.get(
  '/event/:eventId/configuration',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(eventMatchesSchema),
  getMatchConfigurationForEvent
);
router.put(
  '/event/:eventId/configuration',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(matchConfigurationSchema),
  saveMatchConfigurationForEvent
);
router.get(
  '/event/:eventId/experimental-ai-plan',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(eventMatchesSchema),
  getExperimentalFixturePlanForEvent
);
router.post(
  '/event/:eventId/experimental-ai-plan/generate',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(matchConfigurationSchema),
  generateExperimentalFixturePlanForEvent
);
router.put(
  '/event/:eventId/experimental-ai-plan',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(matchConfigurationSchema),
  saveExperimentalFixturePlanDraftForEvent
);
router.post(
  '/event/:eventId/experimental-ai-plan/approve',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(matchConfigurationSchema),
  approveExperimentalFixturePlanForEvent
);
router.post(
  '/event/:eventId/experimental-ai-plan/reject',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(matchConfigurationSchema),
  rejectExperimentalFixturePlanForEvent
);
router.post(
  '/',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(createMatchSchema),
  createMatch
);
router.post(
  '/generate-knockout',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(generateKnockoutSchema),
  generateKnockoutBracket
);
router.post(
  '/auto-generate',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(autoGenerateFixturesSchema),
  autoGenerateFixtures
);
router.get(
  '/event/:eventId/confirmed-teams',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(eventMatchesSchema),
  getConfirmedTeamsByEvent
);
router.put(
  '/:matchId',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(updateMatchSchema),
  updateMatch
);
router.get('/:eventId', authenticate, validate(eventMatchesSchema), getMatchesByEvent);

export default router;
