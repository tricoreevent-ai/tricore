import { z } from 'zod';

export const activityLogQuerySchema = z.object({
  query: z
    .object({
      category: z.string().trim().optional(),
      action: z.string().trim().optional(),
      subjectType: z.string().trim().optional(),
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
