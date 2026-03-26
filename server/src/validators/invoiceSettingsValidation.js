import { z } from 'zod';

const templateStyles = ['modern', 'classic', 'executive'];

export const updateInvoiceConfigurationSchema = z.object({
  body: z.object({
    companyName: z.string().trim().min(1, 'Company name is required.').max(120),
    companyEmail: z.string().trim().email('A valid company email is required.'),
    companyWebsite: z.string().trim().url('Enter a valid company website URL.').max(300),
    companyLogoUrl: z.string().trim().max(5000000).optional().or(z.literal('')),
    invoicePrefix: z.string().trim().min(1, 'Invoice prefix is required.').max(20),
    invoiceNumberFormat: z.string().trim().min(1, 'Invoice numbering format is required.').max(120),
    defaultTaxLabel: z.string().trim().max(40).optional().or(z.literal('')),
    defaultTaxRate: z.coerce.number().min(0).max(100),
    paymentTermsLabel: z.string().trim().max(240).optional().or(z.literal('')),
    paymentTermsDays: z.coerce.number().int().min(0).max(365),
    footerNotes: z.string().trim().max(1000).optional().or(z.literal('')),
    footerTerms: z.string().trim().max(5000).optional().or(z.literal('')),
    defaultTemplateStyle: z.enum(templateStyles)
  })
});
