'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';

export default function AgentsPage() {
  const { agents } = useDashboardStore();

  // Mock agents if none exist
  const displayAgents = agents.length > 0 ? agents : [
    { id: '1', name: 'Frontend Agent', type: 'frontend' as const, status: 'idle' as const, tasksCompleted: 12 },
    { id: '2', name: 'Backend Agent', type: 'backend' as const, status: 'active' as const, tasksCompleted: 8, currentTask: 'Generating API endpoints' },
    { id: '3', name: 'QA Agent', type: 'qa' as const, status: 'idle' as const, tasksCompleted: 15 },
    { id: '4', name: 'Debugger Agent', type: 'debugger' as const, status: 'idle' as const, tasksCompleted: 5 },
    { id: '5', name: 'Coordinator Agent', type: 'coordinator' as const, status: 'active' as const, tasksCompleted: 20, currentTask: 'Orchestrating tasks' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage autonomous agents
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayAgents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <CardTitle className="text-lg">{agent.name}</CardTitle>
                  </div>
                  {getStatusIcon(agent.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={agent.status === 'active' ? 'default' : 'outline'}>
                    {agent.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge variant="secondary">{agent.type}</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tasks Completed</span>
                  <span className="font-medium">{agent.tasksCompleted}</span>
                </div>

                {agent.currentTask && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Current Task:</p>
                    <p className="text-sm mt-1">{agent.currentTask}</p>
                  </div>
                )}

                {agent.lastActivity && (
                  <div className="text-xs text-muted-foreground">
                    Last activity: {new Date(agent.lastActivity).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
