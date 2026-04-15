import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import WhatsAppSession from '@/lib/models/WhatsAppSession';
import User from '@/lib/models/User';

const PYTHON_SERVER_URL = process.env.WHATSAPP_SERVER_URL || 'http://127.0.0.1:8765';

/**
 * Check WhatsApp broadcast health and readiness
 * Verifies:
 * - WhatsApp session exists and is connected
 * - Python server is running
 * - Target users are ready to receive messages
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const adminId = getAdminIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json(
        { 
          status: 'error',
          error: 'Unauthorized',
          details: 'No admin authentication provided'
        },
        { status: 401 }
      );
    }

    const health = {
      timestamp: new Date().toISOString(),
      adminId,
      checks: {
        whatsappSession: { ok: false, message: '' },
        pythonServer: { ok: false, message: '' },
        targetUsers: { ok: false, count: 0, message: '' },
      },
    };

    // ✅ Check 1: WhatsApp Session
    try {
      const whatsappSession = await WhatsAppSession.findOne({
        $or: [
          { ADMIN_SESSION_ID: adminId },
          { adminIdString: adminId },
          { adminId: adminId }
        ]
      });

      if (!whatsappSession) {
        health.checks.whatsappSession.message = 'No WhatsApp session found. Visit /admin/whatsapp to connect.';
      } else if (whatsappSession.status !== 'connected') {
        health.checks.whatsappSession.message = `WhatsApp session is ${whatsappSession.status}. Last connected: ${whatsappSession.lastConnectedAt || 'Never'}`;
      } else {
        health.checks.whatsappSession.ok = true;
        health.checks.whatsappSession.message = `Connected as ${whatsappSession.phoneNumber || 'Unknown'}`;
      }
    } catch (error) {
      health.checks.whatsappSession.message = `Error checking session: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // ✅ Check 2: Python Server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${PYTHON_SERVER_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      }).catch(err => {
        clearTimeout(timeoutId);
        throw err;
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        health.checks.pythonServer.ok = true;
        health.checks.pythonServer.message = 'Python WhatsApp server is running';
      } else {
        health.checks.pythonServer.message = `Python server returned ${response.status}`;
      }
    } catch (error) {
      health.checks.pythonServer.message = `Cannot reach Python server at ${PYTHON_SERVER_URL}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // ✅ Check 3: Target Users
    try {
      const targetUsersCount = await User.countDocuments({
        whatsappVerified: true,
        whatsappAutomation: true,
        whatsappNumber: { $exists: true, $ne: '' },
      });

      health.checks.targetUsers.count = targetUsersCount;
      if (targetUsersCount === 0) {
        health.checks.targetUsers.message = 'No users available for broadcast (they need WhatsApp verified + automation enabled)';
      } else {
        health.checks.targetUsers.ok = true;
        health.checks.targetUsers.message = `${targetUsersCount} users ready to receive broadcasts`;
      }
    } catch (error) {
      health.checks.targetUsers.message = `Error counting users: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Overall status
    const allOk = 
      health.checks.whatsappSession.ok && 
      health.checks.pythonServer.ok && 
      (health.checks.targetUsers.ok || health.checks.targetUsers.count === 0);

    return NextResponse.json(
      {
        status: allOk ? 'healthy' : 'unhealthy',
        ...health,
        recommendations: getRecommendations(health),
      },
      { status: allOk ? 200 : 503 }
    );
  } catch (error: any) {
    console.error('[Broadcast Health] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

function getRecommendations(health: any): string[] {
  const recommendations: string[] = [];

  if (!health.checks.whatsappSession.ok) {
    recommendations.push('❌ Connect WhatsApp: Visit /admin/whatsapp and scan the QR code');
  }

  if (!health.checks.pythonServer.ok) {
    recommendations.push('❌ Start Python server: Run `python whatsapp_server.py` in a terminal');
  }

  if (health.checks.targetUsers.count === 0) {
    recommendations.push('⚠️ No target users: Ask users to verify their WhatsApp number and enable automation');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All systems ready! Broadcasts should work properly.');
  }

  return recommendations;
}
