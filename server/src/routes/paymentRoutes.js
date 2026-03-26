import { Router } from 'express';

import { createOrder, verifyPayment } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, verifyPaymentSchema } from '../validators/paymentValidation.js';

const router = Router();

router.post('/create-order', authenticate, validate(createOrderSchema), createOrder);
router.post('/verify-payment', authenticate, validate(verifyPaymentSchema), verifyPayment);

export default router;

