import { z } from 'zod';

import { paymentModes, transactionScopes } from '../services/accountingService.js';
import { objectIdSchema, optionalTextSchema } from './common.js';

const typeSchema = z.enum(['income', 'expense']);
const categoryKeySchema = z
  .string()
  .trim()
  .min(2, 'Category is required.')
  .max(60, 'Category is too long.')
  .regex(/^[a-z0-9_]+$/, 'Category contains invalid characters.');
const paymentModeSchema = z.enum(paymentModes);
const scopeSchema = z.enum(transactionScopes);
const categoryTypeSchema = z.enum(['income', 'expense']);
const optionalDateInputSchema = z.union([z.string().date(), z.literal('')]).optional();
const optionalNonNegativeNumberSchema = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    return Number(value);
  },
  z.number().min(0, 'Value cannot be negative.').optional()
);

const transactionBodyFieldsSchema = z.object({
  scope: scopeSchema.default('event'),
  eventId: objectIdSchema.optional(),
  type: typeSchema,
  category: categoryKeySchema,
  amount: z.coerce.number().positive('Amount must be greater than 0.'),
  date: z.string().date('Enter a valid transaction date.'),
  reference: z.string().trim().min(2, 'Reference is required.'),
  referenceDocument: optionalTextSchema,
  paymentMode: paymentModeSchema,
  notes: optionalTextSchema,
  invoiceDetails: z
    .object({
      documentNumber: optionalTextSchema,
      issueDate: optionalDateInputSchema,
      dueDate: optionalDateInputSchema,
      billToName: optionalTextSchema,
      billToCompany: optionalTextSchema,
      billToEmail: optionalTextSchema,
      billToPhone: optionalTextSchema,
      billingAddress: optionalTextSchema,
      itemDescription: optionalTextSchema,
      taxLabel: optionalTextSchema,
      taxRate: optionalNonNegativeNumberSchema,
      taxAmount: optionalNonNegativeNumberSchema,
      subtotal: optionalNonNegativeNumberSchema,
      total: optionalNonNegativeNumberSchema
    })
    .optional()
});

const applyTransactionScopeValidation = (schema) =>
  schema.refine((data) => data.scope === 'common' || Boolean(data.eventId), {
    message: 'Select an event for event-based transactions.',
    path: ['eventId']
  });

const transactionBodySchema = applyTransactionScopeValidation(transactionBodyFieldsSchema);

const transactionBodyUpdateSchema = transactionBodyFieldsSchema
  .partial()
  .extend({
    otpCode: z.string().trim().min(4, 'OTP code is required.').max(12).optional()
  })
  .refine((data) => Object.keys(data).filter((key) => key !== 'otpCode').length > 0, {
    message: 'At least one transaction field is required to update a transaction.'
  });

export const createTransactionSchema = z.object({
  body: transactionBodySchema
});

export const updateTransactionSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: transactionBodyUpdateSchema
});

export const transactionIdSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const deleteTransactionSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    otpCode: z.string().trim().min(4, 'OTP code is required.').max(12).optional()
  })
});

export const requestTransactionOtpSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    action: z.enum(['update', 'delete'])
  })
});

export const transactionsQuerySchema = z
  .object({
    query: z.object({
      eventId: objectIdSchema.optional(),
      scope: scopeSchema.optional(),
      type: typeSchema.optional(),
      category: categoryKeySchema.optional(),
      paymentMode: paymentModeSchema.optional(),
      source: z.enum(['manual', 'payment']).optional(),
      dateFrom: z.string().date().optional(),
      dateTo: z.string().date().optional(),
      month: z.coerce.number().int().min(1).max(12).optional(),
      year: z.coerce.number().int().min(2000).max(3000).optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
      format: z.enum(['csv']).optional()
    })
  })
  .refine(
    (data) =>
      !data.query.dateFrom ||
      !data.query.dateTo ||
      new Date(data.query.dateFrom) <= new Date(data.query.dateTo),
    {
      message: 'From date must be before or equal to To date.',
      path: ['query', 'dateFrom']
    }
  )
  .refine((data) => (!data.query.month && !data.query.year) || (data.query.month && data.query.year), {
    message: 'Select both month and year for month-wise filtering.',
    path: ['query', 'month']
  });

export const accountingCategoriesQuerySchema = z.object({
  query: z.object({
    type: categoryTypeSchema.optional()
  })
});

export const createAccountingCategorySchema = z.object({
  body: z.object({
    label: z.string().trim().min(2, 'Category label is required.').max(60),
    type: categoryTypeSchema
  })
});

export const updateAccountingCategorySchema = z.object({
  params: z.object({
    key: categoryKeySchema
  }),
  body: z.object({
    label: z.string().trim().min(2, 'Category label is required.').max(60),
    type: categoryTypeSchema
  })
});

export const deleteAccountingCategorySchema = z.object({
  params: z.object({
    key: categoryKeySchema
  })
});

export const accountingReportsQuerySchema = z
  .object({
    query: z.object({
      eventId: objectIdSchema.optional(),
      scope: scopeSchema.optional(),
      dateFrom: z.string().date().optional(),
      dateTo: z.string().date().optional(),
      month: z.coerce.number().int().min(1).max(12).optional(),
      year: z.coerce.number().int().min(2000).max(3000).optional(),
      format: z.enum(['csv']).optional()
    })
  })
  .refine(
    (data) =>
      !data.query.dateFrom ||
      !data.query.dateTo ||
      new Date(data.query.dateFrom) <= new Date(data.query.dateTo),
    {
      message: 'From date must be before or equal to To date.',
      path: ['query', 'dateFrom']
    }
  )
  .refine((data) => (!data.query.month && !data.query.year) || (data.query.month && data.query.year), {
    message: 'Select both month and year for month-wise filtering.',
    path: ['query', 'month']
  });
