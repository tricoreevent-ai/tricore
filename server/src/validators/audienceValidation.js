import { z } from 'zod';

const audienceSegmentSchema = z.enum(['all', 'registered', 'current', 'previous', 'interested']);
const audienceSortSchema = z.enum(['recent', 'name']);
const optionalObjectIdString = () =>
  z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'A valid event id is required.')
    .optional()
    .or(z.literal(''));

const optionalTrimmedString = () => z.string().trim().optional().or(z.literal(''));

const audienceFiltersSchema = z.object({
  search: optionalTrimmedString().default(''),
  segment: audienceSegmentSchema.optional().default('all'),
  eventId: optionalObjectIdString().default(''),
  sort: audienceSortSchema.optional().default('recent')
});

export const audienceUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: optionalTrimmedString().default(''),
    segment: audienceSegmentSchema.optional().default('all'),
    eventId: optionalObjectIdString().default(''),
    sort: audienceSortSchema.optional().default('recent')
  })
});

export const audienceUsersExportQuerySchema = z.object({
  query: z.object({
    search: optionalTrimmedString().default(''),
    segment: audienceSegmentSchema.optional().default('all'),
    eventId: optionalObjectIdString().default(''),
    sort: audienceSortSchema.optional().default('recent')
  })
});

export const audienceCampaignListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10)
  })
});

export const audienceCampaignConfigSchema = z.object({
  body: z.object({
    enableEmail: z.boolean().optional().default(true),
    enableSms: z.boolean().optional().default(false),
    enableWhatsApp: z.boolean().optional().default(false),
    smsProviderName: optionalTrimmedString().default(''),
    whatsappProviderName: optionalTrimmedString().default(''),
    defaultReplyTo: z.string().trim().email('A valid reply-to email is required.').optional().or(z.literal('')),
    deliveryNotes: optionalTrimmedString().default('')
  })
});

export const sendAudienceCampaignSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, 'Campaign name is required.'),
      subject: z.string().trim().min(3, 'Email subject is required.'),
      previewText: optionalTrimmedString().default(''),
      message: z.string().trim().min(10, 'Campaign message is required.'),
      ctaLabel: optionalTrimmedString().default(''),
      ctaUrl: optionalTrimmedString().default(''),
      targetMode: z.enum(['filtered', 'selected']).optional().default('filtered'),
      selectedEmails: z.array(z.string().trim().email('A valid recipient email is required.')).optional().default([]),
      filters: audienceFiltersSchema.optional().default({}),
      channels: z
        .object({
          email: z.boolean().optional().default(true),
          sms: z.boolean().optional().default(false),
          whatsapp: z.boolean().optional().default(false)
        })
        .optional()
        .default({})
    })
    .superRefine((value, context) => {
      if (!value.channels.email) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Email must remain enabled for audience campaigns.',
          path: ['channels', 'email']
        });
      }

      if (value.targetMode === 'selected' && !value.selectedEmails.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Choose at least one selected recipient email.',
          path: ['selectedEmails']
        });
      }
    })
});

export const audienceUnsubscribeSchema = z.object({
  query: z.object({
    token: z.string().trim().min(1, 'Unsubscribe token is required.')
  })
});
