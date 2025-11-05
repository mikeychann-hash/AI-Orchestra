'use client'

import { Card, CardContent } from './ui/card'
import { Activity, CheckCircle, XCircle, Clock, Zap } from 'lucide-react'

interface StatusDashboardProps {
  runStatus: any
  activeRun: string | null
}

export function StatusDashboard({ runStatus, activeRun }: StatusDashboardProps) {
  if (!activeRun) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No active pipeline run</p>
            <p className="text-sm mt-1">Upload a feature spec to get started</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = () => {
    switch (runStatus?.status) {
      case 'running':
        return <Zap className="w-6 h-6 text-blue-500 animate-pulse" />
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />
      default:
        return <Clock className="w-6 h-6 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (runStatus?.status) {
      case 'running':
        return 'bg-blue-50 border-blue-200'
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'failed':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <Card className={getStatusColor()}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getStatusIcon()}
            <div>
              <h3 className="font-semibold text-lg">
                Pipeline {runStatus?.status || 'Unknown'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Run ID: {activeRun.substring(0, 8)}...
              </p>
            </div>
          </div>

          {runStatus && (
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {runStatus.qaIterations || 0}
                </p>
                <p className="text-xs text-muted-foreground">QA Iterations</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {runStatus.debugIterations || 0}
                </p>
                <p className="text-xs text-muted-foreground">Debug Cycles</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {runStatus.finalScore || '-'}
                </p>
                <p className="text-xs text-muted-foreground">QA Score</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
