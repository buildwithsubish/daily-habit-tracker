'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

interface WhatsAppStatus {
  status: 'connected' | 'disconnected' | 'connecting' | 'failed';
  phoneNumber?: string;
  qrCode?: string;
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  failureReason?: string;
  hasSavedSession?: boolean;
  message?: string;
}

interface SchedulerStatus {
  running: boolean;
  jobs: string[];
  nextRun?: { [key: string]: string } | string;
}

interface WhatsAppContextType {
  status: WhatsAppStatus;
  schedulerStatus: SchedulerStatus;
  loading: boolean;
  refreshStatus: () => Promise<void>;
  refreshSchedulerStatus: () => Promise<void>;
  lastUpdate: number;
}

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

export function WhatsAppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WhatsAppStatus>({ status: 'disconnected' });
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus>({ running: false, jobs: [] });
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isVisible, setIsVisible] = useState(true);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Debounced status fetch to prevent rapid calls
  const refreshStatus = useCallback(async (force = false) => {
    if (!force && loading) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp/session');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setLastUpdate(Date.now());
      }
    } catch (error) {
      console.error('[WhatsApp Context] Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const refreshSchedulerStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_status' }),
      });
      if (res.ok) {
        const data = await res.json();
        setSchedulerStatus(data.status || { running: false, jobs: [] });
      }
    } catch (error) {
      console.error('[WhatsApp Context] Failed to fetch scheduler status:', error);
    }
  }, []);

  // Smart polling based on connection status and visibility
  useEffect(() => {
    if (!isVisible) {
      // Stop polling when tab is not visible
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      return;
    }

    // Determine polling interval based on status
    let intervalMs = 60000; // Default: 60 seconds for connected
    if (status.status === 'connecting') {
      intervalMs = 10000; // 10 seconds when connecting
    } else if (status.status === 'disconnected') {
      intervalMs = 30000; // 30 seconds when disconnected
    }

    // Clear existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Set new interval
    const newInterval = setInterval(() => {
      refreshStatus();
      refreshSchedulerStatus();
    }, intervalMs);
    
    setPollingInterval(newInterval);

    return () => {
      if (newInterval) {
        clearInterval(newInterval);
      }
    };
  }, [status.status, isVisible, refreshStatus, refreshSchedulerStatus]);

  // Handle page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    refreshStatus(true);
    refreshSchedulerStatus();
  }, []);

  const value: WhatsAppContextType = {
    status,
    schedulerStatus,
    loading,
    refreshStatus: () => refreshStatus(true),
    refreshSchedulerStatus,
    lastUpdate,
  };

  return (
    <WhatsAppContext.Provider value={value}>
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp() {
  const context = useContext(WhatsAppContext);
  if (context === undefined) {
    throw new Error('useWhatsApp must be used within a WhatsAppProvider');
  }
  return context;
}
