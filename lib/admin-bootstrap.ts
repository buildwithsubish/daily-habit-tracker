/**
 * @deprecated Admin credentials are no longer synced from .env.
 * Use: npm run bootstrap-admin  OR  POST /api/admin/setup (first boot only)
 */
export {
  adminAccountExists,
  createAdminAccount,
  getAdminSetupStatus,
  isSetupTokenConfigured,
  performAdminSetup,
  verifySetupToken,
} from './admin-setup-service';