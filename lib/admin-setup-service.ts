import crypto from 'crypto';
import connectDB from './mongodb';
import Admin from './models/Admin';
import BootstrapLock, { ADMIN_BOOTSTRAP_LOCK_ID } from './models/BootstrapLock';
import { hashAdminPassword } from './admin-auth';
import { sanitizeInput, isStrongPassword, isValidEmail } from './security';
import { validateAdminSetupInput } from './admin-setup-validation';
import { writeAuditLog } from './audit-log';
import { AUDIT_ACTIONS, AUDIT_CATEGORY } from './audit-log-constants';

export type SetupStatus = {
  needsSetup: boolean;
  setupTokenRequired: boolean;
  message: string;
};

export type SetupResult =
  | { ok: true; adminId: string; email: string }
  | { ok: false; errorCode: string; message: string; status: number; details?: unknown };

export async function getAdminSetupStatus(): Promise<SetupStatus> {
  await connectDB();
  const needsSetup = !(await adminAccountExists());
  const setupTokenRequired = needsSetup && isSetupTokenConfigured();

  return {
    needsSetup,
    setupTokenRequired,
    message: needsSetup
      ? 'No admin account found. Complete one-time setup.'
      : 'Admin account already configured. Sign in or update your password.',
  };
}

export async function adminAccountExists(): Promise<boolean> {
  await connectDB();
  const count = await Admin.countDocuments();
  return count > 0;
}

export function isSetupTokenConfigured(): boolean {
  const token = process.env.ADMIN_SETUP_TOKEN;
  return !!token && token.length >= 16;
}

/** Constant-time comparison for setup token. */
export function verifySetupToken(token: string): boolean {
  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected || expected.length < 16 || !token) return false;

  try {
    const a = Buffer.from(token, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function acquireBootstrapLock(): Promise<'acquired' | 'exists' | 'contended'> {
  if (await adminAccountExists()) return 'exists';

  try {
    await BootstrapLock.create({
      _id: ADMIN_BOOTSTRAP_LOCK_ID,
      lockedAt: new Date(),
    });
    return 'acquired';
  } catch (error: unknown) {
    const code = (error as { code?: number })?.code;
    if (code === 11000) {
      return (await adminAccountExists()) ? 'exists' : 'contended';
    }
    throw error;
  }
}

async function releaseBootstrapLock(): Promise<void> {
  try {
    await BootstrapLock.deleteOne({ _id: ADMIN_BOOTSTRAP_LOCK_ID, completedAt: null });
  } catch {
    // non-fatal
  }
}

async function markBootstrapComplete(): Promise<void> {
  try {
    await BootstrapLock.updateOne(
      { _id: ADMIN_BOOTSTRAP_LOCK_ID },
      { $set: { completedAt: new Date() } }
    );
  } catch {
    // non-fatal
  }
}

export async function performAdminSetup(
  input: {
    email: string;
    password: string;
    setupToken?: string;
  },
  auditContext?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<SetupResult> {
  await connectDB();

  if (await adminAccountExists()) {
    return {
      ok: false,
      errorCode: 'ADMIN_EXISTS',
      message: 'Admin account already exists',
      status: 409,
    };
  }

  const requireToken = isSetupTokenConfigured();
  const validation = validateAdminSetupInput(
    {
      email: input.email,
      password: input.password,
      confirmPassword: input.password,
      setupToken: input.setupToken,
    },
    { requireSetupToken: requireToken }
  );

  if (!validation.valid || !validation.normalized) {
    return {
      ok: false,
      errorCode: 'VALIDATION_ERROR',
      message: 'Invalid setup input',
      status: 400,
      details: validation.errors,
    };
  }

  if (requireToken) {
    if (!verifySetupToken(validation.normalized.setupToken || '')) {
      await writeAuditLog({
        action: AUDIT_ACTIONS.ADMIN_BOOTSTRAP_BLOCKED,
        category: AUDIT_CATEGORY.ADMIN_AUTH,
        details: 'Admin setup blocked — invalid setup token',
        metadata: { ip: auditContext?.ipAddress },
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent,
        success: false,
        errorMessage: 'Invalid setup token',
      });

      return {
        ok: false,
        errorCode: 'INVALID_SETUP_TOKEN',
        message: 'Invalid or missing setup token',
        status: 403,
      };
    }
  } else if (process.env.NODE_ENV === 'production') {
    return {
      ok: false,
      errorCode: 'SETUP_TOKEN_REQUIRED',
      message:
        'ADMIN_SETUP_TOKEN must be set in production for first-time setup, or use: npm run bootstrap-admin',
      status: 403,
    };
  }

  const lock = await acquireBootstrapLock();
  if (lock === 'exists') {
    return {
      ok: false,
      errorCode: 'ADMIN_EXISTS',
      message: 'Admin account already exists',
      status: 409,
    };
  }
  if (lock === 'contended') {
    return {
      ok: false,
      errorCode: 'SETUP_IN_PROGRESS',
      message: 'Another setup request is in progress. Try again shortly.',
      status: 409,
    };
  }

  const { email, password } = validation.normalized;

  try {
    const passwordHash = await hashAdminPassword(password);
    const admin = await Admin.create({
      email,
      passwordHash,
      role: 'super_admin',
      loginAttempts: 0,
      passwordChangedAt: new Date(),
    });

    await markBootstrapComplete();

    await writeAuditLog({
      adminId: admin._id.toString(),
      action: AUDIT_ACTIONS.ADMIN_BOOTSTRAP,
      category: AUDIT_CATEGORY.ADMIN_AUTH,
      details: 'Initial admin account created via setup',
      metadata: { email, source: 'api' },
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      success: true,
    });

    return {
      ok: true,
      adminId: admin._id.toString(),
      email: admin.email,
    };
  } catch (error: unknown) {
    await releaseBootstrapLock();

    const message = error instanceof Error ? error.message : 'Failed to create admin account';
    const code = (error as { code?: number })?.code;

    await writeAuditLog({
      action: AUDIT_ACTIONS.ADMIN_BOOTSTRAP_FAILED,
      category: AUDIT_CATEGORY.ADMIN_AUTH,
      details: 'Admin bootstrap failed',
      metadata: { email, code },
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      success: false,
      errorMessage: message,
    });

    if (code === 11000) {
      return {
        ok: false,
        errorCode: 'DUPLICATE_EMAIL',
        message: 'An admin with this email already exists',
        status: 409,
      };
    }

    return {
      ok: false,
      errorCode: 'SETUP_FAILED',
      message,
      status: 400,
    };
  }
}

/** CLI / legacy bootstrap — reuses validation without setup token in dev. */
export async function createAdminAccount(
  email: string,
  password: string,
  role: 'admin' | 'super_admin' = 'super_admin'
): Promise<{ id: string; email: string }> {
  const normalizedEmail = sanitizeInput(email).toLowerCase().trim();
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('Invalid email format');
  }
  if (!isStrongPassword(password)) {
    throw new Error('Password must be at least 8 characters with upper, lower, and a number');
  }

  const result = await performAdminSetup({ email: normalizedEmail, password });
  if (!result.ok) {
    throw new Error(result.message);
  }

  if (role !== 'admin') {
    await connectDB();
    await Admin.updateOne({ email: normalizedEmail }, { $set: { role } });
  }

  return { id: result.adminId, email: result.email };
}

/** Reset admin password when account exists (requires ADMIN_SETUP_TOKEN). */
export async function resetAdminPassword(
  email: string,
  newPassword: string,
  setupToken: string
): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  await connectDB();

  if (!isSetupTokenConfigured()) {
    return { ok: false, message: 'ADMIN_SETUP_TOKEN is not configured on the server' };
  }
  if (!verifySetupToken(setupToken)) {
    return { ok: false, message: 'Invalid setup token' };
  }

  const normalizedEmail = sanitizeInput(email).toLowerCase().trim();
  if (!isValidEmail(normalizedEmail)) {
    return { ok: false, message: 'Invalid email format' };
  }
  if (!isStrongPassword(newPassword)) {
    return {
      ok: false,
      message: 'Password must be at least 8 characters with upper, lower, and a number',
    };
  }

  const admin = await Admin.findOne({ email: normalizedEmail });
  if (!admin) {
    return { ok: false, message: 'No admin found with that email' };
  }

  admin.passwordHash = await hashAdminPassword(newPassword);
  admin.loginAttempts = 0;
  admin.lockUntil = undefined;
  admin.passwordChangedAt = new Date();
  await admin.save();

  await writeAuditLog({
    adminId: admin._id.toString(),
    action: 'admin_password_reset',
    category: AUDIT_CATEGORY.SECURITY,
    details: 'Admin password reset via setup token',
    metadata: { email: normalizedEmail, source: 'cli_or_recovery' },
    success: true,
  });

  return { ok: true, email: admin.email };
}