'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Info, AlertTriangle, Bug, Trash2 } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';

export default function LogsPage() {
  const { logs, filterLogLevel, setFilterLogLevel, clearLogs } = useDashboardStore();

  const filteredLogs = filterLogLevel === 'all'
    ? logs
    : logs.filter(log => log.level === filterLogLevel);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'debug': return <Bug className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-green-500" />;
    }
  };

  const levelCounts = {
    all: logs.length,
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
    debug: logs.filter(l => l.level === 'debug').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agent Logs</h1>
            <p className="text-muted-foreground mt-2">
              Real-time monitoring of agent activities and system events
            </p>
          </div>
          <Button variant="outline" onClick={clearLogs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Logs
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Live Logs ({filteredLogs.length})</CardTitle>
              <Tabs value={filterLogLevel} onValueChange={(v: any) => setFilterLogLevel(v)}>
                <TabsList>
                  <TabsTrigger value="all">All ({levelCounts.all})</TabsTrigger>
                  <TabsTrigger value="info">Info ({levelCounts.info})</TabsTrigger>
                  <TabsTrigger value="warn">Warn ({levelCounts.warn})</TabsTrigger>
                  <TabsTrigger value="error">Error ({levelCounts.error})</TabsTrigger>
                  <TabsTrigger value="debug">Debug ({levelCounts.debug})</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto font-mono text-sm">
              {filteredLogs.map((log, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-2 rounded hover:bg-muted">
                  {getLogIcon(log.level)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">{log.agent}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1">{log.message}</p>
                    {log.metadata && (
                      <pre className="mt-1 text-xs text-muted-foreground">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}

              {filteredLogs.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No logs to display
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
