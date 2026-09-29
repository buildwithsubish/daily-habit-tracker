import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import WhatsAppPoll from '@/lib/models/WhatsAppPoll';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import { createPollForUser } from '@/lib/whatsapp-manager';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const adminId = getAdminIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const result = await createPollForUser(userId, undefined, adminId);
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch (error: any) {
    console.error('[Create Poll] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    if (!getAdminIdFromRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    const query: any = {};
    
    if (userId) {
      if (!mongoose.isValidObjectId(userId)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
      }
      query.userId = new mongoose.Types.ObjectId(userId);
    }
    if (date) {
      query.date = date;
    }
    if (status) {
      query.status = status;
    }

    const polls = await WhatsAppPoll.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ polls });
  } catch (error: any) {
    console.error('[Get Polls] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
