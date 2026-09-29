import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';

interface PhoneLoginStatus {
  currentSession: {
    status: 'connected' | 'disconnected' | 'connecting';
    lastLoginTime?: string;
    currentPhone?: string;
  };
  statistics: {
    totalAttempts: number;
    successfulLogins: number;
    failedAttempts: number;
    averageLoginTime: number;
  };
  serverHealth: {
    isRunning: boolean;
    uptime: number;
    lastChecked: string;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<PhoneLoginStatus | { error: string }>> {
  try {
    const authenticatedAdminId = getAdminIdFromRequest(request);
    if (!authenticatedAdminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();
    const finalSessionId = authenticatedAdminId;

    let status: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
    let lastLoginTime: string | undefined;

    try {
      const pythonServerUrl = process.env.WHATSAPP_SERVER_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${pythonServerUrl}/session/status?session_id=${finalSessionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        status = data.status || 'disconnected';
      }
    } catch (error) {
      console.error('Failed to fetch session status from Python server:', error);
    }

    const data: PhoneLoginStatus = {
      currentSession: {
        status,
        lastLoginTime: lastLoginTime || new Date().toISOString(),
        currentPhone: undefined,
      },
      statistics: {
        totalAttempts: 0,
        successfulLogins: 0,
        failedAttempts: 0,
        averageLoginTime: 0,
      },
      serverHealth: {
        isRunning: status !== 'disconnected',
        uptime: Math.floor(Date.now() / 1000),
        lastChecked: new Date().toISOString(),
      },
    };

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch phone login status' },
      { status: 500 }
    );
  }
}
