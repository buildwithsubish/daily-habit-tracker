import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import AuditLog from './models/AuditLog';
import {
  AuditAction,
  AuditCategory,
  isValidAuditCategory,
} from './audit-log-constants';

export interface WriteAuditLogInput {
  adminId?: string | mongoose.Types.ObjectId | null;
  userId?: string | mongoose.Types.ObjectId | null;
  action: AuditAction | string;
  actionType?: string;
  category: AuditCategory | string;
  targetResourceId?: string | null;
  details?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
  previousValues?: Record<string, unknown>;
  updatedValues?: Record<string, unknown>;
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

export function getClientUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

function toObjectId(
  id: string | mongoose.Types.ObjectId | null | undefined
): mongoose.Types.ObjectId | null {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return null;
}

/**
 * Writes an audit log entry. Never throws — failures are logged and swallowed
 * so the main API operation is never blocked by audit logging.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  try {
    if (!input.action?.trim()) {
      console.warn('[AuditLog] Skipped: missing action');
      return;
    }

    if (!isValidAuditCategory(input.category)) {
      console.warn(
        `[AuditLog] Skipped: invalid category "${input.category}". Use a value from audit-log-constants.`
      );
      return;
    }

    const metadata: Record<string, unknown> = {
      ...(input.metadata || {}),
    };
    if (input.previousValues) metadata.previousValues = input.previousValues;
    if (input.updatedValues) metadata.updatedValues = input.updatedValues;

    await AuditLog.create({
      adminId: toObjectId(input.adminId),
      userId: toObjectId(input.userId),
      action: input.action,
      actionType: input.actionType || input.action,
      category: input.category,
      targetResourceId: input.targetResourceId || null,
      details: input.details,
      metadata,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      success: input.success !== false,
      errorMessage: input.errorMessage,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[AuditLog] Write failed (non-fatal):', message);
  }
}

export async function writeAuditLogFromRequest(
  request: NextRequest,
  input: Omit<WriteAuditLogInput, 'ipAddress' | 'userAgent'>
): Promise<void> {
  return writeAuditLog({
    ...input,
    ipAddress: getClientIp(request),
    userAgent: getClientUserAgent(request),
  });
}