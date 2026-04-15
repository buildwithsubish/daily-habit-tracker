import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import { createPollForUser, getPollResults, sendPollConfirmation, processAllUserPolls, checkAndCompletePolls } from '@/lib/whatsapp-poll';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const adminId = getAdminIdFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, userId, pollId, adminId: bodyAdminId = adminId } = body;

    if (action === 'create_for_user' && userId) {
      const result = await createPollForUser(userId, bodyAdminId);
      return NextResponse.json(result);
    }

    if (action === 'get_results' && pollId) {
      const result = await getPollResults(pollId, bodyAdminId, true);
      return NextResponse.json(result);
    }

    if (action === 'send_confirmation' && userId && pollId) {
      const result = await sendPollConfirmation(userId, pollId, bodyAdminId);
      return NextResponse.json(result);
    }

    if (action === 'process_all') {
      const result = await processAllUserPolls(bodyAdminId);
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    if (action === 'check_pending') {
      const result = await checkAndCompletePolls(bodyAdminId);
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[Poll Automation API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
