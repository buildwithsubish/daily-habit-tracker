import { z } from 'zod';
import { validateAdminPasswordComplexity } from '../password-policy';

export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(254, 'Email is too long')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(256, 'Password is too long'),
  twoFactorCode: z
    .string()
    .regex(/^\d{6}$/, '2FA code must be exactly 6 digits')
    .optional(),
  turnstileToken: z.string().optional(),
});

export const adminPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(14, 'New password must be at least 14 characters')
      .max(256, 'Password is too long')
      .refine(
        (pwd: string) => validateAdminPasswordComplexity(pwd).valid,
        {
          message:
            'Password must be at least 14 characters and include uppercase, lowercase, numbers, and symbols',
        }
      ),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

export const adminRoleUpdateSchema = z.object({
  adminId: z.string().min(1, 'Admin ID is required'),
  role: z.enum(['super_admin', 'admin', 'manager', 'editor', 'viewer'] as const),
});

export const adminInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .max(254)
    .email('Valid email address required'),
  role: z.enum(['super_admin', 'admin', 'manager', 'editor', 'viewer'] as const),
  temporaryPassword: z
    .string()
    .min(14, 'Password must be at least 14 characters')
    .refine(
      (pwd: string) => validateAdminPasswordComplexity(pwd).valid,
      {
        message:
          'Password must be at least 14 characters and include uppercase, lowercase, numbers, and symbols',
      }
    ),
});

export const adminUserActionSchema = z.object({
  action: z.enum(['suspend', 'unsuspend', 'delete', 'reset_password'] as const),
  reason: z.string().max(500).optional(),
  confirmation: z.string().min(1, 'Secondary confirmation is required for this action'),
  password: z.string().optional(),
});

export const adminTwoFactorSetupSchema = z.object({
  code: z.string().regex(/^\d{6}$/, '2FA code must be 6 digits'),
  secret: z.string().min(16, 'Invalid 2FA secret format'),
});

export const adminSessionRevokeSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required').optional(),
  revokeAllOthers: z.boolean().optional(),
});
