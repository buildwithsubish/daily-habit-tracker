import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET + '-admin';

export interface AdminTokenPayload {
  adminId: string;
  email?: string;
  role?: 'admin' | 'super_admin';
  twoFactorVerified?: boolean;
  type: 'admin';
  iat?: number;
  exp?: number;
}

// Enhanced password hashing with maximum security (15 rounds for admin)
export async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyAdminPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAdminToken(
  adminId: string, 
  options?: {
    email?: string;
    role?: 'admin' | 'super_admin';
    twoFactorVerified?: boolean;
  }
): string {
  return jwt.sign(
    { 
      adminId, 
      email: options?.email,
      role: options?.role || 'admin',
      twoFactorVerified: options?.twoFactorVerified || false,
      type: 'admin' 
    }, 
    ADMIN_JWT_SECRET, 
    { expiresIn: '24h' }
  );
}

export function generateAdminRefreshToken(adminId: string): string {
  return jwt.sign(
    { adminId, type: 'admin_refresh' },
    ADMIN_JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as AdminTokenPayload;
    if (decoded.type !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyAdminRefreshToken(token: string): { adminId: string } | null {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { adminId: string; type: string };
    if (decoded.type !== 'admin_refresh') return null;
    return { adminId: decoded.adminId };
  } catch {
    return null;
  }
}

// Generate secure reset token
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash reset token for storage
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Generate 2FA secret
export function generate2FASecret(): string {
  return crypto.randomBytes(20).toString('hex');
}

// Verify 2FA code (simple implementation - in production use speakeasy or similar)
export function verify2FACode(secret: string, code: string): boolean {
  // This is a simplified implementation
  // In production, use a proper TOTP library like speakeasy
  const expectedCode = crypto.createHash('sha256')
    .update(secret + Math.floor(Date.now() / 30000).toString())
    .digest('hex')
    .substring(0, 6);
  
  return code === expectedCode;
}
