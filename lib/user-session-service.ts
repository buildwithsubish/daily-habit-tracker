import crypto from 'crypto';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import UserSession, { IUserSession } from './models/UserSession';
import {
  hashToken,
  parseDeviceName,
  REFRESH_TOKEN_MAX_AGE_PERSISTENT,
  REFRESH_TOKEN_MAX_AGE_SESSION,
} from './auth-cookies';
import { generateAccessToken, generateRefreshToken } from './auth';

export interface CreateSessionResult {
  session: IUserSession;
  accessToken: string;
  refreshToken: string;
  tokenFamilyId: string;
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export async function createUserSession(
  userId: string,
  request: NextRequest,
  keepSignedIn = false
): Promise<CreateSessionResult> {
  const tokenFamilyId = crypto.randomUUID();
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);

  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const deviceName = parseDeviceName(userAgent);

  const maxAgeMs = (keepSignedIn ? REFRESH_TOKEN_MAX_AGE_PERSISTENT : REFRESH_TOKEN_MAX_AGE_SESSION) * 1000;
  const expiresAt = new Date(Date.now() + maxAgeMs);

  const session = await UserSession.create({
    userId: new mongoose.Types.ObjectId(userId),
    tokenFamilyId,
    refreshTokenHash,
    ipAddress,
    userAgent,
    deviceName,
    isRevoked: false,
    lastActiveAt: new Date(),
    expiresAt,
  });

  const accessToken = generateAccessToken(userId, session._id.toString());

  return {
    session,
    accessToken,
    refreshToken: rawRefreshToken,
    tokenFamilyId,
  };
}

export interface RotateResult {
  success: boolean;
  accessToken?: string;
  newRefreshToken?: string;
  session?: IUserSession;
  error?: string;
  familyRevoked?: boolean;
}

/**
 * Meta / X Style Automatic Refresh Token Rotation with Anti-Hijacking Reuse Detection
 */
export async function rotateUserRefreshToken(
  rawRefreshToken: string,
  request: NextRequest
): Promise<RotateResult> {
  if (!rawRefreshToken || rawRefreshToken.length < 32) {
    return { success: false, error: 'Invalid refresh token format' };
  }

  const presentedHash = hashToken(rawRefreshToken);

  // Search for the session by the presented refresh token hash
  const session = await UserSession.findOne({ refreshTokenHash: presentedHash });

  if (!session) {
    return { success: false, error: 'Invalid or unrecognized refresh token' };
  }

  // REUSE DETECTION (Anti-Hijacking):
  // If the token was already revoked, someone is replaying a stolen token!
  // Immediately revoke all sessions in the entire token family!
  if (session.isRevoked) {
    await UserSession.updateMany(
      { tokenFamilyId: session.tokenFamilyId },
      {
        $set: {
          isRevoked: true,
          revokedReason: 'Refresh token reuse detected (possible theft/hijacking)',
        },
      }
    );
    return {
      success: false,
      error: 'Security alert: Refresh token reuse detected. All sessions in this family have been terminated.',
      familyRevoked: true,
    };
  }

  // Check expiration
  if (session.expiresAt <= new Date()) {
    session.isRevoked = true;
    session.revokedReason = 'Session expired';
    await session.save();
    return { success: false, error: 'Session has expired' };
  }

  // Issue brand-new refresh token and rotate
  const newRefreshToken = generateRefreshToken();
  const newHash = hashToken(newRefreshToken);

  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  session.refreshTokenHash = newHash;
  session.lastActiveAt = new Date();
  session.ipAddress = ipAddress;
  session.userAgent = userAgent;
  session.deviceName = parseDeviceName(userAgent);
  await session.save();

  const accessToken = generateAccessToken(session.userId.toString(), session._id.toString());

  return {
    success: true,
    accessToken,
    newRefreshToken,
    session,
  };
}

export async function revokeUserSession(
  sessionId: string,
  reason = 'User logged out'
): Promise<boolean> {
  const result = await UserSession.updateOne(
    { _id: new mongoose.Types.ObjectId(sessionId), isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedReason: reason,
      },
    }
  );
  return result.modifiedCount > 0;
}

export async function revokeAllOtherUserSessions(
  userId: string,
  currentSessionId?: string
): Promise<number> {
  const query: any = {
    userId: new mongoose.Types.ObjectId(userId),
    isRevoked: false,
  };

  if (currentSessionId && mongoose.Types.ObjectId.isValid(currentSessionId)) {
    query._id = { $ne: new mongoose.Types.ObjectId(currentSessionId) };
  }

  const result = await UserSession.updateMany(query, {
    $set: {
      isRevoked: true,
      revokedReason: 'Revoked by user (Log out of all other sessions)',
    },
  });

  return result.modifiedCount;
}

export interface SanitizedSessionDTO {
  id: string;
  deviceName: string;
  ipAddress: string;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export async function getUserActiveSessions(
  userId: string,
  currentSessionId?: string
): Promise<SanitizedSessionDTO[]> {
  const sessions = await UserSession.find({
    userId: new mongoose.Types.ObjectId(userId),
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ lastActiveAt: -1 });

  return sessions.map((s) => ({
    id: s._id.toString(),
    deviceName: s.deviceName,
    ipAddress: s.ipAddress,
    lastActiveAt: s.lastActiveAt,
    createdAt: s.createdAt,
    isCurrent: Boolean(currentSessionId && s._id.toString() === currentSessionId),
  }));
}
