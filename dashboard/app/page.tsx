'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Cpu,
  Database,
  Zap,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { api } from '@/lib/api';
import { formatDuration } from '@/lib/utils';

export default function OverviewPage() {
  const { systemStatus, builds, logs, isConnected } = useDashboardStore();
  const [recentBuilds, setRecentBuilds] = useState<any[]>([]);
  const [providerStats, setProviderStats] = useState<any>({});

  useEffect(() => {
    // Sort and get recent builds
    const sorted = [...builds].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    setRecentBuilds(sorted.slice(0, 5));

    // Calculate provider stats
    const stats: any = {};
    builds.forEach((build) => {
      if (!stats[build.provider]) {
        stats[build.provider] = { total: 0, success: 0, failed: 0 };
      }
      stats[build.provider].total++;
      if (build.status === 'completed') stats[build.provider].success++;
      if (build.status === 'failed') stats[build.provider].failed++;
    });
    setProviderStats(stats);
  }, [builds]);

  const stats = [
    {
      title: 'Active Builds',
      value: builds.filter((b) => b.status === 'running').length,
      change: '+2 from last hour',
      icon: Activity,
      color: 'text-blue-500',
    },
    {
      title: 'Total Providers',
      value: systemStatus?.llm.providers.length || 0,
      change: `${systemStatus?.llm.defaultProvider || 'N/A'} primary`,
      icon: Cpu,
      color: 'text-green-500',
    },
    {
      title: 'Success Rate',
      value: builds.length > 0
        ? `${Math.round((builds.filter((b) => b.status === 'completed').length / builds.length) * 100)}%`
        : '0%',
      change: 'Last 24 hours',
      icon: TrendingUp,
      color: 'text-emerald-500',
    },
    {
      title: 'System Uptime',
      value: systemStatus ? formatDuration(systemStatus.application.uptime * 1000) : '0s',
      change: systemStatus?.application.environment || 'N/A',
      icon: Clock,
      color: 'text-purple-500',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Overview</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your AI Orchestra system status and performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current system health and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Connection</span>
                <Badge variant={isConnected ? 'secondary' : 'destructive'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              </div>

              {systemStatus?.llm.providers.map((provider) => (
                <div key={provider} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{provider}</span>
                  <Badge variant="outline">Active</Badge>
                </div>
              ))}

              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm font-medium">Load Balancing</span>
                <span className="text-sm text-muted-foreground">
                  {systemStatus?.llm.loadBalancing || 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">GitHub Integration</span>
                <Badge variant={systemStatus?.github.enabled ? 'secondary' : 'outline'}>
                  {systemStatus?.github.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest logs and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logs.slice(0, 5).map((log, idx) => (
                  <div key={idx} className="flex items-start space-x-3 text-sm">
                    {log.level === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="font-medium">{log.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()} · {log.agent}
                      </p>
                    </div>
                  </div>
                ))}

                {logs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Builds */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Builds</CardTitle>
            <CardDescription>Latest pipeline executions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBuilds.map((build) => (
                <div key={build.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        build.status === 'completed' ? 'secondary' :
                        build.status === 'failed' ? 'destructive' :
                        'default'
                      }>
                        {build.status}
                      </Badge>
                      <span className="text-sm font-medium">{build.provider}</span>
                      <span className="text-xs text-muted-foreground">· {build.model}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate max-w-md">
                      {build.prompt}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {new Date(build.startedAt).toLocaleTimeString()}
                    </div>
                    {build.duration && (
                      <div className="text-xs text-muted-foreground">
                        {formatDuration(build.duration)}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {recentBuilds.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No builds yet. Start a new build to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
