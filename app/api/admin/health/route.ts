import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getSchedulerStatus } from '@/lib/whatsapp-manager';
import { getWhatsAppStatus } from '@/lib/whatsapp-init';
import WhatsAppSession from '@/lib/models/WhatsAppSession';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get scheduler status
    const schedulerStatus = getSchedulerStatus();
    
    // Get WhatsApp status
    const adminId = process.env.ADMIN_ID || 'admin';
    const whatsappStatus = await getWhatsAppStatus(adminId);
    
    // Get database stats
    const totalUsers = await User.countDocuments();
    const whatsappVerifiedUsers = await User.countDocuments({ whatsappVerified: true });
    const whatsappAutomationUsers = await User.countDocuments({ whatsappAutomation: true });
    const activeSessions = await WhatsAppSession.countDocuments({ status: 'connected' });
    
    // Get system health metrics
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memoryUsage.external / 1024 / 1024), // MB
      },
      scheduler: {
        ...schedulerStatus,
        health: schedulerStatus.running ? 'healthy' : 'stopped'
      },
      whatsapp: {
        ...whatsappStatus,
        health: whatsappStatus.status === 'connected' ? 'healthy' : 
                whatsappStatus.status === 'connecting' ? 'connecting' : 'unhealthy'
      },
      database: {
        totalUsers,
        whatsappVerifiedUsers,
        whatsappAutomationUsers,
        activeSessions,
        health: 'connected'
      },
      services: {
        scheduler: schedulerStatus.running,
        whatsapp: whatsappStatus.status !== 'disconnected',
        database: true
      }
    };

    // Determine overall health
    const allServicesHealthy = healthData.services.scheduler && 
                              healthData.services.whatsapp && 
                              healthData.services.database;
    
    if (!allServicesHealthy) {
      healthData.status = 'degraded';
    }

    return NextResponse.json(healthData);
  } catch (error: any) {
    console.error('[Health Check] Error:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message 
      },
      { status: 500 }
    );
  }
}
