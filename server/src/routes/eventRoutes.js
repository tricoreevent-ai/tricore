import { Router } from 'express';

import {
  createEvent,
  deleteEvent,
  getEventById,
  getEventCatalog,
  getEvents,
  updateEvent
} from '../controllers/eventController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions, optionalAuthenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createEventSchema,
  eventCatalogQuerySchema,
  eventIdSchema,
  updateEventSchema
} from '../validators/eventValidation.js';

const router = Router();

router.get(
  '/catalog',
  authenticate,
  authorizePermissions(adminPermissions.events),
  validate(eventCatalogQuerySchema),
  getEventCatalog
);
router.get('/', optionalAuthenticate, getEvents);
router.get('/:id', validate(eventIdSchema), getEventById);
router.post(
  '/',
  authenticate,
  authorizePermissions(adminPermissions.events),
  validate(createEventSchema),
  createEvent
);
router.put(
  '/:id',
  authenticate,
  authorizePermissions(adminPermissions.events),
  validate(updateEventSchema),
  updateEvent
);
router.delete(
  '/:id',
  authenticate,
  authorizePermissions(adminPermissions.events),
  validate(eventIdSchema),
  deleteEvent
);

export default router;
