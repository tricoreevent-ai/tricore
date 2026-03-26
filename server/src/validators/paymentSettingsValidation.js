import { z } from 'zod';

export const updatePaymentConfigurationSchema = z.object({
  body: z.object({
    manualPaymentEnabled: z.coerce.boolean().optional(),
    upiId: z.string().trim().optional().or(z.literal('')),
    payeeName: z.string().trim().optional().or(z.literal('')),
    qrCodeDataUrl: z.string().trim().optional().or(z.literal('')),
    bankAccountName: z.string().trim().optional().or(z.literal('')),
    bankAccountNumber: z.string().trim().optional().or(z.literal('')),
    bankIfscCode: z.string().trim().optional().or(z.literal('')),
    bankName: z.string().trim().optional().or(z.literal('')),
    bankBranch: z.string().trim().optional().or(z.literal('')),
    bankInstructions: z.string().trim().optional().or(z.literal('')),
    paymentProofRecipientEmail: z.string().trim().email('A valid email address is required.').optional().or(z.literal(''))
  })
});
