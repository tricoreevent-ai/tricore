import { Router } from 'express';

import {
  createMatch,
  generateKnockoutBracket,
  getConfirmedTeamsByEvent,
  getMatchesByEvent
} from '../controllers/matchController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createMatchSchema,
  eventMatchesSchema,
  generateKnockoutSchema
} from '../validators/matchValidation.js';

const router = Router();

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
router.get(
  '/event/:eventId/confirmed-teams',
  authenticate,
  authorizePermissions(adminPermissions.matches),
  validate(eventMatchesSchema),
  getConfirmedTeamsByEvent
);
router.get('/:eventId', authenticate, validate(eventMatchesSchema), getMatchesByEvent);

export default router;
