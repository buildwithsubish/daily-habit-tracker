import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET + '-admin';

// Enhanced password hashing with maximum security (15 rounds for admin)
export async function hashAdminPassword(password: string): Promise<string> {
  // Using 15 salt rounds for maximum security for admin accounts
  return bcrypt.hash(password, 15);
}

export async function verifyAdminPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAdminToken(adminId: string): string {
  return jwt.sign({ adminId, type: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: '24h' });
}

export function verifyAdminToken(token: string): { adminId: string } | null {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as { adminId: string; type: string };
    if (decoded.type !== 'admin') return null;
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

