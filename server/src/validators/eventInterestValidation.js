import { z } from 'zod';

import { objectIdSchema } from './common.js';

export const createEventInterestSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    name: z.string().trim().min(2, 'Name is required.'),
    email: z.string().trim().email('Enter a valid email address.'),
    phone: z
      .string()
      .trim()
      .max(30, 'Phone number is too long.')
      .optional()
      .or(z.literal(''))
  })
});

export const adminEventInterestSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const sendEventInterestEmailSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z
    .object({
      audience: z.enum(['selected', 'all', 'pending']),
      interestIds: z.array(objectIdSchema).max(500).optional().default([]),
      customMessage: z
        .string()
        .trim()
        .max(2000, 'Custom message must be 2000 characters or less.')
        .optional()
        .or(z.literal(''))
    })
    .refine(
      (body) => body.audience !== 'selected' || Array.isArray(body.interestIds) && body.interestIds.length > 0,
      {
        message: 'Select at least one interested contact.',
        path: ['interestIds']
      }
    )
});
