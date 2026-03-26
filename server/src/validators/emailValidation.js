import { z } from 'zod';

const optionalEmailSchema = z.string().trim().email('A valid email address is required.').optional().or(z.literal(''));

export const updateEmailConfigurationSchema = z.object({
  body: z.object({
    smtpHost: z.string().trim().optional().or(z.literal('')),
    smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
    smtpSecure: z.coerce.boolean().optional(),
    smtpUser: z.string().trim().optional().or(z.literal('')),
    smtpPass: z.string().optional(),
    smtpFromEmail: optionalEmailSchema,
    smtpFromName: z.string().trim().optional().or(z.literal('')),
    toRecipients: z.array(z.string().trim().email('A valid email address is required.')).optional()
  })
});

export const sendTestEmailSchema = z.object({
  body: z.object({
    to: z.string().trim().email('A valid email address is required.')
  })
});

