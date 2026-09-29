import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import { getPollResults, queueWAOperation } from '@/lib/whatsapp-manager';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const adminId = getAdminIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { pollId } = body;

    if (!pollId) {
      return NextResponse.json({ error: 'Poll ID required' }, { status: 400 });
    }

    // Delegate fully to manager's getPollResults (which calls only /poll/results python route,
    // does the request/response JSON handling + DB check/update for DailyLog/Habit streaks,
    // Keep explicit API result checks serialized with other browser-driver operations.
    const result = await queueWAOperation(() => getPollResults(pollId), 'admin-poll-results-fetch');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Poll Results API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
