'use client'

import { useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Terminal, Info, AlertTriangle, XCircle } from 'lucide-react'

interface LogViewerProps {
  runId: string | null
  logs: any[]
  onLogUpdate: (logs: any[]) => void
  onStatusUpdate: (status: any) => void
}

export function LogViewer({
  runId,
  logs,
  onLogUpdate,
  onStatusUpdate,
}: LogViewerProps) {
  const logEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Poll for logs when there's an active run
  useEffect(() => {
    if (!runId) return

    const pollLogs = async () => {
      try {
        const response = await fetch(`/api/pipeline/${runId}/logs`)
        const data = await response.json()

        if (data.logs && data.logs.length > 0) {
          onLogUpdate(data.logs)
        }

        if (data.status) {
          onStatusUpdate(data.status)
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error)
      }
    }

    const interval = setInterval(pollLogs, 2000) // Poll every 2 seconds
    pollLogs() // Initial fetch

    return () => clearInterval(interval)
  }, [runId, onLogUpdate, onStatusUpdate])

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-700 bg-red-50'
      case 'warn':
        return 'text-yellow-700 bg-yellow-50'
      case 'info':
      default:
        return 'text-slate-700 bg-slate-50'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Live Logs
        </CardTitle>
        <CardDescription>
          Real-time pipeline execution logs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-slate-900 rounded-lg p-4 h-[500px] overflow-y-auto font-mono text-sm">
          {!runId && (
            <div className="text-slate-400 text-center py-20">
              No active pipeline run
            </div>
          )}

          {runId && logs.length === 0 && (
            <div className="text-slate-400 text-center py-20">
              Waiting for logs...
            </div>
          )}

          {logs.map((log, index) => (
            <div
              key={index}
              className={`mb-2 p-2 rounded ${getLogColor(log.level)}`}
            >
              <div className="flex items-start gap-2">
                {getLogIcon(log.level)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs opacity-70">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-black/10">
                      {log.stage}
                    </span>
                  </div>
                  <div className="text-sm">{log.message}</div>
                </div>
              </div>
            </div>
          ))}

          <div ref={logEndRef} />
        </div>
      </CardContent>
    </Card>
  )
}
