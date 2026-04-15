import { NextRequest, NextResponse } from 'next/server';
import WhatsAppSession from '@/lib/models/WhatsAppSession';
import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';
import { getAdminIdFromRequest } from '@/lib/admin-middleware';
import whatsappClientManager from '@/lib/whatsapp-web';
import { 
  initializeWhatsApp, 
  getWhatsAppStatus, 
  reconnectWhatsApp, 
  disconnectWhatsApp,
  isWhatsAppInitialized
} from '@/lib/whatsapp-init';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    let adminId = getAdminIdFromRequest(request);
    
    // If no admin token, try to get the session from MongoDB
    // Query for any existing WhatsApp session in the database
    if (!adminId) {
      console.log('[WhatsApp Session] No admin token, checking MongoDB for existing session...');
      
      // Find the most recent session with session data
      const existingSession = await WhatsAppSession.findOne({
        $or: [
          { sessionData: { $exists: true, $nin: [null, ''] } },
          { status: 'connected' }
        ]
      }).sort({ updatedAt: -1, createdAt: -1 });
      
      if (existingSession) {
        // Use the session's stored ID
        adminId = existingSession.ADMIN_SESSION_ID || existingSession.adminIdString || existingSession.adminId?.toString() || null;
        console.log('[WhatsApp Session] Found existing session in DB:', adminId);
      } else {
        console.log('[WhatsApp Session] No existing session found in DB');
      }
    }

    // If still no adminId, return not authenticated
    if (!adminId) {
      return NextResponse.json({
        status: 'disconnected',
        message: 'No WhatsApp session found. Please login as admin to connect WhatsApp.',
        sessionExists: false,
      });
    }

    // Check if already initialized for this specific adminId, if not initialize
    if (!isWhatsAppInitialized(adminId)) {
      console.log('[WhatsApp Session] Initializing WhatsApp for:', adminId);
      await initializeWhatsApp(adminId);
    }

    // Get current status
    const status = await getWhatsAppStatus(adminId);
    
    console.log('[WhatsApp Session] GET Status:', status.status, 'for adminId:', adminId);
    
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('[WhatsApp Session] GET Error:', error);
    
    // Try to get session from DB even if there's an error
    try {
      // Find the most recent session with session data
      const session = await WhatsAppSession.findOne({
        $or: [
          { sessionData: { $exists: true, $nin: [null, ''] } },
          { status: 'connected' }
        ]
      }).sort({ updatedAt: -1, createdAt: -1 });
      
      if (session) {
        const adminId = session.ADMIN_SESSION_ID || session.adminIdString || session.adminId?.toString();
        return NextResponse.json({
          status: 'disconnected',
          hasSavedSession: true,
          phoneNumber: session.phoneNumber,
          lastConnectedAt: session.lastConnectedAt,
          message: 'Saved session exists. Click "Connect WhatsApp" to reconnect.',
        });
      }
    } catch (dbError) {
      // Ignore DB error
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    let adminId = getAdminIdFromRequest(request);
    
    // If no admin token, try to get the session from MongoDB
    if (!adminId) {
      console.log('[WhatsApp Session] POST: No admin token, checking MongoDB for existing session...');
      
      // Find the most recent session with session data
      const existingSession = await WhatsAppSession.findOne({
        $or: [
          { sessionData: { $exists: true, $nin: [null, ''] } },
          { status: 'connected' }
        ]
      }).sort({ updatedAt: -1, createdAt: -1 });
      
      if (existingSession) {
        adminId = existingSession.ADMIN_SESSION_ID || existingSession.adminIdString || existingSession.adminId?.toString() || null;
        console.log('[WhatsApp Session] POST: Found existing session in DB:', adminId);
      }
    }

    // If still no adminId, return not authenticated
    if (!adminId) {
      return NextResponse.json(
        { error: 'No WhatsApp session found. Please login as admin to connect WhatsApp.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, sessionData } = body;

    // Connect or reconnect
    if (action === 'connect' || action === 'auto_connect') {
      console.log('[WhatsApp Session] Connect action for:', adminId);
      
      const status = await reconnectWhatsApp(adminId);
      
      return NextResponse.json({
        success: true,
        status: status.status,
        phoneNumber: status.phoneNumber,
        qrCode: status.qrCode,
        message: status.status === 'connected' ? 'Connected successfully' : 'Connecting...'
      });
    }

    // Disconnect
    if (action === 'disconnect') {
      console.log('[WhatsApp Session] Disconnect action for:', adminId);
      
      await disconnectWhatsApp(adminId);
      
      return NextResponse.json({
        success: true,
        message: 'WhatsApp disconnected'
      });
    }

    // Initialize (for manual QR scan)
    if (action === 'init') {
      console.log('[WhatsApp Session] Init action for:', adminId);
      
      const status = await initializeWhatsApp(adminId);
      
      return NextResponse.json({
        success: true,
        status: status.status,
        phoneNumber: status.phoneNumber,
        qrCode: status.qrCode,
        message: status.status === 'connected' ? 'Connected successfully' : 'Initialization started'
      });
    }

    // Regenerate QR
    if (action === 'regenerate_qr') {
      await whatsappClientManager.regenerateQR(adminId);
      
      await AuditLog.create({
        adminId,
        action: 'qr_regenerated',
        category: 'whatsapp_session',
        details: 'QR code regenerated',
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'QR code regenerated',
      });
    }

    // Save session
    if (action === 'save_session') {
      const sessionDataResult = await whatsappClientManager.saveSession(adminId);
      
      if (sessionDataResult.success && sessionDataResult.sessionData) {
        await WhatsAppSession.findOneAndUpdate(
          { ADMIN_SESSION_ID: adminId },
          {
            sessionData: sessionDataResult.sessionData,
            lastConnectedAt: new Date(),
            status: 'connected',
            updatedAt: new Date()
          },
          { upsert: true }
        );
        
        return NextResponse.json({
          success: true,
          sessionData: sessionDataResult.sessionData,
          cookieCount: sessionDataResult.cookieCount
        });
      }
      
      return NextResponse.json({
        success: false,
        error: sessionDataResult.error
      });
    }

    // Load session
    if (action === 'load_session' && sessionData) {
      await whatsappClientManager.loadSession(adminId, sessionData);
      
      await WhatsAppSession.findOneAndUpdate(
        { ADMIN_SESSION_ID: adminId },
        { sessionData, updatedAt: new Date() },
        { upsert: true }
      );
      
      return NextResponse.json({
        success: true,
        message: 'Session loaded successfully'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[WhatsApp Session] POST Error:', error);

    await AuditLog.create({
      action: 'whatsapp_session_error',
      category: 'whatsapp_session',
      details: 'Error managing WhatsApp session',
      errorMessage: error.message,
      success: false,
    });

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
