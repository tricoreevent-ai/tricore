import { z } from 'zod';

import { objectIdSchema, optionalTextSchema } from './common.js';

const playerSchema = z.object({
  name: z.string().trim().min(2, 'Player name is required.'),
  phone: z.string().trim().min(8, 'Player phone is required.'),
  address: z.string().trim().min(5, 'Player address is required.')
});

export const registrationPayloadSchema = z.object({
  name: optionalTextSchema,
  teamName: optionalTextSchema,
  captainName: optionalTextSchema,
  email: z.string().trim().email('A valid email address is required.'),
  phone1: z.string().trim().min(8, 'Primary phone is required.'),
  phone2: z.string().trim().min(8, 'Secondary phone is required.'),
  address: z.string().trim().min(5, 'Address is required.'),
  players: z.array(playerSchema).optional().default([])
});

export const createRegistrationSchema = z.object({
  body: registrationPayloadSchema.extend({
    eventId: objectIdSchema
  })
});

export const createManualRegistrationSchema = z.object({
  body: registrationPayloadSchema.extend({
    eventId: objectIdSchema,
    manualReference: optionalTextSchema,
    receiptDataUrl: optionalTextSchema,
    receiptFilename: optionalTextSchema
  })
});

export const registrationsQuerySchema = z.object({
  query: z
    .object({
      eventId: objectIdSchema.optional(),
      status: z.enum(['Pending', 'Under Review', 'Confirmed', 'Failed', 'Paid']).optional(),
      dateFrom: z.string().date().optional(),
      dateTo: z.string().date().optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
      format: z.enum(['csv']).optional()
    })
    .refine(
      (query) => !query.dateFrom || !query.dateTo || new Date(query.dateFrom) <= new Date(query.dateTo),
      {
        message: 'From date must be before or equal to To date.',
        path: ['dateFrom']
      }
    )
});

export const registrationIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const registrationEventSchema = z.object({
  params: z.object({
    eventId: objectIdSchema
  })
});

export const confirmRegistrationPaymentSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    manualReference: optionalTextSchema,
    paymentMode: z.enum(['online', 'cash', 'upi', 'bank']).optional()
  })
});

export const updateRegistrationSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: registrationPayloadSchema.partial().refine((value) => Object.keys(value).length > 0, {
    message: 'At least one registration field is required.'
  })
});
