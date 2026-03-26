import { z } from 'zod';

import { securityAlertCategories } from '../models/SecurityAlert.js';
import { objectIdSchema } from './common.js';

export const securityAlertQuerySchema = z.object({
  query: z.object({
    status: z.enum(['open', 'acknowledged']).optional(),
    severity: z.enum(['medium', 'high', 'critical']).optional(),
    category: z.enum(securityAlertCategories).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
});

export const acknowledgeSecurityAlertSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});
