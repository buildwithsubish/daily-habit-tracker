import { NextRequest, NextResponse } from 'next/server';

interface PhoneLoginRequest {
  phone_number: string;
  country?: string;
  session_timeout?: number;
  session_id?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: PhoneLoginRequest = await request.json();
    const { phone_number, country = 'India', session_timeout = 120, session_id = 'default' } = body;

    if (!phone_number) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const pythonServerUrl = process.env.WHATSAPP_PYTHON_SERVER_URL || 'http://127.0.0.1:8765';
    
    const response = await fetch(`${pythonServerUrl}/session/phone-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id,
        phone_number,
        country,
        session_timeout
      }),
    });

    const data = await response.json();

    // Pass through the response with the same status code
    if (response.ok || response.status === 408 || response.status === 400) {
      // 200: Connected or login code generated
      // 408: Timeout waiting for login screen
      // 400: Bad request or login failed
      return NextResponse.json({
        success: response.ok,
        ...data
      }, { status: response.status });
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
  const sessionId = request.nextUrl.searchParams.get('session_id') || 'default';
  
  try {
    const pythonServerUrl = process.env.WHATSAPP_PYTHON_SERVER_URL || 'http://127.0.0.1:8765';
    
    const response = await fetch(`${pythonServerUrl}/session/status?session_id=${sessionId}`, {
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
      error: error instanceof Error ? error.message : 'Failed to connect to WhatsApp server'
    }, { status: 500 });
  }
}
