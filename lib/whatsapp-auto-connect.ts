import WhatsAppSession from '@/lib/models/WhatsAppSession';
import whatsappClientManager from '@/lib/whatsapp-web';
import connectDB from '@/lib/mongodb';
import { startScheduler, stopScheduler, getSchedulerStatus } from './whatsapp-manager';

let isAutoConnecting = false;
let schedulerCheckInterval: NodeJS.Timeout | null = null;

export async function autoConnectWhatsApp(adminId: string) {
  if (isAutoConnecting) {
    console.log('[WhatsApp] Auto-connect already in progress');
    return;
  }

  isAutoConnecting = true;
  try {
    // First try to find by ADMIN_SESSION_ID directly (this is the session ID format)
    let session = await WhatsAppSession.findOne({ ADMIN_SESSION_ID: adminId });
    
    // If not found by ADMIN_SESSION_ID, try by adminId
    if (!session) {
      session = await WhatsAppSession.findOne({ adminId });
    }
    
    // If still not found, try by adminIdString
    if (!session) {
      session = await WhatsAppSession.findOne({ adminIdString: adminId });
    }
    
    // If still not found, try to find any saved session as fallback
    if (!session) {
      session = await WhatsAppSession.findOne({ 
        sessionData: { $exists: true, $ne: '' }
      }).sort({ lastConnectedAt: -1 });
    }
    
    if (session?.sessionData) {
      const sessionId = session.ADMIN_SESSION_ID || session.adminIdString || adminId;
      console.log('[WhatsApp] Auto-connect: Loading session from DB, sessionId:', sessionId);
      
      // Load session into the client manager
      await whatsappClientManager.loadSession(sessionId, session.sessionData);
      
      // Set up status callback
      whatsappClientManager.onStatusChange(sessionId, async (status, data) => {
        const statusData = data as { phoneNumber?: string } | undefined;
        console.log('[WhatsApp] Auto-connect status:', status);
        
        await WhatsAppSession.findOneAndUpdate(
          { ADMIN_SESSION_ID: sessionId },
          {
            status,
            phoneNumber: statusData?.phoneNumber,
            lastConnectedAt: status === 'connected' ? new Date() : undefined,
            updatedAt: new Date(),
          }
        );

        if (status === 'connected') {
          try {
            const sessionResult = await whatsappClientManager.saveSession(sessionId);
            if (sessionResult.success && sessionResult.sessionData) {
              await WhatsAppSession.findOneAndUpdate(
                { ADMIN_SESSION_ID: sessionId },
                { sessionData: sessionResult.sessionData, lastConnectedAt: new Date() }
              );
              console.log('[WhatsApp] Auto-connect: Session saved');
            }
          } catch (error) {
            console.error('[WhatsApp] Auto-connect: Save failed', error);
          }
        }
      });

      await whatsappClientManager.initializeClient(sessionId);
      console.log('[WhatsApp] Auto-connect: Client initialized');
    } else {
      console.log('[WhatsApp] Auto-connect: No saved session found, will initialize fresh');
    }
  } catch (error) {
    console.error('[WhatsApp] Auto-connect failed:', error);
  } finally {
    isAutoConnecting = false;
  }
}

/**
 * Ensure WhatsApp scheduler is always running
 * Only admin can stop/restart the scheduler
 */
export async function ensureSchedulerRunning() {
  try {
    console.log('[WhatsApp Scheduler] Checking scheduler status...');
    
    // Use direct function call instead of HTTP request
    const status = getSchedulerStatus();
    const isRunning = status.running || false;

    if (!isRunning) {
      console.log('[WhatsApp Scheduler] Starting scheduler (not running)...');
      
      // Direct call to start scheduler
      startScheduler();
      
      const updatedStatus = getSchedulerStatus();
      if (updatedStatus.running) {
        console.log('[WhatsApp Scheduler] Successfully started scheduler');
        return true;
      } else {
        console.error('[WhatsApp Scheduler] Failed to start scheduler');
        return false;
      }
    } else {
      console.log('[WhatsApp Scheduler] Scheduler is already running');
      return true;
    }
  } catch (error) {
    console.error('[WhatsApp Scheduler] Error ensuring scheduler is running:', error);
    // Try to start it anyway
    try {
      startScheduler();
      console.log('[WhatsApp Scheduler] Emergency scheduler start executed');
      return true;
    } catch (emergencyError) {
      console.error('[WhatsApp Scheduler] Emergency scheduler start failed:', emergencyError);
      return false;
    }
  }
}

/**
 * Start continuous scheduler monitoring
 * Ensures scheduler always runs, only admin can control it
 */
export function startSchedulerMonitoring() {
  if (schedulerCheckInterval) {
    clearInterval(schedulerCheckInterval);
  }

  console.log('[WhatsApp Scheduler] Starting continuous monitoring...');
  
  // Check every 30 seconds to ensure scheduler is running
  schedulerCheckInterval = setInterval(async () => {
    await ensureSchedulerRunning();
  }, 30000);
}

/**
 * Stop scheduler monitoring
 */
export function stopSchedulerMonitoring() {
  if (schedulerCheckInterval) {
    clearInterval(schedulerCheckInterval);
    schedulerCheckInterval = null;
    console.log('[WhatsApp Scheduler] Stopped continuous monitoring');
  }
}

/**
 * Initialize WhatsApp services on server startup
 */
export async function initializeWhatsAppServices() {
  console.log('[WhatsApp Services] Initializing WhatsApp services...');
  
  await connectDB();
  
  // Auto-connect all saved sessions
  await autoConnectAllSessions();
  
  // Wait a moment for connections to establish
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Ensure scheduler is running
  await ensureSchedulerRunning();
  
  // Start continuous monitoring
  startSchedulerMonitoring();
  
  console.log('[WhatsApp Services] WhatsApp services initialization completed');
}

/**
 * Auto-connect all WhatsApp sessions
 */
async function autoConnectAllSessions() {
  try {
    console.log('[WhatsApp Auto-Connect] Starting auto-connect process...');

    // Find all sessions with session data
    const sessions = await WhatsAppSession.find({ 
      sessionData: { $exists: true, $ne: '' }
    }).sort({ lastConnectedAt: -1 });

    if (sessions.length === 0) {
      console.log('[WhatsApp Auto-Connect] No saved sessions found');
      return;
    }

    console.log(`[WhatsApp Auto-Connect] Found ${sessions.length} saved sessions`);

    // Try to connect each session
    for (const session of sessions) {
      const sessionId = session.ADMIN_SESSION_ID || session.adminIdString || session.adminId?.toString();
      
      if (!sessionId) {
        console.warn('[WhatsApp Auto-Connect] Session missing ID, skipping');
        continue;
      }

      try {
        console.log(`[WhatsApp Auto-Connect] Attempting to connect session: ${sessionId}`);
        
        // Initialize the session with saved data
        await whatsappClientManager.loadSession(sessionId, session.sessionData);
        
        // Wait a moment for initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check connection status
        const status = await whatsappClientManager.getStatus(sessionId);
        
        if (status.status === 'connected') {
          console.log(`[WhatsApp Auto-Connect] Successfully connected session: ${sessionId}`);
          
          // Update session status
          await WhatsAppSession.findByIdAndUpdate(session._id, {
            status: 'connected',
            lastConnectedAt: new Date()
          });
        } else {
          console.warn(`[WhatsApp Auto-Connect] Failed to connect session: ${sessionId}, status: ${status.status}`);
        }
      } catch (error) {
        console.error(`[WhatsApp Auto-Connect] Error connecting session ${sessionId}:`, error);
      }
    }

    console.log('[WhatsApp Auto-Connect] Auto-connect process completed');
  } catch (error) {
    console.error('[WhatsApp Auto-Connect] Critical error during auto-connect:', error);
  }
}

export function isWhatsAppAutoConnecting() {
  return isAutoConnecting;
}
