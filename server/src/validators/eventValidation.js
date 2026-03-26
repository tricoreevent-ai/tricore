import { z } from 'zod';

import { dateStringSchema, objectIdSchema, optionalTextSchema } from './common.js';

const sportTypes = ['Cricket', 'Football', 'Badminton', 'Swimming'];

const eventFieldsSchema = z.object({
  name: z.string().trim().min(3, 'Event name is required.'),
  description: optionalTextSchema,
  bannerImage: z.string().trim().url('Banner image must be a valid URL.').optional().or(z.literal('')),
  sportType: z.enum(sportTypes),
  venue: z.string().trim().min(3, 'Venue is required.'),
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  maxParticipants: z.coerce.number().int().positive(),
  entryFee: z.coerce.number().nonnegative(),
  registrationDeadline: dateStringSchema,
  teamSize: z.coerce.number().int().positive(),
  playerLimit: z.coerce.number().int().positive(),
  registrationEnabled: z.boolean().optional().default(true),
  isHidden: z.boolean().optional().default(false)
});

const applyEventRules = (schema) =>
  schema
    .refine((data) => !data.startDate || !data.endDate || new Date(data.startDate) <= new Date(data.endDate), {
      message: 'Start date must be on or before end date.',
      path: ['startDate']
    })
    .refine(
      (data) =>
        !data.registrationDeadline ||
        !data.startDate ||
        new Date(data.registrationDeadline) <= new Date(data.startDate),
      {
        message: 'Registration deadline must be on or before the start date.',
        path: ['registrationDeadline']
      }
    )
    .refine((data) => !data.playerLimit || !data.teamSize || data.playerLimit >= data.teamSize, {
      message: 'Player limit must be greater than or equal to team size.',
      path: ['playerLimit']
    });

const eventBodySchema = applyEventRules(eventFieldsSchema);
const partialEventBodySchema = applyEventRules(eventFieldsSchema.partial());

export const createEventSchema = z.object({
  body: eventBodySchema
});

export const updateEventSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: partialEventBodySchema
});

export const eventIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const eventCatalogQuerySchema = z.object({
  query: z
    .object({
      dateFrom: z.string().date().optional(),
      dateTo: z.string().date().optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(500).optional(),
      sportType: z.enum(sportTypes).optional(),
      visibility: z.enum(['all', 'visible', 'hidden']).optional()
    })
    .refine(
      (query) => !query.dateFrom || !query.dateTo || new Date(query.dateFrom) <= new Date(query.dateTo),
      {
        message: 'From date must be before or equal to To date.',
        path: ['dateFrom']
      }
    )
});
