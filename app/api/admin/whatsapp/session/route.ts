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
  disconnectWhatsApp
} from '@/lib/whatsapp-init';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const adminId = getAdminIdFromRequest(request);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    // GET is read-only. Session initialization happens only after an explicit POST action.
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === '1' || searchParams.get('force') === 'true';
    const status = await getWhatsAppStatus(adminId, force);
    
    // Reduce log spam: only log on status changes or infrequently (lower layer also throttles)
    if (status.status !== 'connected' || Math.random() < 0.1) {
      console.log('[WhatsApp Session] GET Status:', status.status, 'for adminId:', adminId);
    }
    
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('[WhatsApp Session] GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = getAdminIdFromRequest(request);
    if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const body = await request.json();
    const { action, sessionData, password } = body;

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

    // Setup App Lock
    if (action === 'setup_app_lock') {
      if (!password) {
        return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
      }
      const result = await whatsappClientManager.setupAppLock(adminId, password);
      return NextResponse.json(result);
    }

    // Lock App
    if (action === 'lock_app') {
      const result = await whatsappClientManager.lockApp(adminId);
      return NextResponse.json(result);
    }

    // Unlock App
    if (action === 'unlock_app') {
      const result = await whatsappClientManager.unlockApp(adminId);
      return NextResponse.json(result);
    }

    // Full logout (WA Web logout + session cleanup) - admin level
    if (action === 'logout') {
      const result = await whatsappClientManager.logout(adminId);
      return NextResponse.json(result);
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
