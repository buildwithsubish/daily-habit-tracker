// WhatsApp Services Initialization Script
// This script ensures WhatsApp auto-connect and scheduler are running on server startup

import { initializeWhatsAppServices } from '../lib/whatsapp-auto-connect';

// Initialize WhatsApp services when this module is imported
console.log('[WhatsApp Services] Starting WhatsApp services initialization...');

// Wait for server to be fully ready before initializing
setTimeout(async () => {
  try {
    await initializeWhatsAppServices();
    console.log('[WhatsApp Services] All services initialized successfully');
  } catch (error) {
    console.error('[WhatsApp Services] Failed to initialize services:', error);
  }
}, 5000); // Wait 5 seconds for server to start

export {}; // Make this a module
