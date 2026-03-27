import { z } from 'zod';

const audienceSegmentSchema = z.enum(['all', 'registered', 'current', 'previous', 'interested']);
const audienceSortSchema = z.enum(['recent', 'name']);
const audiencePaymentStatusSchema = z.enum([
  'all',
  'pending',
  'under_review',
  'confirmed',
  'failed'
]);
const audienceEngagementLevelSchema = z.enum(['all', 'low', 'medium', 'high']);
const campaignActionSchema = z.enum(['send_now', 'save_draft', 'schedule', 'submit_for_approval']);
const campaignReviewActionSchema = z.enum(['approve', 'reject']);
const campaignTypeSchema = z.enum(['bulk_email', 'reminder', 'promotion', 'workflow']);
const campaignChannelSchema = z.enum(['email', 'sms', 'whatsapp', 'push']);
const fallbackChannelSchema = z.enum(['none', 'email', 'sms', 'whatsapp', 'push']);

const optionalObjectIdString = () =>
  z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, 'A valid id is required.')
    .optional()
    .or(z.literal(''));

const optionalTrimmedString = () => z.string().trim().optional().or(z.literal(''));
const optionalEmailString = () => z.string().trim().email('A valid email is required.').optional().or(z.literal(''));

const audienceFiltersSchema = z.object({
  search: optionalTrimmedString().default(''),
  segment: audienceSegmentSchema.optional().default('all'),
  eventId: optionalObjectIdString().default(''),
  paymentStatus: audiencePaymentStatusSchema.optional().default('all'),
  location: optionalTrimmedString().default(''),
  tag: optionalTrimmedString().default(''),
  engagementLevel: audienceEngagementLevelSchema.optional().default('all'),
  sort: audienceSortSchema.optional().default('recent')
});

export const audienceUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: optionalTrimmedString().default(''),
    segment: audienceSegmentSchema.optional().default('all'),
    eventId: optionalObjectIdString().default(''),
    paymentStatus: audiencePaymentStatusSchema.optional().default('all'),
    location: optionalTrimmedString().default(''),
    tag: optionalTrimmedString().default(''),
    engagementLevel: audienceEngagementLevelSchema.optional().default('all'),
    sort: audienceSortSchema.optional().default('recent')
  })
});

export const audienceUsersExportQuerySchema = z.object({
  query: z.object({
    search: optionalTrimmedString().default(''),
    segment: audienceSegmentSchema.optional().default('all'),
    eventId: optionalObjectIdString().default(''),
    paymentStatus: audiencePaymentStatusSchema.optional().default('all'),
    location: optionalTrimmedString().default(''),
    tag: optionalTrimmedString().default(''),
    engagementLevel: audienceEngagementLevelSchema.optional().default('all'),
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
    emailProvider: optionalTrimmedString().default('smtp'),
    enableSms: z.boolean().optional().default(false),
    smsProviderName: optionalTrimmedString().default(''),
    enableWhatsApp: z.boolean().optional().default(false),
    whatsappProviderName: optionalTrimmedString().default(''),
    enablePush: z.boolean().optional().default(false),
    pushProviderName: optionalTrimmedString().default(''),
    fallbackChannel: fallbackChannelSchema.optional().default('none'),
    defaultReplyTo: optionalEmailString().default(''),
    deliveryNotes: optionalTrimmedString().default(''),
    requireApproval: z.boolean().optional().default(false),
    sendThrottlePerMinute: z.coerce.number().min(0).max(600).optional().default(180),
    smsCostPerMessage: z.coerce.number().min(0).optional().default(0),
    whatsappCostPerMessage: z.coerce.number().min(0).optional().default(0),
    costCurrency: optionalTrimmedString().default('INR')
  })
});

const campaignChannelsSchema = z
  .object({
    email: z.boolean().optional().default(true),
    sms: z.boolean().optional().default(false),
    whatsapp: z.boolean().optional().default(false),
    push: z.boolean().optional().default(false)
  })
  .optional()
  .default({});

const audienceCampaignBodyShape = z.object({
    name: z.string().trim().min(2, 'Campaign name is required.'),
    campaignType: campaignTypeSchema.optional().default('bulk_email'),
    subject: optionalTrimmedString().default(''),
    previewText: optionalTrimmedString().default(''),
    message: optionalTrimmedString().default(''),
    ctaLabel: optionalTrimmedString().default(''),
    ctaUrl: optionalTrimmedString().default(''),
    targetMode: z.enum(['filtered', 'selected']).optional().default('filtered'),
    selectedEmails: z.array(z.string().trim().email('A valid recipient email is required.')).optional().default([]),
    filters: audienceFiltersSchema.optional().default({}),
    channels: campaignChannelsSchema,
    launchAction: campaignActionSchema.optional().default('send_now'),
    templateId: optionalObjectIdString().default(''),
    fallbackChannel: fallbackChannelSchema.optional().default('none'),
    requiresApproval: z.boolean().optional(),
    scheduledAt: optionalTrimmedString().default(''),
    timezone: optionalTrimmedString().default('Asia/Calcutta'),
    notes: optionalTrimmedString().default('')
  });

const audienceCampaignBodySchema = audienceCampaignBodyShape.superRefine((value, context) => {
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

    if (value.launchAction === 'schedule' && !value.scheduledAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A scheduled date and time is required when scheduling a campaign.',
        path: ['scheduledAt']
      });
    }
  });

export const sendAudienceCampaignSchema = z.object({
  body: audienceCampaignBodySchema
});

export const audienceCampaignTestSchema = z.object({
  body: audienceCampaignBodyShape.extend({
    targetEmail: z.string().trim().email('A valid test email is required.')
  }).superRefine((value, context) => {
    if (!value.channels.email) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Email must remain enabled for audience campaigns.',
        path: ['channels', 'email']
      });
    }
  })
});

export const audienceCampaignApprovalSchema = z.object({
  params: z.object({
    campaignId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'A valid campaign id is required.')
  }),
  body: z.object({
    action: campaignReviewActionSchema.optional().default('approve'),
    note: optionalTrimmedString().default('')
  })
});

export const audienceCampaignTemplateCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Template name is required.'),
    description: optionalTrimmedString().default(''),
    channel: campaignChannelSchema.optional().default('email'),
    subject: optionalTrimmedString().default(''),
    previewText: optionalTrimmedString().default(''),
    message: z.string().trim().min(3, 'Template message is required.'),
    ctaLabel: optionalTrimmedString().default(''),
    ctaUrl: optionalTrimmedString().default(''),
    isActive: z.boolean().optional().default(true)
  })
});

export const audienceCampaignTemplateUpdateSchema = z.object({
  params: z.object({
    templateId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'A valid template id is required.')
  }),
  body: z.object({
    name: z.string().trim().min(2, 'Template name is required.'),
    description: optionalTrimmedString().default(''),
    channel: campaignChannelSchema.optional().default('email'),
    subject: optionalTrimmedString().default(''),
    previewText: optionalTrimmedString().default(''),
    message: z.string().trim().min(3, 'Template message is required.'),
    ctaLabel: optionalTrimmedString().default(''),
    ctaUrl: optionalTrimmedString().default(''),
    isActive: z.boolean().optional().default(true)
  })
});

export const audienceTemplateDeleteSchema = z.object({
  params: z.object({
    templateId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'A valid template id is required.')
  })
});

export const audienceUnsubscribeSchema = z.object({
  query: z.object({
    token: z.string().trim().min(1, 'Unsubscribe token is required.')
  })
});

export const audienceTrackingSchema = z.object({
  query: z.object({
    token: z.string().trim().min(1, 'Tracking token is required.')
  })
});

export const audienceUserCampaignHistorySchema = z.object({
  query: z.object({
    email: z.string().trim().email('A valid user email is required.'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10)
  })
});

export const audiencePreferenceUpdateSchema = z.object({
  params: z.object({
    email: z.string().trim().email('A valid user email is required.')
  }),
  body: z.object({
    name: optionalTrimmedString().default(''),
    phone: optionalTrimmedString().default(''),
    tags: z.array(z.string().trim().min(1)).optional().default([]),
    emailOptOut: z.boolean().optional().default(false),
    smsOptOut: z.boolean().optional().default(false),
    whatsappOptOut: z.boolean().optional().default(false)
  })
});

export const audienceUnsubscribedUsersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: optionalTrimmedString().default('')
  })
});
