'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, RefreshCw } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';

export default function ConfigPage() {
  const { systemStatus } = useDashboardStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configuration</h1>
            <p className="text-muted-foreground mt-2">
              Manage LLM providers, models, and system settings
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Provider Settings */}
          <Card>
            <CardHeader>
              <CardTitle>LLM Providers</CardTitle>
              <CardDescription>Configure active providers and models</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemStatus?.llm.providers.map((provider) => (
                <div key={provider} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{provider}</p>
                    <p className="text-sm text-muted-foreground">Active provider</p>
                  </div>
                  <Badge variant="secondary">Enabled</Badge>
                </div>
              ))}

              <div className="pt-4 space-y-2">
                <label className="text-sm font-medium">Default Provider</label>
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  {systemStatus?.llm.providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Load Balancing</label>
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  <option value="round-robin">Round Robin</option>
                  <option value="random">Random</option>
                  <option value="default">Default</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>General system configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Environment</label>
                <input
                  type="text"
                  value={systemStatus?.application.environment || 'production'}
                  readOnly
                  className="w-full rounded-lg border bg-muted px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Log Level</label>
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Fallback</p>
                  <p className="text-sm text-muted-foreground">Automatically switch providers on failure</p>
                </div>
                <input type="checkbox" className="h-5 w-5" defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">GitHub Integration</p>
                  <p className="text-sm text-muted-foreground">Enable GitHub API features</p>
                </div>
                <input type="checkbox" className="h-5 w-5" defaultChecked={systemStatus?.github.enabled} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
