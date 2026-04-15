/**
 * WhatsApp Scheduler Initialization
 * 
 * This file handles automatic scheduler startup when the app starts
 * It ensures the scheduler runs in the background without requiring admin intervention
 * 
 * This is called from next.config.js or middleware
 */

import { startScheduler, getSchedulerStatus } from './whatsapp-manager';

let isSchedulerInitialized = false;

export async function initializeScheduler(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  status?: any;
}> {
  // Prevent multiple initialization attempts
  if (isSchedulerInitialized) {
    console.log('[Scheduler Init] Already initialized');
    const status = getSchedulerStatus();
    return {
      success: true,
      message: 'Scheduler already initialized',
      status,
    };
  }

  try {
    console.log('[Scheduler Init] Starting WhatsApp scheduler...');
    
    // Start the scheduler
    startScheduler();
    
    // Get current status to verify
    const status = getSchedulerStatus();
    
    isSchedulerInitialized = true;
    
    console.log('[Scheduler Init] ✅ Scheduler initialized successfully');
    console.log('[Scheduler Init] Status:', status);
    
    return {
      success: true,
      message: 'Scheduler initialized',
      status,
    };
  } catch (error: any) {
    console.error('[Scheduler Init] ❌ Failed to initialize scheduler:', error);
    return {
      success: false,
      error: error.message || 'Unknown error during initialization',
    };
  }
}

export function isSchedulerInitialized_() {
  return isSchedulerInitialized;
}

export function resetSchedulerInitFlag() {
  isSchedulerInitialized = false;
}
