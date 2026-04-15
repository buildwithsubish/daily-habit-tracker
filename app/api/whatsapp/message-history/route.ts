import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import MessageLog from '@/lib/models/MessageLog';
import { requireAuth } from '@/lib/middleware';
import mongoose from 'mongoose';

/**
 * GET - Fetch message history with status filtering and summary
 * Query params:
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 20)
 *   - type: filter by message type
 *   - status: filter by status (sent, failed, scheduled, etc.)
 *   - days: number of days back (default: 30)
 */
export async function GET(request: NextRequest) {
    try {
        await connectDB();
        const userId = requireAuth(request);

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        const days = parseInt(searchParams.get('days') || '30');
        const skip = (page - 1) * limit;

        // Calculate date range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];

        const filter: any = {
            userId: new mongoose.Types.ObjectId(userId),
            date: { $gte: startDateStr }
        };
        if (type) filter.type = type;
        if (status) filter.status = status;

        const [messages, total, summary] = await Promise.all([
            MessageLog.find(filter)
                .sort({ sentAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            MessageLog.countDocuments(filter),
            MessageLog.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId),
                        date: { $gte: startDateStr }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        const statusSummary = summary.reduce((acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        return NextResponse.json({
            messages: messages.map((m: any) => ({
                id: m._id.toString(),
                type: m.type,
                status: m.status,
                content: m.content,
                sentAt: m.sentAt,
                scheduledFor: m.scheduledFor,
                respondedAt: m.respondedAt,
                reminderCount: m.reminderCount,
                retryCount: m.retryCount,
                error: m.error,
                escalatedToAdmin: m.escalatedToAdmin,
                messageId: m.messageId,
                date: m.date,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            statusSummary,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch message history' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

/**
 * DELETE - Clear old message logs
 * Body: { daysOld?: number (default: 90) }
 */
export async function DELETE(request: NextRequest) {
    try {
        await connectDB();
        const userId = requireAuth(request);
        const { daysOld = 90 } = await request.json();

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

        const result = await MessageLog.deleteMany({
            userId: new mongoose.Types.ObjectId(userId),
            date: { $lt: cutoffDateStr }
        });

        return NextResponse.json({
            success: true,
            deletedCount: result.deletedCount,
            message: `Deleted ${result.deletedCount} messages older than ${daysOld} days`
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to clear message history' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
