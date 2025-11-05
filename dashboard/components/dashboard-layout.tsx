'use client';

import { useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { useDashboardStore } from '@/lib/store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api } from '@/lib/api';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setSystemStatus, setIsConnected, handleWebSocketMessage } = useDashboardStore();

  // WebSocket connection
  const { isConnected } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onOpen: () => setIsConnected(true),
    onClose: () => setIsConnected(false),
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const status = await api.getStatus();
        setSystemStatus(status);
      } catch (error) {
        console.error('[Dashboard] Failed to load initial data:', error);
      }
    };

    loadData();

    // Refresh status every 30 seconds
    const interval = setInterval(loadData, 30000);

    return () => clearInterval(interval);
  }, [setSystemStatus]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
