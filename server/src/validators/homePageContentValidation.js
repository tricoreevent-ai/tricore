import { z } from 'zod';

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, 'Enter a valid hex color like #0F5FDB.');

const actionPairRefinement = (value, context, labelField, hrefField, labelName, hrefName) => {
  if (value[labelField] && !value[hrefField]) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${hrefName} is required when ${labelName} is set.`,
      path: [hrefField]
    });
  }

  if (value[hrefField] && !value[labelField]) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${labelName} is required when ${hrefName} is set.`,
      path: [labelField]
    });
  }
};

const speakerSchema = z.object({
  id: z.string().trim().max(100).optional().or(z.literal('')),
  name: z.string().trim().min(1, 'Speaker name is required.').max(80),
  role: z.string().trim().max(120).optional().or(z.literal('')),
  imageUrl: z.string().trim().max(5000000).optional().or(z.literal('')),
  imageAlt: z.string().trim().max(120).optional().or(z.literal(''))
});

const statSchema = z.object({
  id: z.string().trim().max(100).optional().or(z.literal('')),
  value: z.string().trim().min(1, 'Stat value is required.').max(40),
  label: z.string().trim().min(1, 'Stat label is required.').max(80)
});

const highlightImageSchema = z.object({
  id: z.string().trim().max(100).optional().or(z.literal('')),
  imageUrl: z.string().trim().max(5000000).optional().or(z.literal('')),
  imageAlt: z.string().trim().max(120).optional().or(z.literal(''))
});

const galleryImageSchema = z.object({
  id: z.string().trim().max(100).optional().or(z.literal('')),
  imageUrl: z.string().trim().max(5000000).optional().or(z.literal('')),
  imageAlt: z.string().trim().max(120).optional().or(z.literal('')),
  caption: z.string().trim().max(200).optional().or(z.literal(''))
});

const testimonialSchema = z.object({
  id: z.string().trim().max(100).optional().or(z.literal('')),
  name: z.string().trim().min(1, 'Testimonial name is required.').max(80),
  role: z.string().trim().max(120).optional().or(z.literal('')),
  quote: z.string().trim().min(1, 'Testimonial quote is required.').max(600),
  imageUrl: z.string().trim().max(5000000).optional().or(z.literal('')),
  imageAlt: z.string().trim().max(120).optional().or(z.literal('')),
  avatarUrl: z.string().trim().max(5000000).optional().or(z.literal('')),
  avatarAlt: z.string().trim().max(120).optional().or(z.literal(''))
});

export const updateHomePageContentConfigurationSchema = z.object({
  body: z
    .object({
      themePrimaryColor: hexColorSchema,
      themeSecondaryColor: hexColorSchema,
      themeHighlightColor: hexColorSchema,
      sponsorshipEventName: z.string().trim().max(160).optional().or(z.literal('')),
      testimonialsEnabledHome: z.coerce.boolean(),
      galleryEnabledHome: z.coerce.boolean(),
      galleryEnabledAbout: z.coerce.boolean(),
      homeGalleryTitle: z.string().trim().max(120).optional().or(z.literal('')),
      homeGalleryDescription: z.string().trim().max(500).optional().or(z.literal('')),
      homeGalleryImages: z
        .array(galleryImageSchema)
        .max(500, 'A maximum of 500 home gallery images is allowed.'),
      aboutGalleryTitle: z.string().trim().max(120).optional().or(z.literal('')),
      aboutGalleryDescription: z.string().trim().max(500).optional().or(z.literal('')),
      aboutGalleryImages: z
        .array(galleryImageSchema)
        .max(500, 'A maximum of 500 about gallery images is allowed.'),
      introBadge: z.string().trim().max(80).optional().or(z.literal('')),
      introTitle: z.string().trim().min(1, 'Intro title is required.').max(120),
      introDescription: z.string().trim().max(600).optional().or(z.literal('')),
      introActionLabel: z.string().trim().max(40).optional().or(z.literal('')),
      introActionHref: z.string().trim().max(500).optional().or(z.literal('')),
      introImageUrl: z.string().trim().max(5000000).optional().or(z.literal('')),
      introImageAlt: z.string().trim().max(120).optional().or(z.literal('')),
      speakersTitle: z.string().trim().min(1, 'Speakers title is required.').max(120),
      speakersDescription: z.string().trim().max(400).optional().or(z.literal('')),
      speakers: z.array(speakerSchema).max(8, 'A maximum of 8 speakers is allowed.'),
      highlightsTitle: z.string().trim().min(1, 'Highlights title is required.').max(120),
      highlightsDescription: z.string().trim().max(500).optional().or(z.literal('')),
      stats: z.array(statSchema).max(6, 'A maximum of 6 stats is allowed.'),
      highlightImages: z.array(highlightImageSchema).max(8, 'A maximum of 8 highlight images is allowed.'),
      eventsTitle: z.string().trim().min(1, 'Events title is required.').max(120),
      eventsDescription: z.string().trim().max(400).optional().or(z.literal('')),
      testimonialsTitle: z.string().trim().min(1, 'Testimonials title is required.').max(120),
      testimonialsDescription: z.string().trim().max(400).optional().or(z.literal('')),
      testimonials: z.array(testimonialSchema).max(6, 'A maximum of 6 testimonials is allowed.'),
      ctaBadge: z.string().trim().max(80).optional().or(z.literal('')),
      ctaTitle: z.string().trim().min(1, 'CTA title is required.').max(120),
      ctaDescription: z.string().trim().max(500).optional().or(z.literal('')),
      ctaActionLabel: z.string().trim().max(40).optional().or(z.literal('')),
      ctaActionHref: z.string().trim().max(500).optional().or(z.literal('')),
      ctaImageUrl: z.string().trim().max(5000000).optional().or(z.literal('')),
      ctaImageAlt: z.string().trim().max(120).optional().or(z.literal(''))
    })
    .superRefine((value, context) => {
      actionPairRefinement(
        value,
        context,
        'introActionLabel',
        'introActionHref',
        'intro button label',
        'intro button link'
      );
      actionPairRefinement(
        value,
        context,
        'ctaActionLabel',
        'ctaActionHref',
        'CTA button label',
        'CTA button link'
      );
    })
});
