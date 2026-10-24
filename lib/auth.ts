import crypto from 'crypto';
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET must be configured before authentication is used');
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  return secret;
}

// Pre-computed dummy Argon2id hash for constant-time comparison when email doesn't exist
// Eliminates email enumeration timing attacks
const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgqlfreSAeYFlG8qNJ3U28Wq9TeAH9PnA';

/**
 * Hash password using Argon2id with recommended parameters
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify password supporting both Argon2id and legacy Bcrypt hashes
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    if (hash.startsWith('$argon2')) {
      return await argon2.verify(hash, password);
    }
    if (hash.startsWith('$2')) {
      return await bcrypt.compare(password, hash);
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Constant-time password verification to prevent email enumeration timing attacks
 */
export async function verifyUserPasswordConstantTime(
  password: string,
  actualHash?: string | null
): Promise<boolean> {
  const hashToCompare = actualHash || DUMMY_ARGON2_HASH;
  const match = await verifyPassword(password, hashToCompare);
  return Boolean(actualHash && match);
}

/**
 * 30-day Access Token for persistent user session
 */
export function generateAccessToken(userId: string, sessionId?: string): string {
  return jwt.sign(
    { userId, sessionId, type: 'access' },
    getJwtSecret(),
    { expiresIn: '30d' }
  );
}

/**
 * Backward-compatible 30-day token generator
 */
export function generateToken(userId: string): string {
  return generateAccessToken(userId);
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function verifyAccessToken(token: string): { userId: string; sessionId?: string } | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; sessionId?: string };
    return decoded;
  } catch {
    return null;
  }
}

export function verifyToken(token: string): { userId: string } | null {
  return verifyAccessToken(token);
}

/**
 * Data Transfer Object (DTO) Sanitization:
 * Strips passwordHash, twoFactorSecret, refreshTokenHash, and internal properties
 */
export function sanitizeUserDTO<T extends Record<string, any>>(user: T): Record<string, any> {
  const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.twoFactorBackupCodes;
  delete obj.refreshTokenHash;
  delete obj.__v;
  return obj;
}
