import { NextRequest, NextResponse } from 'next/server';

interface ServerHealth {
  isRunning: boolean;
  uptime?: number;
  lastChecked: string;
  responseTime: number;
  version?: string;
  features: {
    phoneLogin: boolean;
    sessionPersistence: boolean;
    qrCodeLogin: boolean;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<ServerHealth | { error: string }>> {
  const startTime = Date.now();

  try {
    const response = await fetch('http://127.0.0.1:8765/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();

      return NextResponse.json({
        isRunning: true,
        uptime: data.uptime,
        lastChecked: new Date().toISOString(),
        responseTime,
        version: '1.0.0',
        features: {
          phoneLogin: true,
          sessionPersistence: true,
          qrCodeLogin: true,
        },
      });
    } else {
      return NextResponse.json(
        {
          isRunning: false,
          lastChecked: new Date().toISOString(),
          responseTime,
          features: {
            phoneLogin: false,
            sessionPersistence: false,
            qrCodeLogin: false,
          },
        },
        { status: 503 }
      );
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        isRunning: false,
        lastChecked: new Date().toISOString(),
        responseTime,
        features: {
          phoneLogin: false,
          sessionPersistence: false,
          qrCodeLogin: false,
        },
        error: error instanceof Error ? error.message : 'Server unreachable',
      },
      { status: 503 }
    );
  }
}
