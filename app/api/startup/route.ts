import { NextRequest, NextResponse } from 'next/server';
import { initializeScheduler } from '@/lib/scheduler-init';

export const runtime = 'nodejs';

/**
 * App Startup Endpoint
 * 
 * Called when the application starts (e.g., from health check or startup script)
 * Initializes the WhatsApp scheduler if not already running
 * 
 * This endpoint does NOT require authentication for startup purposes
 */

export async function GET(request: NextRequest) {
  try {
    // This endpoint can be called by:
    // 1. Netlify/Vercel health checks
    // 2. Docker/Kubernetes startup probes
    // 3. Manual initialization requests
    
    const result = await initializeScheduler();

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize scheduler',
        timestamp: new Date().toISOString(),
      }, {
        status: 500,
      });
    }

    return NextResponse.json({
      success: result.success,
      message: result.message || result.error,
      status: result.status,
      timestamp: new Date().toISOString(),
    }, {
      status: result.success ? 200 : 500,
    });
  } catch (error: any) {
    console.error('[App Startup] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize app startup',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reinitialize } = body;

    // Only allow re-initialization in development
    if (reinitialize && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({
        success: false,
        error: 'Re-initialization only allowed in development mode',
      }, {
        status: 400,
      });
    }

    const result = await initializeScheduler();

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize scheduler',
        timestamp: new Date().toISOString(),
      }, {
        status: 500,
      });
    }

    return NextResponse.json({
      success: result.success,
      message: result.message || result.error,
      status: result.status,
      timestamp: new Date().toISOString(),
    }, {
      status: result.success ? 200 : 500,
    });
  } catch (error: any) {
    console.error('[App Startup] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize app startup',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
    });
  }
}
