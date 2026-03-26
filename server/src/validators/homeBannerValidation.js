import { z } from 'zod';

const bannerSchema = z
  .object({
    id: z.string().trim().max(100).optional().or(z.literal('')),
    badge: z.string().trim().max(80).optional().or(z.literal('')),
    title: z.string().trim().min(1, 'Banner title is required.').max(120),
    description: z.string().trim().max(500).optional().or(z.literal('')),
    imageUrl: z.string().trim().max(5000000).optional().or(z.literal('')),
    imageAlt: z.string().trim().max(120).optional().or(z.literal('')),
    primaryActionLabel: z.string().trim().max(40).optional().or(z.literal('')),
    primaryActionHref: z.string().trim().max(500).optional().or(z.literal('')),
    secondaryActionLabel: z.string().trim().max(40).optional().or(z.literal('')),
    secondaryActionHref: z.string().trim().max(500).optional().or(z.literal('')),
    isActive: z.coerce.boolean().optional()
  })
  .superRefine((banner, context) => {
    if (banner.primaryActionLabel && !banner.primaryActionHref) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Primary button link is required when a primary button label is set.',
        path: ['primaryActionHref']
      });
    }

    if (banner.primaryActionHref && !banner.primaryActionLabel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Primary button label is required when a primary button link is set.',
        path: ['primaryActionLabel']
      });
    }

    if (banner.secondaryActionLabel && !banner.secondaryActionHref) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Secondary button link is required when a secondary button label is set.',
        path: ['secondaryActionHref']
      });
    }

    if (banner.secondaryActionHref && !banner.secondaryActionLabel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Secondary button label is required when a secondary button link is set.',
        path: ['secondaryActionLabel']
      });
    }
  });

export const updateHomeBannerConfigurationSchema = z.object({
  body: z.object({
    banners: z.array(bannerSchema).max(10, 'A maximum of 10 home banners is allowed.')
  })
});
