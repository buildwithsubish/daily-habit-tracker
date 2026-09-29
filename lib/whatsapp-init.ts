import WhatsAppSession from '@/lib/models/WhatsAppSession';
import whatsappClientManager from '@/lib/whatsapp-web';
import { Types } from 'mongoose';

// Track initialization state per session instead of globally
const initializationState: Map<string, { isInitialized: boolean; initializationPromise: Promise<void> | null }> = new Map();

export type WhatsAppConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'failed' 
  | 'reconnecting';

export interface WhatsAppStatus {
  status: WhatsAppConnectionStatus;
  phoneNumber?: string;
  qrCode?: string;
  lastConnectedAt?: Date;
  failureReason?: string;
  hasSavedSession?: boolean;
  sessionExists?: boolean;
  appLocked?: boolean;
}

// Event handlers for real-time status updates
type StatusChangeHandler = (status: WhatsAppStatus) => void;
const statusChangeHandlers: Set<StatusChangeHandler> = new Set();

export function onWhatsAppStatusChange(handler: StatusChangeHandler) {
  statusChangeHandlers.add(handler);
  return () => {
    statusChangeHandlers.delete(handler);
  };
}

function notifyStatusChange(status: WhatsAppStatus) {
  statusChangeHandlers.forEach(handler => {
    try {
      handler(status);
    } catch (error) {
      console.error('[WhatsApp] Status change handler error:', error);
    }
  });
}

// Helper to find session by adminId (supports both ObjectId and string)
async function findWhatsAppSession(adminId: string) {
  if (Types.ObjectId.isValid(adminId)) {
    const session = await WhatsAppSession.findOne({ adminId: new Types.ObjectId(adminId) });
    if (session) return session;
  }
  return WhatsAppSession.findOne({ adminIdString: adminId });
}

// Helper to update session
async function updateWhatsAppSession(adminId: string, update: any) {
  if (Types.ObjectId.isValid(adminId)) {
    const result = await WhatsAppSession.findOneAndUpdate(
      { adminId: new Types.ObjectId(adminId) },
      update,
      { upsert: true, new: true }
    );
    if (result) return result;
  }
  return WhatsAppSession.findOneAndUpdate(
    { adminIdString: adminId },
    update,
    { upsert: true, new: true }
  );
}

// Setup status change listener
function setupStatusListener(adminId: string) {
  // Check if listener already exists for this adminId
  const existingCallbacks = whatsappClientManager.getStatusCallbacks(adminId);
  if (existingCallbacks) {
    console.log('[WhatsApp] Status listener already exists for:', adminId);
    return;
  }
  
  whatsappClientManager.onStatusChange(adminId, async (status, data) => {
    const statusData = data as { phoneNumber?: string; qrCode?: string; qrRequired?: boolean; error?: string } | undefined;
    
    console.log('[WhatsApp] Status changed:', status);
    
    const whatsappStatus: WhatsAppStatus = {
      status: status as WhatsAppConnectionStatus,
      phoneNumber: statusData?.phoneNumber,
      qrCode: statusData?.qrCode,
      failureReason: statusData?.error,
    };

    // Update database
    try {
      await updateWhatsAppSession(adminId, {
        status,
        phoneNumber: statusData?.phoneNumber,
        qrCode: statusData?.qrCode,
        lastConnectedAt: status === 'connected' ? new Date() : undefined,
        updatedAt: new Date(),
      });


      // Save session when connected
      if (status === 'connected') {
        try {
          const sessionResult = await whatsappClientManager.saveSession(adminId);
          if (sessionResult.success && sessionResult.sessionData) {
            await updateWhatsAppSession(adminId, {
              sessionData: sessionResult.sessionData,
              lastConnectedAt: new Date(),
            });
            console.log('[WhatsApp] Session saved after connection');
          }
        } catch (error) {
          console.error('[WhatsApp] Auto-save session error:', error);
        }
      }
    } catch (dbError) {
      console.error('[WhatsApp] Database update error:', dbError);
    }

    // Notify all handlers
    notifyStatusChange(whatsappStatus);
  });
}

// Get or create initialization state for a specific adminId
function getInitState(adminId: string) {
  let state = initializationState.get(adminId);
  if (!state) {
    state = { isInitialized: false, initializationPromise: null };
    initializationState.set(adminId, state);
  }
  return state;
}

// Main initialization function
export async function initializeWhatsApp(adminId: string): Promise<WhatsAppStatus> {
  const state = getInitState(adminId);
  
  // Prevent multiple simultaneous initializations for the same adminId
  if (state.initializationPromise) {
    return state.initializationPromise.then(() => getWhatsAppStatus(adminId, true));
  }

  // CRITICAL FIX: First check if client is already connected before attempting initialization
  // This prevents unnecessary reconnection attempts. Use force to get fresh (but throttle will still protect)
  try {
    const currentStatus = await whatsappClientManager.getStatus(adminId, true);
    if (currentStatus.status === 'connected') {
      console.log('[WhatsApp] Client already connected, skipping initialization for:', adminId);
      state.isInitialized = true;
      return {
        status: 'connected',
        phoneNumber: currentStatus.phoneNumber,
      };
    }
  } catch (error) {
    console.log('[WhatsApp] Could not check current status:', error);
  }

  if (state.isInitialized) {
    return getWhatsAppStatus(adminId);
  }

  state.initializationPromise = (async () => {
    console.log('[WhatsApp] Starting initialization for adminId:', adminId);
    
    try {
      // Setup status listener first
      setupStatusListener(adminId);

      // Check for existing session in database
      const session = await findWhatsAppSession(adminId);
      
      console.log('[WhatsApp] Found session in DB:', !!session, 'Status:', session?.status, 'Has sessionData:', !!session?.sessionData);

      // If there's existing session data, set it in the DB store on Python server first
      if (session?.sessionData) {
        console.log('[WhatsApp] Setting existing session cookies...');
        try {
          await whatsappClientManager.setDbSession(adminId, session.sessionData);
          console.log('[WhatsApp] Session cookies set successfully');
        } catch (loadError) {
          console.error('[WhatsApp] Failed to set session cookies:', loadError);
        }
      }

      // Initialize the client (this will connect or show QR)
      console.log('[WhatsApp] Initializing WhatsApp client...');
      await whatsappClientManager.initializeClient(adminId);
      
      // Wait a bit for initial connection attempt
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Return the status produced by this explicitly requested initialization.
      const clientStatus = await whatsappClientManager.getStatus(adminId, true);
      console.log('[WhatsApp] Initialization complete - status:', clientStatus.status);
      
      state.isInitialized = true;
      console.log('[WhatsApp] Initialization complete for:', adminId);
      
    } catch (error) {
      console.error('[WhatsApp] Initialization error:', error);
      state.isInitialized = false;
      throw error;
    } finally {
      state.initializationPromise = null;
    }
  })();

  return state.initializationPromise.then(() => getWhatsAppStatus(adminId, true));
}

// Get current status (force=true bypasses the 30s global throttle for fresh check on critical paths; used for real-time after manual admin actions)
export async function getWhatsAppStatus(adminId: string, force: boolean = false): Promise<WhatsAppStatus> {
  try {
    // Get status from WhatsApp client (respect global 30s throttle unless force)
    const clientStatus = await whatsappClientManager.getStatus(adminId, force);
    
    // Throttled log to reduce spam (status changes or rare)
    // The real sync log is now in the web layer with its own 60s guard
    if (force || clientStatus.status !== 'connected') {
      console.log('[WhatsApp] Client status:', clientStatus.status);
    }

    // If client has valid status, return it
    if (clientStatus.status && clientStatus.status !== 'disconnected') {
      return {
        status: clientStatus.status as WhatsAppConnectionStatus,
        phoneNumber: clientStatus.phoneNumber,
        qrCode: clientStatus.qrCode,
        appLocked: clientStatus.appLocked,
      };
    }

    // Check database for saved session
    const session = await findWhatsAppSession(adminId);
    
    if (session?.sessionData && session.status === 'connected') {
      return {
        status: 'disconnected',
        hasSavedSession: true,
        phoneNumber: session.phoneNumber,
        lastConnectedAt: session.lastConnectedAt,
        sessionExists: true,
      };
    }

    if (session?.sessionData) {
      return {
        status: 'disconnected',
        hasSavedSession: true,
        phoneNumber: session.phoneNumber,
        sessionExists: true,
      };
    }

    return {
      status: 'disconnected',
      sessionExists: false,
    };
  } catch (error) {
    console.error('[WhatsApp] Get status error:', error);
    
    // Try to get session from database even on error
    try {
      const session = await findWhatsAppSession(adminId);
      if (session?.sessionData) {
        return {
          status: 'disconnected',
          hasSavedSession: true,
          phoneNumber: session.phoneNumber,
          sessionExists: true,
        };
      }
    } catch (dbError) {
      // Ignore database errors
    }
    
    return {
      status: 'disconnected',
      failureReason: error instanceof Error ? error.message : 'Failed to get status',
    };
  }
}

// Force reconnection (reuses existing Python browser when already connected)
export async function reconnectWhatsApp(adminId: string): Promise<WhatsAppStatus> {
  console.log('[WhatsApp] Reconnecting for:', adminId);

  try {
    const current = await whatsappClientManager.getStatus(adminId, true);
    if (current.status === 'connected') {
      console.log('[WhatsApp] Already connected on Python server, skipping re-init for:', adminId);
      const state = getInitState(adminId);
      state.isInitialized = true;
      return {
        status: 'connected',
        phoneNumber: current.phoneNumber,
      };
    }
  } catch {
    // proceed with full init
  }

  const state = getInitState(adminId);
  state.isInitialized = false;
  return initializeWhatsApp(adminId);
}

// Disconnect
export async function disconnectWhatsApp(adminId: string): Promise<void> {
  console.log('[WhatsApp] Disconnecting for:', adminId);
  await whatsappClientManager.disconnect(adminId);
  
  try {
    await updateWhatsAppSession(adminId, {
      status: 'disconnected',
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('[WhatsApp] Disconnect update error:', error);
  }
  
  // Clear initialization state for this adminId
  const state = initializationState.get(adminId);
  if (state) {
    state.isInitialized = false;
  }
  
  notifyStatusChange({ status: 'disconnected' });
}

// Check if initialized for a specific adminId
export function isWhatsAppInitialized(adminId?: string): boolean {
  if (!adminId) {
    // Check if any session is initialized
    for (const state of initializationState.values()) {
      if (state.isInitialized) return true;
    }
    return false;
  }
  const state = initializationState.get(adminId);
  return state?.isInitialized ?? false;
}
