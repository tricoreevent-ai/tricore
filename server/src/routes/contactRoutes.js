import { Router } from 'express';

import { getContactInquiries, submitContactInquiry } from '../controllers/contactController.js';
import { adminPermissions } from '../constants/adminAccess.js';
import { authenticate, authorizePermissions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  contactInquiriesQuerySchema,
  submitContactInquirySchema
} from '../validators/contactValidation.js';

const router = Router();

router.post('/', validate(submitContactInquirySchema), submitContactInquiry);
router.get(
  '/submissions',
  authenticate,
  authorizePermissions(adminPermissions.settings),
  validate(contactInquiriesQuerySchema),
  getContactInquiries
);

export default router;
