import { z } from 'zod';

export const submitContactInquirySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name is required.'),
    email: z.string().trim().email('A valid email address is required.'),
    phone: z
      .string()
      .trim()
      .max(30, 'Phone number should not exceed 30 characters.')
      .regex(/^[0-9+\-() ]*$/, 'Enter a valid phone number.')
      .optional(),
    message: z
      .string()
      .trim()
      .min(5, 'Message should be at least 5 characters.')
      .max(5000, 'Message should not exceed 5000 characters.')
  })
});

export const contactInquiriesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
});

export const updateContactForwardingSchema = z.object({
  body: z.object({
    contactInquiryEmails: z
      .array(z.string().trim().email('A valid forwarding email is required.'))
      .max(25, 'You can add up to 25 contact forwarding email addresses.')
      .optional(),
    registrationCompletedEmails: z
      .array(z.string().trim().email('A valid forwarding email is required.'))
      .max(25, 'You can add up to 25 completed registration email addresses.')
      .optional(),
    registrationFollowUpEmails: z
      .array(z.string().trim().email('A valid forwarding email is required.'))
      .max(25, 'You can add up to 25 follow-up registration email addresses.')
      .optional(),
    emails: z
      .array(z.string().trim().email('A valid forwarding email is required.'))
      .max(25, 'You can add up to 25 forwarding email addresses.')
      .optional()
  })
});
