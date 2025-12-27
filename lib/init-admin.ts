import connectDB from './mongodb';
import Admin from './models/Admin';
import { hashAdminPassword } from './admin-auth';

export async function initAdmin() {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@habittracker.com';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      console.warn('⚠️  ADMIN_PASSWORD not set. Admin account will not be created.');
      return;
    }

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (existingAdmin) {
      // Always update password to ensure it matches .env.local
      const passwordHash = await hashAdminPassword(adminPassword);
      await Admin.updateOne(
        { email: adminEmail },
        { passwordHash, loginAttempts: 0, lockUntil: null }
      );
      console.log('✅ Admin password updated from .env.local');
      return;
    }

    // Create admin account
    const passwordHash = await hashAdminPassword(adminPassword);
    await Admin.create({
      email: adminEmail,
      passwordHash,
      loginAttempts: 0,
    });

    console.log('✅ Admin account created successfully');
    console.log(`📧 Email: ${adminEmail}`);
  } catch (error: any) {
    console.error('❌ Failed to initialize admin:', error.message);
    // Don't throw - allow app to continue
  }
}

// Allow running as script
if (require.main === module) {
  initAdmin()
    .then(() => {
      console.log('Admin initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin initialization failed:', error);
      process.exit(1);
    });
}

