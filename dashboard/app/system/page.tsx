'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Cpu, HardDrive, Zap } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';

export default function SystemPage() {
  const { systemStatus, isConnected } = useDashboardStore();
  const [models, setModels] = useState<any>({});

  useEffect(() => {
    const loadModels = async () => {
      try {
        const data = await api.getModels();
        setModels(data);
      } catch (error) {
        console.error('Failed to load models:', error);
      }
    };

    loadModels();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Status</h1>
          <p className="text-muted-foreground mt-2">
            Detailed system information and health metrics
          </p>
        </div>

        {/* System Health */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge variant={isConnected ? 'secondary' : 'destructive'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemStatus ? formatDuration(systemStatus.application.uptime * 1000) : 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Environment</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge>{systemStatus?.application.environment || 'Unknown'}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Version</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemStatus?.application.version || 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Models */}
        <Card>
          <CardHeader>
            <CardTitle>Available Models</CardTitle>
            <CardDescription>Models available across all providers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(models).map(([provider, providerModels]: [string, any]) => (
                <div key={provider}>
                  <h3 className="font-semibold capitalize mb-2">{provider}</h3>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {providerModels.map((model: any) => (
                      <div key={model.id} className="p-3 border rounded-lg">
                        <p className="font-medium text-sm">{model.id || model.name}</p>
                        {model.size && (
                          <p className="text-xs text-muted-foreground mt-1">Size: {model.size}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {Object.keys(models).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No models available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Provider Status */}
        <Card>
          <CardHeader>
            <CardTitle>Provider Configuration</CardTitle>
            <CardDescription>Active LLM providers and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {systemStatus?.llm.providers.map((provider) => (
                <div key={provider} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{provider}</p>
                    <p className="text-sm text-muted-foreground">
                      {provider === systemStatus.llm.defaultProvider && 'Default Provider'}
                    </p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              ))}

              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
                <div>
                  <p className="font-medium">Load Balancing Strategy</p>
                  <p className="text-sm text-muted-foreground">Request distribution method</p>
                </div>
                <Badge>{systemStatus?.llm.loadBalancing || 'N/A'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
