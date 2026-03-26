import { z } from 'zod';

const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => String(value || '').trim().toLowerCase())
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Enter a valid OTP recipient email address.'
  });

export const updateTransactionOtpConfigurationSchema = z.object({
  body: z.object({
    enabled: z.coerce.boolean(),
    deliveryEmail: optionalEmailSchema
  })
});
