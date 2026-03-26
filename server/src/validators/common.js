import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid resource identifier.');

export const dateStringSchema = z.string().min(1, 'Date is required.');

export const optionalTextSchema = z.string().trim().optional().or(z.literal(''));

