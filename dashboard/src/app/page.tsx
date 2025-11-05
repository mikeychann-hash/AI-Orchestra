'use client'

import { useState } from 'react'
import { PipelineTrigger } from '@/components/PipelineTrigger'
import { LogViewer } from '@/components/LogViewer'
import { ArtifactViewer } from '@/components/ArtifactViewer'
import { StatusDashboard } from '@/components/StatusDashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap } from 'lucide-react'

export default function Home() {
  const [activeRun, setActiveRun] = useState<string | null>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [artifacts, setArtifacts] = useState<any[]>([])
  const [runStatus, setRunStatus] = useState<any>(null)

  const handlePipelineStart = (runId: string) => {
    setActiveRun(runId)
    setLogs([])
    setArtifacts([])
    setRunStatus({ status: 'running', runId })
  }

  const handleLogUpdate = (newLogs: any[]) => {
    setLogs((prev) => [...prev, ...newLogs])
  }

  const handleArtifactUpdate = (newArtifacts: any[]) => {
    setArtifacts((prev) => [...prev, ...newArtifacts])
  }

  const handleStatusUpdate = (status: any) => {
    setRunStatus(status)
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">AI Orchestra</h1>
            <p className="text-muted-foreground mt-1">
              Multi-LLM Development Pipeline Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="mb-6">
        <StatusDashboard runStatus={runStatus} activeRun={activeRun} />
      </div>

      {/* Pipeline Trigger */}
      <div className="mb-6">
        <PipelineTrigger onPipelineStart={handlePipelineStart} />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="logs">Live Logs</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <LogViewer
            runId={activeRun}
            logs={logs}
            onLogUpdate={handleLogUpdate}
            onStatusUpdate={handleStatusUpdate}
          />
        </TabsContent>

        <TabsContent value="artifacts" className="space-y-4">
          <ArtifactViewer
            runId={activeRun}
            artifacts={artifacts}
            onArtifactUpdate={handleArtifactUpdate}
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}
