'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';

export default function BuildPage() {
  const { systemStatus, currentBuild, addBuild } = useDashboardStore();
  const [prompt, setPrompt] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<any>(null);

  const handleStartBuild = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setIsBuilding(true);
    setBuildResult(null);

    const buildId = `build-${Date.now()}`;
    const build = {
      id: buildId,
      status: 'running' as const,
      startedAt: new Date().toISOString(),
      provider: selectedProvider || systemStatus?.llm.defaultProvider || 'openai',
      model: selectedModel || 'gpt-4-turbo-preview',
      prompt,
    };

    addBuild(build);

    try {
      const result = await api.query({
        prompt,
        provider: selectedProvider || undefined,
        model: selectedModel || undefined,
        temperature,
        maxTokens,
      });

      setBuildResult(result);
    } catch (error: any) {
      setBuildResult({ error: error.message });
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Build Pipeline</h1>
          <p className="text-muted-foreground mt-2">
            Start a new FusionForge build and monitor progress in real-time
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Build Configuration</CardTitle>
              <CardDescription>Configure and trigger a new build</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your prompt here..."
                  className="w-full mt-1 min-h-[120px] rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Provider (Optional)</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Auto (Default: {systemStatus?.llm.defaultProvider})</option>
                  {systemStatus?.llm.providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Model (Optional)</label>
                <input
                  type="text"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  placeholder="Leave empty for default model"
                  className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Temperature: {temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Tokens</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  min="100"
                  max="8000"
                  className="w-full mt-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <Button
                onClick={handleStartBuild}
                disabled={isBuilding || !prompt.trim()}
                className="w-full"
                size="lg"
              >
                {isBuilding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Build
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Build Output</CardTitle>
              <CardDescription>Real-time build results and logs</CardDescription>
            </CardHeader>
            <CardContent>
              {!buildResult && !isBuilding && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Play className="h-12 w-12 mb-4 opacity-50" />
                  <p>No build running</p>
                  <p className="text-sm mt-2">Configure and start a build to see output</p>
                </div>
              )}

              {isBuilding && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-12 w-12 mb-4 animate-spin text-primary" />
                  <p className="font-medium">Building...</p>
                  <p className="text-sm text-muted-foreground mt-2">Processing your request</p>
                </div>
              )}

              {buildResult && !buildResult.error && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Build Completed</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider:</span>
                      <span className="font-medium">{buildResult.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-medium">{buildResult.model}</span>
                    </div>
                    {buildResult.usage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tokens Used:</span>
                        <span className="font-medium">{buildResult.usage.totalTokens}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="text-sm font-medium">Response:</label>
                    <div className="mt-2 rounded-lg border bg-muted p-4 text-sm max-h-[400px] overflow-y-auto">
                      {buildResult.content}
                    </div>
                  </div>
                </div>
              )}

              {buildResult?.error && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Build Failed</span>
                  </div>

                  <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm">
                    {buildResult.error}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {currentBuild && (
          <Card>
            <CardHeader>
              <CardTitle>Current Build Status</CardTitle>
              <CardDescription>Monitoring active build progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Build ID: {currentBuild.id}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Started {new Date(currentBuild.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={
                    currentBuild.status === 'completed' ? 'secondary' :
                    currentBuild.status === 'failed' ? 'destructive' :
                    'default'
                  }>
                    {currentBuild.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Provider</p>
                    <p className="font-medium mt-1">{currentBuild.provider}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Model</p>
                    <p className="font-medium mt-1">{currentBuild.model}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium mt-1">
                      {currentBuild.duration ? formatDuration(currentBuild.duration) : 'In progress...'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
