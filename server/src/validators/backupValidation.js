import { z } from 'zod';

const optionalEmailSchema = z
  .string()
  .trim()
  .email('A valid email address is required.')
  .optional()
  .or(z.literal(''));

export const updateBackupConfigurationSchema = z.object({
  body: z
    .object({
      backupEmail: optionalEmailSchema,
      scheduleFrequency: z.enum(['disabled', 'daily', 'weekly', 'monthly'])
    })
    .superRefine((value, context) => {
      if (value.scheduleFrequency !== 'disabled' && !value.backupEmail) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Backup email is required when automatic backups are enabled.',
          path: ['backupEmail']
        });
      }
    })
});

export const sendBackupNowSchema = z.object({
  body: z.object({
    email: z.string().trim().email('A valid email address is required.')
  })
});

export const restoreBackupNowSchema = z.object({
  body: z.object({
    fileName: z.string().trim().max(255).optional().or(z.literal('')),
    content: z
      .string()
      .trim()
      .min(2, 'Upload a valid backup file before restoring the database.')
      .max(100_000_000, 'Backup file is too large to restore through the settings page.')
  })
});
