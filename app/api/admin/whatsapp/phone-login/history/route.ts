import { NextRequest, NextResponse } from 'next/server';
import { getAdminIdFromRequest, adminRateLimiter } from '@/lib/admin-middleware';

interface LoginAttempt {
  id: string;
  phone: string;
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

// This history is scoped to the signed-in admin and kept small in process memory.
const loginHistory = new Map<string, LoginAttempt[]>();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const adminId = getAdminIdFromRequest(request);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const limitValue = Number(request.nextUrl.searchParams.get('limit') || '50');
    const offsetValue = Number(request.nextUrl.searchParams.get('offset') || '0');
    if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 100 || !Number.isInteger(offsetValue) || offsetValue < 0) {
      return NextResponse.json({ error: 'Invalid pagination values' }, { status: 400 });
    }
    const limit = limitValue;
    const offset = offsetValue;

    const history = loginHistory.get(adminId) || [];
    const attempts = history.slice(offset, offset + limit);
    
    const successCount = history.filter(a => a.status === 'success').length;
    const failureCount = history.filter(a => a.status === 'failed').length;
    const timeoutCount = history.filter(a => a.status === 'timeout').length;
    const averageDuration = history.length > 0
      ? history.reduce((sum, a) => sum + a.duration, 0) / history.length
      : 0;

    return NextResponse.json({
      attempts,
      total: history.length,
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
    const adminId = getAdminIdFromRequest(request);
    if (!adminId) return NextResponse.json({ success: false }, { status: 401 });
    const rate = await adminRateLimiter.check(request, 30);
    if (!rate.success) return NextResponse.json({ success: false }, { status: 429 });
    const body = await request.json();

    if (!['success', 'failed', 'timeout'].includes(body.status) || typeof body.phone !== 'string' || body.phone.length > 40 ||
      !Number.isFinite(body.duration) || body.duration < 0 || body.duration > 3_600) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const attempt: LoginAttempt = {
      id: Math.random().toString(36).substring(7),
      phone: body.phone,
      status: body.status || 'failed',
      timestamp: new Date().toISOString(),
      duration: body.duration || 0,
      country: body.country || 'Unknown',
      errorMessage: typeof body.errorMessage === 'string' ? body.errorMessage.slice(0, 250) : undefined,
    };

    const history = loginHistory.get(adminId) || [];
    history.unshift(attempt);
    loginHistory.set(adminId, history.slice(0, 100));

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
    const adminId = getAdminIdFromRequest(request);
    if (!adminId) return NextResponse.json({ success: false }, { status: 401 });
    const rate = await adminRateLimiter.check(request, 30);
    if (!rate.success) return NextResponse.json({ success: false }, { status: 429 });
    const id = request.nextUrl.searchParams.get('id');

    const history = loginHistory.get(adminId) || [];
    if (id) {
      loginHistory.set(adminId, history.filter(attempt => attempt.id !== id));
    } else {
      loginHistory.delete(adminId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
