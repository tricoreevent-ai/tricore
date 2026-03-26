import { z } from 'zod';

export const updatePublicSiteSettingsSchema = z.object({
  body: z.object({
    publicBaseUrl: z.string().trim().url('Enter a valid public website URL.')
  })
});
