import { NextRequest, NextResponse } from 'next/server';

interface LoginAttempt {
  id: string;
  phone: string;
  code?: string;
  status: 'success' | 'failed' | 'timeout';
  timestamp: string;
  duration: number;
  country?: string;
  errorMessage?: string;
}

interface HistoryResponse {
  attempts: LoginAttempt[];
  total: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  averageDuration: number;
}

// In-memory storage for demo - in production, use database
let loginHistory: LoginAttempt[] = [];

export async function GET(request: NextRequest): Promise<NextResponse<HistoryResponse>> {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    const attempts = loginHistory.slice(offset, offset + limit);
    
    const successCount = loginHistory.filter(a => a.status === 'success').length;
    const failureCount = loginHistory.filter(a => a.status === 'failed').length;
    const timeoutCount = loginHistory.filter(a => a.status === 'timeout').length;
    const averageDuration = loginHistory.length > 0
      ? loginHistory.reduce((sum, a) => sum + a.duration, 0) / loginHistory.length
      : 0;

    return NextResponse.json({
      attempts,
      total: loginHistory.length,
      successCount,
      failureCount,
      timeoutCount,
      averageDuration,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        attempts: [],
        total: 0,
        successCount: 0,
        failureCount: 0,
        timeoutCount: 0,
        averageDuration: 0,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; id?: string }>> {
  try {
    const body = await request.json();

    const attempt: LoginAttempt = {
      id: Math.random().toString(36).substring(7),
      phone: body.phone,
      code: body.code,
      status: body.status || 'failed',
      timestamp: new Date().toISOString(),
      duration: body.duration || 0,
      country: body.country || 'Unknown',
      errorMessage: body.errorMessage,
    };

    loginHistory.unshift(attempt);

    // Keep only last 100 attempts in memory
    if (loginHistory.length > 100) {
      loginHistory = loginHistory.slice(0, 100);
    }

    return NextResponse.json({ success: true, id: attempt.id });
  } catch (error) {
    return NextResponse.json(
      { success: false },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<{ success: boolean }>> {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (id) {
      loginHistory = loginHistory.filter(attempt => attempt.id !== id);
    } else {
      loginHistory = [];
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
