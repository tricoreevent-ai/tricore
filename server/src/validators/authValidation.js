import { z } from 'zod';

import { adminPermissions, adminRoles } from '../constants/adminAccess.js';

export const googleAuthSchema = z.object({
  body: z.object({
    credential: z.string().min(1, 'Google credential is required.')
  })
});

export const adminLoginSchema = z.object({
  body: z.object({
    username: z.string().trim().min(3, 'Username is required.'),
    password: z.string().min(6, 'Password is required.')
  })
});

export const createAdminUserSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, 'Name is required.'),
      username: z.string().trim().min(3, 'Username is required.'),
      email: z.string().trim().email('A valid email address is required.'),
      role: z.string().trim().min(1, 'Role is required.'),
      permissions: z.array(z.enum(Object.values(adminPermissions))).optional().default([]),
      password: z.string().min(6, 'Password must be at least 6 characters.')
    })
    .superRefine((value, context) => {
      if (value.role === adminRoles.customAdmin && !value.permissions.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Choose at least one page permission for custom access admins.',
          path: ['permissions']
        });
      }
    })
});

export const updateAdminUserAccessSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, 'Admin user id is required.')
  }),
  body: z
    .object({
      role: z.string().trim().min(1, 'Role is required.'),
      permissions: z.array(z.enum(Object.values(adminPermissions))).optional().default([])
    })
    .superRefine((value, context) => {
      if (value.role === adminRoles.customAdmin && !value.permissions.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Choose at least one page permission for custom access admins.',
          path: ['permissions']
        });
      }
    })
});

export const createAdminRoleTemplateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Role name is required.'),
    key: z
      .string()
      .trim()
      .regex(/^[a-z0-9_]*$/, 'Role key can only contain lowercase letters, numbers, and underscores.')
      .optional()
      .or(z.literal('')),
    description: z.string().trim().optional().or(z.literal('')),
    permissions: z
      .array(z.enum(Object.values(adminPermissions)))
      .min(1, 'Choose at least one page permission for the role.')
  })
});

export const updateAdminRoleTemplateSchema = z.object({
  params: z.object({
    key: z.string().trim().min(1, 'Role key is required.')
  }),
  body: z.object({
    name: z.string().trim().min(2, 'Role name is required.'),
    description: z.string().trim().optional().or(z.literal('')),
    permissions: z
      .array(z.enum(Object.values(adminPermissions)))
      .min(1, 'Choose at least one page permission for the role.')
  })
});

export const updateAdminRoleTemplateStatusSchema = z.object({
  params: z.object({
    key: z.string().trim().min(1, 'Role key is required.')
  }),
  body: z.object({
    isActive: z.boolean()
  })
});

export const deleteAdminRoleTemplateSchema = z.object({
  params: z.object({
    key: z.string().trim().min(1, 'Role key is required.')
  })
});

export const changeAdminPasswordSchema = z
  .object({
    body: z.object({
      currentPassword: z.string().min(6, 'Current password is required.'),
      newPassword: z.string().min(6, 'New password must be at least 6 characters.')
    })
  })
  .refine((data) => data.body.currentPassword !== data.body.newPassword, {
    message: 'New password must be different from current password.',
    path: ['body', 'newPassword']
  });

export const updatePayoutDetailsSchema = z.object({
  body: z.object({
    upiId: z.string().trim().optional().or(z.literal('')),
    accountHolderName: z.string().trim().optional().or(z.literal('')),
    accountNumber: z.string().trim().optional().or(z.literal('')),
    bankName: z.string().trim().optional().or(z.literal('')),
    ifscCode: z.string().trim().optional().or(z.literal('')),
    branchName: z.string().trim().optional().or(z.literal('')),
    notes: z.string().trim().optional().or(z.literal(''))
  })
});
