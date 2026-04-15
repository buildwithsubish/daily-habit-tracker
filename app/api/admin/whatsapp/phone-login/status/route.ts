import { NextRequest, NextResponse } from 'next/server';

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
    const sessionId = request.nextUrl.searchParams.get('session_id') || 'default';

    let status: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
    let lastLoginTime: string | undefined;

    try {
      const response = await fetch('http://127.0.0.1:8765/session/status?session_id=' + sessionId, {
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
