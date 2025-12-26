import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { sanitizeInput } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    let { identifier } = await request.json();
    identifier = sanitizeInput(identifier || '').toLowerCase();
    
    if (!identifier) {
      return NextResponse.json(
        { error: 'Identifier is required' },
        { status: 400 }
      );
    }
    
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    }).select('_id email username');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check user' },
      { status: 500 }
    );
  }
}

