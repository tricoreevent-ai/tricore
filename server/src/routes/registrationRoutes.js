import { Router } from 'express';

import {
  createRegistration,
  createManualRegistration,
  confirmRegistrationPayment,
  getMyRegistrationForEvent,
  getMyRegistrations,
  getRegistrations,
  updateRegistration
} from '../controllers/registrationController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createRegistrationSchema,
  createManualRegistrationSchema,
  confirmRegistrationPaymentSchema,
  registrationEventSchema,
  registrationsQuerySchema,
  updateRegistrationSchema
} from '../validators/registrationValidation.js';

const router = Router();

router.post('/', authenticate, validate(createRegistrationSchema), createRegistration);
router.post('/manual', authenticate, validate(createManualRegistrationSchema), createManualRegistration);
router.get('/me', authenticate, getMyRegistrations);
router.get('/me/event/:eventId', authenticate, validate(registrationEventSchema), getMyRegistrationForEvent);
router.get(
  '/',
  authenticate,
  authorizePermissions(adminPermissions.registrations),
  validate(registrationsQuerySchema),
  getRegistrations
);
router.put(
  '/:id',
  authenticate,
  authorizePermissions(adminPermissions.registrations),
  validate(updateRegistrationSchema),
  updateRegistration
);
router.post(
  '/:id/confirm-payment',
  authenticate,
  authorizePermissions(adminPermissions.registrations),
  validate(confirmRegistrationPaymentSchema),
  confirmRegistrationPayment
);

export default router;
