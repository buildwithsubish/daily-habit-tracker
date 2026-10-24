import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { AdminRole } from './models/Admin';

export const runtime = 'nodejs';

export function getAdminJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('ADMIN_JWT_SECRET must be configured before admin authentication is used');
  if (process.env.NODE_ENV === 'production' && secret.length < 32) throw new Error('ADMIN_JWT_SECRET must be at least 32 characters in production');
  return secret;
}

export interface AdminTokenPayload {
  adminId: string;
  email?: string;
  role?: AdminRole;
  sessionId?: string;
  sessionToken?: string;
  twoFactorVerified?: boolean;
  passwordResetRequired?: boolean;
  type: 'admin';
  iat?: number;
  exp?: number;
}

// Enhanced password hashing with maximum security (bcrypt cost factor 12)
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
    role?: AdminRole;
    sessionId?: string;
    sessionToken?: string;
    twoFactorVerified?: boolean;
    passwordResetRequired?: boolean;
  }
): string {
  return jwt.sign(
    {
      adminId,
      email: options?.email,
      role: options?.role || 'admin',
      sessionId: options?.sessionId,
      sessionToken: options?.sessionToken,
      twoFactorVerified: options?.twoFactorVerified || false,
      passwordResetRequired: options?.passwordResetRequired || false,
      type: 'admin'
    },
    getAdminJwtSecret(),
    { expiresIn: '15m' } // 15-minute access token for hardened security
  );
}

export function generateAdminRefreshToken(adminId: string): string {
  return jwt.sign(
    { adminId, type: 'admin_refresh' },
    getAdminJwtSecret(),
    { expiresIn: '7d' }
  );
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getAdminJwtSecret()) as AdminTokenPayload;
    if (decoded.type !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function verifyAdminRefreshToken(token: string): { adminId: string } | null {
  try {
    const decoded = jwt.verify(token, getAdminJwtSecret()) as { adminId: string; type: string };
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
  return encodeBase32(crypto.randomBytes(20));
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBase32(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(input: string): Buffer | null {
  const normalized = input.toUpperCase().replace(/=+$/g, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return output.length ? Buffer.from(output) : null;
}

/** RFC 6238 TOTP verification using a 30-second HMAC-SHA1 time step. */
export function verify2FACode(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const key = decodeBase32(secret);
  if (!key) return false;
  const currentStep = Math.floor(Date.now() / 30_000);
  const supplied = Buffer.from(code, 'ascii');
  for (const offset of [-1, 0, 1]) {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(currentStep + offset));
    const digest = crypto.createHmac('sha1', key).update(counter).digest();
    const index = digest[digest.length - 1] & 0x0f;
    const binary = ((digest[index] & 0x7f) << 24) | ((digest[index + 1] & 0xff) << 16) |
      ((digest[index + 2] & 0xff) << 8) | (digest[index + 3] & 0xff);
    const expected = Buffer.from(String(binary % 1_000_000).padStart(6, '0'), 'ascii');
    if (crypto.timingSafeEqual(supplied, expected)) return true;
  }
  return false;
}
