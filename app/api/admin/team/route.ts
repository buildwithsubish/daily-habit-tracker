import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { requireAdmin, requireAdminWithRole, requireCsrfCheck, adminRateLimiter } from '@/lib/admin-middleware';
import { hashAdminPassword } from '@/lib/admin-auth';
import { adminInviteSchema, adminRoleUpdateSchema } from '@/lib/validations/admin';
import { apiError } from '@/lib/api-response';
import { writeAuditLogFromRequest } from '@/lib/audit-log';
import { AUDIT_ACTIONS, AUDIT_CATEGORY } from '@/lib/audit-log-constants';

export const runtime = 'nodejs';

// GET: List all administrators (accessible to all authenticated admins)
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    await connectDB();

    const admins = await Admin.find({})
      .select('-passwordHash -twoFactorSecret -twoFactorBackupCodes')
      .sort({ createdAt: -1 })
      .lean();

    const sanitized = admins.map((a: any) => ({
      _id: a._id.toString(),
      email: a.email,
      role: a.role,
      isActive: a.isActive !== false,
      twoFactorEnabled: Boolean(a.twoFactorEnabled),
      lastLogin: a.lastLogin,
      lastLoginIP: a.lastLoginIP,
      createdAt: a.createdAt,
      isSelf: a._id.toString() === auth.adminId,
    }));

    return NextResponse.json({
      success: true,
      admins: sanitized,
      currentUserRole: auth.role,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') return apiError('Authentication required', 'UNAUTHORIZED', 401);
    console.error('Fetch team error:', error);
    return apiError('Failed to fetch admin team', 'INTERNAL_ERROR', 500);
  }
}

// POST: Create or invite new admin team member (super_admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = requireAdminWithRole(request, ['super_admin']);

    try {
      requireCsrfCheck(request);
    } catch (csrfErr: any) {
      return apiError(csrfErr.message || 'CSRF validation failed', 'CSRF_ERROR', 403);
    }

    const rate = await adminRateLimiter.check(request, 10);
    if (!rate.success) return apiError('Too many attempts. Try again later.', 'RATE_LIMITED', 429);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid request format', 'INVALID_JSON', 400);
    }

    const parseResult = adminInviteSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError(
        parseResult.error.issues[0]?.message || 'Invalid administrator payload',
        'INVALID_INPUT',
        400
      );
    }

    const { email, role, temporaryPassword } = parseResult.data;

    await connectDB();
    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      return apiError('An administrator with this email already exists', 'CONFLICT', 409);
    }

    const passwordHash = await hashAdminPassword(temporaryPassword);

    const newAdmin = await Admin.create({
      email: email.toLowerCase(),
      passwordHash,
      role,
      isActive: true,
      passwordChangedAt: null, // forces password reset upon first sign-in
    });

    void writeAuditLogFromRequest(request, {
      adminId: auth.adminId,
      targetResourceId: newAdmin._id.toString(),
      action: 'admin_team_member_created',
      category: AUDIT_CATEGORY.SECURITY,
      details: `SuperAdmin invited new administrator ${email} with role ${role}.`,
      metadata: { targetEmail: email, assignedRole: role },
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: `Admin ${email} created successfully with role ${role}.`,
      admin: {
        _id: newAdmin._id.toString(),
        email: newAdmin.email,
        role: newAdmin.role,
        isActive: newAdmin.isActive,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.startsWith('Forbidden')) return apiError(message, 'FORBIDDEN', 403);
    if (message === 'Unauthorized') return apiError('Authentication required', 'UNAUTHORIZED', 401);
    console.error('Create admin error:', error);
    return apiError('Failed to create team member', 'INTERNAL_ERROR', 500);
  }
}

// PATCH: Update admin role or active status (super_admin only)
export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAdminWithRole(request, ['super_admin']);

    try {
      requireCsrfCheck(request);
    } catch (csrfErr: any) {
      return apiError(csrfErr.message || 'CSRF validation failed', 'CSRF_ERROR', 403);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid request format', 'INVALID_JSON', 400);
    }

    const { adminId, role, isActive, resetMFA } = body;
    if (!adminId) return apiError('Admin ID is required', 'MISSING_PARAM', 400);

    await connectDB();
    const targetAdmin = await Admin.findById(adminId);
    if (!targetAdmin) return apiError('Target administrator not found', 'NOT_FOUND', 404);

    // Safeguard: Prevent modifying the last super_admin
    if (targetAdmin.role === 'super_admin' && (role !== 'super_admin' || isActive === false)) {
      const superAdminCount = await Admin.countDocuments({ role: 'super_admin', isActive: true });
      if (superAdminCount <= 1) {
        return apiError(
          'Cannot demote or deactivate the last remaining active SuperAdmin',
          'SAFEGUARD_BLOCKED',
          400
        );
      }
    }

    const updates: Record<string, any> = {};

    if (role && ['super_admin', 'admin', 'manager', 'editor', 'viewer'].includes(role)) {
      updates.role = role;
    }

    if (typeof isActive === 'boolean') {
      updates.isActive = isActive;
    }

    if (resetMFA === true) {
      updates.twoFactorEnabled = false;
      updates.twoFactorSecret = null;
      updates.twoFactorBackupCodes = [];
    }

    const previousValues = {
      role: targetAdmin.role,
      isActive: targetAdmin.isActive,
      twoFactorEnabled: targetAdmin.twoFactorEnabled,
    };

    Object.assign(targetAdmin, updates);
    await targetAdmin.save();

    void writeAuditLogFromRequest(request, {
      adminId: auth.adminId,
      targetResourceId: targetAdmin._id.toString(),
      action: AUDIT_ACTIONS.ROLE_CHANGE,
      category: AUDIT_CATEGORY.SECURITY,
      details: `SuperAdmin modified privileges for ${targetAdmin.email}.`,
      metadata: { targetEmail: targetAdmin.email },
      previousValues,
      updatedValues: updates,
      success: true,
    });

    return NextResponse.json({
      success: true,
      message: `Administrator ${targetAdmin.email} updated successfully.`,
      admin: {
        _id: targetAdmin._id.toString(),
        email: targetAdmin.email,
        role: targetAdmin.role,
        isActive: targetAdmin.isActive,
        twoFactorEnabled: targetAdmin.twoFactorEnabled,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.startsWith('Forbidden')) return apiError(message, 'FORBIDDEN', 403);
    if (message === 'Unauthorized') return apiError('Authentication required', 'UNAUTHORIZED', 401);
    console.error('Update admin error:', error);
    return apiError('Failed to update admin', 'INTERNAL_ERROR', 500);
  }
}
