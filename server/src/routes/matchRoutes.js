import { Router } from 'express';

import {
  autoGenerateFixtures,
  createMatch,
  getMatchConfigurationForEvent,
  generateKnockoutBracket,
  getConfirmedTeamsByEvent,
  getMatchesByEvent,
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
