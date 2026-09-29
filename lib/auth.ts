import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET must be configured before authentication is used');
  if (process.env.NODE_ENV === 'production' && secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters in production');
  return secret;
}

// Enhanced password hashing with higher salt rounds for better security
export async function hashPassword(password: string): Promise<string> {
  // Using 12 salt rounds for better security (industry standard)
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '30d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}
