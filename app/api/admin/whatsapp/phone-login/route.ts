import { NextRequest, NextResponse } from 'next/server';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import { normalizeLocalPhoneNumber, resolveCountryName } from '@/lib/phone-login';
import { adminRateLimiter } from '@/lib/admin-middleware';
import connectDB from '@/lib/mongodb';

interface PhoneLoginRequest {
  phone_number: string;
  country?: string;
  country_code?: string;
  session_timeout?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const adminId = getAdminIdFromRequest(request);
    if (!adminId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const rate = await adminRateLimiter.check(request, 5);
    if (!rate.success) return NextResponse.json({ success: false, error: 'Too many login-code requests. Try again shortly.' }, { status: 429 });
    await connectDB();
    const body: PhoneLoginRequest = await request.json();
    const {
      phone_number,
      country,
      country_code,
      session_timeout = 120,
    } = body;

    if (!Number.isInteger(session_timeout) || session_timeout < 30 || session_timeout > 300) {
      return NextResponse.json({ success: false, error: 'Session timeout must be between 30 and 300 seconds' }, { status: 400 });
    }

    const localPhone = normalizeLocalPhoneNumber(phone_number, country_code);
    if (!localPhone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const countryName = resolveCountryName(country, country_code);

    const finalSessionId = adminId;
    console.log('[WhatsApp Phone Login] session=%s country=%s', finalSessionId, countryName);

    const pythonServerUrl = process.env.WHATSAPP_SERVER_URL || 'http://127.0.0.1:8000';

    const controller = new AbortController();
    const timeoutMs = Math.max((session_timeout + 90) * 1000, 180000);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${pythonServerUrl}/session/phone-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: finalSessionId,
          phone_number: localPhone,
          country: countryName,
          country_code: country_code || undefined,
          session_timeout,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json();
    const hasLoginCode = Boolean(data?.login_code);

    // Pass through the response with the same status code
    if (response.ok || response.status === 408 || response.status === 400) {
      // 200: login code generated or connected
      // 408: Timeout waiting for login screen
      // 400: Bad request or login failed
      return NextResponse.json({
        success: response.ok || hasLoginCode,
        ...data,
      }, { status: hasLoginCode ? 200 : response.status });
    } else if (response.status === 500) {
      // Server error
      return NextResponse.json({
        success: false,
        error: data.error || 'WhatsApp server error'
      }, { status: 500 });
    } else {
      return NextResponse.json({
        success: false,
        error: data.error || 'Phone login failed'
      }, { status: response.status });
    }
  } catch (error) {
    console.error('Phone login error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to connect to WhatsApp server' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const adminId = getAdminIdFromRequest(request);
    if (!adminId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const finalSessionId = adminId;

    const pythonServerUrl = process.env.WHATSAPP_SERVER_URL || 'http://127.0.0.1:8000';

    const response = await fetch(`${pythonServerUrl}/session/status?session_id=${finalSessionId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      status: data.status || 'disconnected',
      phone_number: data.phone_number,
      qr_required: data.qr_required,
      qr_code: data.qr_code,
      session_exists: data.session_exists,
    });
  } catch (error) {
    console.error('Phone login status error:', error);
    return NextResponse.json({
      success: false,
      status: 'disconnected',
      error: 'Unable to read the WhatsApp connection status'
    }, { status: 500 });
  }
}
