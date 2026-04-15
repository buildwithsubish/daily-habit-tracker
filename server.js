const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Force start WhatsApp scheduler (mandatory - runs continuously)
  const startSchedulerOnServer = async () => {
    try {
      console.log('[Server] Force-starting WhatsApp scheduler...');
      const { startScheduler, getSchedulerStatus } = require('./lib/whatsapp-manager');
      startScheduler(); // Start scheduler immediately
      const status = getSchedulerStatus();
      console.log('[Server] WhatsApp scheduler started successfully');
      console.log('[Server] Scheduler running:', status.running);
      console.log('[Server] Active jobs:', status.jobs.length, status.jobs);
      return true;
    } catch (error) {
      console.error('[Server] Failed to start WhatsApp scheduler:', error);
      return false;
    }
  };
  
  // Start scheduler with retries
  let schedulerStartAttempts = 0;
  const scheduleRetry = async () => {
    const success = await startSchedulerOnServer();
    if (!success && schedulerStartAttempts < 3) {
      schedulerStartAttempts++;
      console.log(`[Server] Retrying scheduler start (attempt ${schedulerStartAttempts}/3)...`);
      setTimeout(scheduleRetry, 2000);
    }
  };
  
  setTimeout(scheduleRetry, 2000);

  if (process.env.CRON_SECRET) {
    try {
      const { initializeWhatsAppScheduler } = require('./lib/whatsapp-scheduler.js');
      initializeWhatsAppScheduler();
    } catch (error) {
      console.error('Failed to load WhatsApp Scheduler:', error);
    }
  }

  try {
    const { initializeAllReminders } = require('./lib/reminder-scheduler.js');
    initializeAllReminders().catch(console.error);
  } catch (error) {
    console.error('Failed to initialize reminder scheduler:', error);
  }

  // Initialize WhatsApp services
  setTimeout(async () => {
    try {
      console.log('[Server] Initializing WhatsApp services...');
      const { initializeWhatsAppServices } = require('./lib/whatsapp-auto-connect.js');
      await initializeWhatsAppServices();
    } catch (error) {
      console.error('[Server] Failed to initialize WhatsApp services:', error);
    }
  }, 3000);
});