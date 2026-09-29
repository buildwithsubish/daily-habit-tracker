/**
 * @deprecated Admin credentials are no longer synced from .env.
 * Use: npm run bootstrap-admin  OR  POST /api/admin/setup (first boot only)
 */
import { adminAccountExists } from './admin-bootstrap';

export async function initAdmin(): Promise<void> {
  const exists = await adminAccountExists();
  if (!exists) {
    console.warn(
      '⚠️  No admin account in database. Run: npm run bootstrap-admin  or visit /admin/setup'
    );
  }
}

if (require.main === module) {
  import('./admin-bootstrap')
    .then(async ({ adminAccountExists }) => {
      const exists = await adminAccountExists();
      console.log(exists ? 'Admin account exists in MongoDB.' : 'No admin account — run npm run bootstrap-admin');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}