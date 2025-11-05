'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { FileCode, Download, Eye } from 'lucide-react'
import { Button } from './ui/button'

interface ArtifactViewerProps {
  runId: string | null
  artifacts: any[]
  onArtifactUpdate: (artifacts: any[]) => void
}

export function ArtifactViewer({
  runId,
  artifacts,
  onArtifactUpdate,
}: ArtifactViewerProps) {
  const [selectedArtifact, setSelectedArtifact] = useState<any>(null)

  // Poll for artifacts when there's an active run
  useEffect(() => {
    if (!runId) return

    const pollArtifacts = async () => {
      try {
        const response = await fetch(`/api/pipeline/${runId}/artifacts`)
        const data = await response.json()

        if (data.artifacts && data.artifacts.length > 0) {
          onArtifactUpdate(data.artifacts)
        }
      } catch (error) {
        console.error('Failed to fetch artifacts:', error)
      }
    }

    const interval = setInterval(pollArtifacts, 3000) // Poll every 3 seconds
    pollArtifacts() // Initial fetch

    return () => clearInterval(interval)
  }, [runId, onArtifactUpdate])

  const handleDownload = (artifact: any) => {
    const blob = new Blob([artifact.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${artifact.type}-${artifact.stage}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getArtifactIcon = (type: string) => {
    return <FileCode className="w-4 h-4" />
  }

  const getArtifactColor = (stage: string) => {
    switch (stage) {
      case 'frontend':
        return 'bg-blue-100 text-blue-700'
      case 'backend':
        return 'bg-green-100 text-green-700'
      case 'qa':
        return 'bg-yellow-100 text-yellow-700'
      case 'debug':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="w-5 h-5" />
          Generated Artifacts
        </CardTitle>
        <CardDescription>
          View and download generated code and reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!runId && (
          <div className="text-center text-muted-foreground py-20">
            No active pipeline run
          </div>
        )}

        {runId && artifacts.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            No artifacts generated yet
          </div>
        )}

        <div className="grid gap-4">
          {artifacts.map((artifact, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getArtifactIcon(artifact.type)}
                  <div>
                    <h4 className="font-medium">{artifact.type}</h4>
                    <span
                      className={`text-xs px-2 py-1 rounded ${getArtifactColor(artifact.stage)}`}
                    >
                      {artifact.stage}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedArtifact(artifact)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(artifact)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>

              {selectedArtifact === artifact && (
                <div className="mt-3">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded text-xs overflow-x-auto max-h-96">
                    {artifact.content}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
