import { NextRequest, NextResponse } from 'next/server';
import { initializeWhatsAppScheduler } from '@/lib/whatsapp-scheduler';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '') || '';
  const envCronSecret = process.env.CRON_SECRET || '';

  if (!envCronSecret || cronSecret !== envCronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = initializeWhatsAppScheduler();

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Scheduler initialized',
      jobs: ['Daily Summary', 'Reminders'],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to initialize scheduler' },
      { status: 500 }
    );
  }
}
