import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/middleware';
import { createPollForUser } from '@/lib/whatsapp-manager';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    let userId: string;
    try {
      userId = requireAuth(request);
    } catch (error: any) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user exists and has WhatsApp verified
    const userDoc = await User.findById(userId).select('whatsappNumber whatsappVerified whatsappAutomation');
    
    if (!userDoc) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    if (!userDoc.whatsappNumber) {
      return NextResponse.json({ 
        error: 'WhatsApp number not set. Please add your WhatsApp number first.' 
      }, { status: 400 });
    }

    if (!userDoc.whatsappVerified) {
      return NextResponse.json({ 
        error: 'WhatsApp number not verified. Please verify your WhatsApp number in settings.' 
      }, { status: 400 });
    }

    if (!userDoc.whatsappAutomation) {
      return NextResponse.json({ 
        error: 'WhatsApp automation is disabled. Please enable it in your settings.' 
      }, { status: 400 });
    }

    // Create poll for the user
    const result = await createPollForUser(userId);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Daily poll created and sent to your WhatsApp!',
        pollId: result.pollId 
      }, { status: 200 });
    } else {
      // Provide specific error messages for common failure cases
      let statusCode = 400;
      if (result.error?.includes('already sent') || result.error?.includes('existing')) {
        statusCode = 409; // Conflict - poll already exists
      } else if (result.error?.includes('not found') || result.error?.includes('No habits')) {
        statusCode = 400;
      }
      
      return NextResponse.json({ 
        error: result.error || 'Failed to create poll',
        code: result.error?.toLowerCase().replace(/\s+/g, '_') || 'poll_creation_failed'
      }, { status: statusCode });
    }
  } catch (error: any) {
    console.error('[User Poll API] Error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Generic error handling
    return NextResponse.json({ 
      error: 'Internal server error', 
      code: 'internal_error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
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
    const userDoc = await User.findById(userId).select('whatsappNumber whatsappVerified whatsappAutomation pollSchedule');
    
    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      whatsappVerified: userDoc.whatsappVerified || false,
      whatsappAutomation: userDoc.whatsappAutomation || false,
      hasWhatsAppNumber: !!(userDoc.whatsappNumber),
      pollSchedule: userDoc.pollSchedule || { 
        enabled: true, 
        time: '20:00', 
        frequency: 'daily',
        customDays: [],
        reminderEnabled: true,
        reminderIntervals: [5, 10, 20, 30]
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('[User Poll API] Error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

