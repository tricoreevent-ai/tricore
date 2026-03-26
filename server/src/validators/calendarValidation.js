import { z } from 'zod';

import { objectIdSchema, optionalTextSchema } from './common.js';

const calendarSportTypes = ['Cricket', 'Football', 'Badminton', 'Swimming', 'Multi-Sport', 'Other'];

const dateRangeQuery = z
  .object({
    dateFrom: z.string().date().optional(),
    dateTo: z.string().date().optional()
  })
  .refine(
    (query) => !query.dateFrom || !query.dateTo || new Date(query.dateFrom) <= new Date(query.dateTo),
    {
      message: 'From date must be before or equal to To date.',
      path: ['dateFrom']
    }
  );

const sportsCalendarEventBody = z
  .object({
    name: z.string().trim().min(3, 'Event name is required.'),
    description: optionalTextSchema,
    sportType: z.enum(calendarSportTypes),
    startDate: z.string().datetime().or(z.string().date()),
    endDate: z.string().datetime().or(z.string().date()),
    location: optionalTextSchema
  })
  .refine((body) => new Date(body.startDate) <= new Date(body.endDate), {
    message: 'Start date must be on or before end date.',
    path: ['startDate']
  });

export const calendarFeedQuerySchema = z.object({
  query: dateRangeQuery
});

export const createSportsCalendarEventSchema = z.object({
  body: sportsCalendarEventBody
});

export const updateSportsCalendarEventSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: sportsCalendarEventBody.partial()
});

export const sportsCalendarEventIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});
