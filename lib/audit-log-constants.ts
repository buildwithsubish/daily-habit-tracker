/** Centralized AuditLog categories — must match lib/models/AuditLog.ts enum. */
export const AUDIT_CATEGORIES = [
  'admin_auth',
  'admin_security',
  'whatsapp_session',
  'whatsapp_verification',
  'whatsapp_message',
  'whatsapp_broadcast',
  'user_management',
  'habit_tracking',
  'system',
  'security',
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

/** Named category constants — use instead of raw strings. */
export const AUDIT_CATEGORY = {
  ADMIN_AUTH: 'admin_auth',
  ADMIN_SECURITY: 'admin_security',
  WHATSAPP_SESSION: 'whatsapp_session',
  WHATSAPP_VERIFICATION: 'whatsapp_verification',
  WHATSAPP_MESSAGE: 'whatsapp_message',
  WHATSAPP_BROADCAST: 'whatsapp_broadcast',
  USER_MANAGEMENT: 'user_management',
  HABIT_TRACKING: 'habit_tracking',
  SYSTEM: 'system',
  SECURITY: 'security',
} as const satisfies Record<string, AuditCategory>;

export const AUDIT_ACTIONS = {
  ADMIN_BOOTSTRAP: 'admin_bootstrap',
  ADMIN_BOOTSTRAP_FAILED: 'admin_bootstrap_failed',
  ADMIN_BOOTSTRAP_BLOCKED: 'admin_bootstrap_blocked',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGIN_BLOCKED: 'login_blocked',
  LOGIN_BLOCKED_IP: 'login_blocked_ip',
  LOGIN_FAILED_2FA: 'login_failed_2fa',
  LOGOUT: 'logout',
  BULK_DELETE_USERS: 'bulk_delete_users',
  BULK_ACTIVATE_USERS: 'bulk_activate_users',
  BULK_DEACTIVATE_USERS: 'bulk_deactivate_users',
  HABIT_COMPLETED_WHATSAPP: 'habit_completed_via_whatsapp',
  HABIT_REMINDER_SENT: 'habit_reminder_sent',
  ROLE_CHANGE: 'admin_role_change',
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_SUSPEND: 'user_suspend',
  USER_UNSUSPEND: 'user_unsuspend',
  SESSION_REVOKE: 'admin_session_revoke',
  SESSION_REVOKE_ALL: 'admin_session_revoke_all',
  TWO_FACTOR_SETUP: 'admin_2fa_setup',
  TWO_FACTOR_VERIFIED: 'admin_2fa_verified',
  TWO_FACTOR_RESET: 'admin_2fa_reset',
  PASSWORD_CHANGE: 'admin_password_change',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS] | string;

const CATEGORY_SET = new Set<string>(AUDIT_CATEGORIES);

export function isValidAuditCategory(category: string): category is AuditCategory {
  return CATEGORY_SET.has(category);
}
