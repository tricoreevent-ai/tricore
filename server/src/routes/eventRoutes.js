import { Router } from 'express';

import {
  createSportsCalendarEvent,
  createEvent,
  deleteSportsCalendarEvent,
  getAdminCalendarFeed,
  deleteEvent,
  getEventById,
  getEventCatalog,
  getEvents,
  getSportsCalendarEvents,
  updateSportsCalendarEvent,
  updateEvent
} from '../controllers/eventController.js';
import {
  createEventInterest,
  getAdminEventInterests,
  sendAdminEventInterestEmail
} from '../controllers/eventInterestController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions, optionalAuthenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  adminEventInterestSchema,
  createEventInterestSchema,
  sendEventInterestEmailSchema
} from '../validators/eventInterestValidation.js';
import {
  calendarFeedQuerySchema,
  createSportsCalendarEventSchema,
  sportsCalendarEventIdSchema,
  updateSportsCalendarEventSchema
} from '../validators/calendarValidation.js';
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
router.get(
  '/calendar-feed',
  authenticate,
  authorizePermissions(adminPermissions.events, adminPermissions.overview),
  validate(calendarFeedQuerySchema),
  getAdminCalendarFeed
);
router.get(
  '/sports-calendar-events',
  authenticate,
  authorizePermissions(adminPermissions.events, adminPermissions.overview),
  getSportsCalendarEvents
);
router.post(
  '/sports-calendar-events',
  authenticate,
  authorizePermissions(adminPermissions.events),
  validate(createSportsCalendarEventSchema),
  createSportsCalendarEvent
);
router.put(
  '/sports-calendar-events/:id',
  authenticate,
  authorizePermissions(adminPermissions.events),
  validate(updateSportsCalendarEventSchema),
  updateSportsCalendarEvent
);
router.delete(
  '/sports-calendar-events/:id',
  authenticate,
  authorizePermissions(adminPermissions.events),
  validate(sportsCalendarEventIdSchema),
  deleteSportsCalendarEvent
);
router.get('/', optionalAuthenticate, getEvents);
router.get(
  '/:id/interests',
  authenticate,
  authorizePermissions(adminPermissions.events),
  validate(adminEventInterestSchema),
  getAdminEventInterests
);
router.post(
  '/:id/interests',
  optionalAuthenticate,
  validate(createEventInterestSchema),
  createEventInterest
);
router.post(
  '/:id/interests/send-email',
  authenticate,
  authorizePermissions(adminPermissions.events),
  validate(sendEventInterestEmailSchema),
  sendAdminEventInterestEmail
);
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
