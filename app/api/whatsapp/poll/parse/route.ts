import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth } from '@/lib/middleware';
import { parseAndUpdatePollResults } from '@/lib/whatsapp-manager';
import User from '@/lib/models/User';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get current user ID from auth
    const userId = requireAuth(request);

    // Parse request body
    const body = await request.json();
    const { contactName, pollQuestion } = body;

    if (!contactName) {
      return NextResponse.json({ 
        error: 'Contact name is required' 
      }, { status: 400 });
    }

    // Check if user has WhatsApp verified
    const userDoc = await User.findById(userId).select('whatsappNumber whatsappVerified whatsappAutomation');
    
    if (!userDoc || !userDoc.whatsappNumber || !userDoc.whatsappVerified) {
      return NextResponse.json({ 
        error: 'WhatsApp not verified. Please verify your WhatsApp number first.' 
      }, { status: 400 });
    }

    if (!userDoc.whatsappAutomation) {
      return NextResponse.json({ 
        error: 'WhatsApp automation is not enabled. Please enable it in settings.' 
      }, { status: 400 });
    }

    // Parse poll results and update database
    const result = await parseAndUpdatePollResults(userId, contactName, pollQuestion);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Poll results parsed and database updated successfully!',
        results: result.results 
      });
    } else {
      return NextResponse.json({ 
        error: result.error || 'Failed to parse poll results' 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[Parse Poll Results API] Error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get current user ID from auth
    const userId = requireAuth(request);

    // Get user's WhatsApp status and recent poll data
    const userDoc = await User.findById(userId).select(
      'whatsappNumber whatsappVerified whatsappAutomation whatsappContactName'
    );
    
    return NextResponse.json({
      whatsappVerified: userDoc?.whatsappVerified || false,
      whatsappAutomation: userDoc?.whatsappAutomation || false,
      hasWhatsAppNumber: !!(userDoc?.whatsappNumber),
      contactName: userDoc?.whatsappContactName || userDoc?.whatsappNumber || null,
      message: 'Use POST to parse and update poll results. Provide contactName in body.'
    });
  } catch (error: any) {
    console.error('[Parse Poll Results API] Error:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

