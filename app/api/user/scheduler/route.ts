import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/middleware';
import { startScheduler, stopScheduler, getSchedulerStatus } from '@/lib/whatsapp-manager';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

/**
 * User Scheduler Control Endpoint
 * 
 * Allows users to start/stop/check scheduler status
 * No admin permission required - users can control their own automation
 * 
 * POST /api/user/scheduler
 * Body: { action: 'start' | 'stop' | 'status' }
 */

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    let userId: string;
    try {
      userId = requireAuth(request);
    } catch (error: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required (start, stop, or status)' },
        { status: 400 }
      );
    }

    // Verify user WhatsApp automation is enabled
    const userDoc = await User.findById(userId).select('whatsappAutomation whatsappVerified');
    
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!userDoc.whatsappVerified) {
      return NextResponse.json(
        { error: 'WhatsApp not verified. Verify your number first.' },
        { status: 400 }
      );
    }

    const validActions = ['start', 'stop', 'status'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    let status;

    if (action === 'start') {
      console.log(`[User Scheduler] Starting scheduler for user ${userId}`);
      try {
        startScheduler();
        status = getSchedulerStatus();
        
        return NextResponse.json({
          success: true,
          message: 'Scheduler started successfully',
          status,
        }, { status: 200 });
      } catch (error: any) {
        console.error(`[User Scheduler] Error starting scheduler:`, error);
        return NextResponse.json(
          { error: 'Failed to start scheduler', details: error.message },
          { status: 500 }
        );
      }
    } else if (action === 'stop') {
      console.log(`[User Scheduler] Stopping scheduler for user ${userId}`);
      try {
        stopScheduler();
        status = getSchedulerStatus();
        
        return NextResponse.json({
          success: true,
          message: 'Scheduler stopped successfully',
          status,
        }, { status: 200 });
      } catch (error: any) {
        console.error(`[User Scheduler] Error stopping scheduler:`, error);
        return NextResponse.json(
          { error: 'Failed to stop scheduler', details: error.message },
          { status: 500 }
        );
      }
    } else if (action === 'status') {
      status = getSchedulerStatus();
      
      return NextResponse.json({
        success: true,
        message: 'Scheduler status retrieved',
        status,
      }, { status: 200 });
    }
  } catch (error: any) {
    console.error('[User Scheduler API] Error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    let userId: string;
    try {
      userId = requireAuth(request);
    } catch (error: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's WhatsApp status
    const userDoc = await User.findById(userId).select('whatsappVerified whatsappAutomation');
    
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!userDoc.whatsappVerified) {
      return NextResponse.json(
        {
          whatsappVerified: false,
          whatsappAutomation: false,
          status: { running: false, jobs: [] },
        },
        { status: 200 }
      );
    }

    const status = getSchedulerStatus();

    return NextResponse.json({
      whatsappVerified: userDoc.whatsappVerified,
      whatsappAutomation: userDoc.whatsappAutomation,
      status,
    }, { status: 200 });
  } catch (error: any) {
    console.error('[User Scheduler API] Error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
