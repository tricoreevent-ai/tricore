import { z } from 'zod';

import { objectIdSchema } from './common.js';

export const createMatchSchema = z.object({
  body: z.object({
    eventId: objectIdSchema,
    teamA: z.string().trim().min(2, 'Team A is required.'),
    teamB: z.string().trim().min(2, 'Team B is required.'),
    date: z.string().min(1, 'Date is required.'),
    time: z.string().min(1, 'Time is required.'),
    venue: z.string().trim().min(3, 'Venue is required.'),
    roundNumber: z.coerce.number().int().min(1).optional(),
    roundLabel: z.string().trim().optional(),
    matchNumber: z.coerce.number().int().min(1).optional()
  })
});

export const generateKnockoutSchema = z.object({
  body: z.object({
    eventId: objectIdSchema,
    date: z.string().min(1, 'Base date is required.'),
    time: z.string().min(1, 'Base time is required.'),
    venue: z.string().trim().optional().or(z.literal('')),
    replaceExisting: z.coerce.boolean().optional()
  })
});

export const eventMatchesSchema = z.object({
  params: z.object({
    eventId: objectIdSchema
  })
});
