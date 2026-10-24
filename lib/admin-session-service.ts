import crypto from 'crypto';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import AdminSession, { IAdminSession } from './models/AdminSession';
import Admin, { IAdmin, AdminRole } from './models/Admin';
import { getClientIp, getClientUserAgent } from './audit-log';

// Inactivity timeout: 30 minutes
export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;
// Max total session lifetime: 24 hours
export const SESSION_MAX_LIFETIME_MS = 24 * 60 * 60 * 1000;

function parseUserAgent(ua: string): string {
  if (!ua || ua === 'unknown') return 'Unknown Device';
  let browser = 'Browser';
  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/edg/i.test(ua)) browser = 'Edge';

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

  return `${browser} on ${os}`;
}

export async function createAdminSession(
  adminId: string,
  request: NextRequest
): Promise<{ session: IAdminSession; sessionToken: string }> {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const ipAddress = getClientIp(request);
  const userAgent = getClientUserAgent(request);
  const deviceInfo = parseUserAgent(userAgent);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_INACTIVITY_MS);

  const session = await AdminSession.create({
    adminId: new mongoose.Types.ObjectId(adminId),
    sessionToken,
    ipAddress,
    userAgent,
    deviceInfo,
    lastActive: now,
    expiresAt,
    isRevoked: false,
  });

  return { session, sessionToken };
}

export async function validateAndTouchAdminSession(
  sessionToken: string
): Promise<{
  valid: boolean;
  session?: IAdminSession;
  admin?: IAdmin;
  role?: AdminRole;
  error?: string;
}> {
  if (!sessionToken || sessionToken.length < 16) {
    return { valid: false, error: 'Invalid session token format' };
  }

  const session = await AdminSession.findOne({
    sessionToken,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    return { valid: false, error: 'Session expired or revoked' };
  }

  const admin = await Admin.findById(session.adminId);
  if (!admin || !admin.isActive) {
    return { valid: false, error: 'Admin account is inactive or removed' };
  }

  // Update sliding window inactivity expiration
  const now = new Date();
  const absoluteMaxExpires = new Date(session.createdAt.getTime() + SESSION_MAX_LIFETIME_MS);
  let newExpiresAt = new Date(now.getTime() + SESSION_INACTIVITY_MS);
  if (newExpiresAt > absoluteMaxExpires) {
    newExpiresAt = absoluteMaxExpires;
  }

  // If expired past absolute maximum lifetime, revoke
  if (now > absoluteMaxExpires) {
    session.isRevoked = true;
    session.revokedAt = now;
    session.revokedReason = 'Max session lifetime exceeded';
    await session.save();
    return { valid: false, error: 'Session exceeded maximum 24h lifetime' };
  }

  session.lastActive = now;
  session.expiresAt = newExpiresAt;
  await session.save();

  return {
    valid: true,
    session,
    admin,
    role: admin.role,
  };
}

export async function revokeAdminSession(
  sessionIdOrToken: string,
  reason = 'Admin logged out or session revoked'
): Promise<boolean> {
  const query = mongoose.Types.ObjectId.isValid(sessionIdOrToken)
    ? { _id: new mongoose.Types.ObjectId(sessionIdOrToken) }
    : { sessionToken: sessionIdOrToken };

  const result = await AdminSession.updateOne(
    { ...query, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    }
  );

  return result.modifiedCount > 0;
}

export async function revokeAllOtherAdminSessions(
  adminId: string,
  currentSessionToken: string
): Promise<number> {
  const result = await AdminSession.updateMany(
    {
      adminId: new mongoose.Types.ObjectId(adminId),
      sessionToken: { $ne: currentSessionToken },
      isRevoked: false,
    },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: 'Revoked by user from Security Dashboard (Revoke All Others)',
      },
    }
  );

  return result.modifiedCount;
}

export interface SanitizedAdminSession {
  id: string;
  ipAddress: string;
  deviceInfo: string;
  userAgent: string;
  lastActive: Date;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

export async function getActiveAdminSessions(
  adminId: string,
  currentSessionToken?: string
): Promise<SanitizedAdminSession[]> {
  const sessions = await AdminSession.find({
    adminId: new mongoose.Types.ObjectId(adminId),
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActive: -1 });

  return sessions.map((s) => ({
    id: s._id.toString(),
    ipAddress: s.ipAddress,
    deviceInfo: s.deviceInfo || parseUserAgent(s.userAgent),
    userAgent: s.userAgent,
    lastActive: s.lastActive,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    isCurrent: Boolean(currentSessionToken && s.sessionToken === currentSessionToken),
  }));
}
