'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Play, Upload, Loader2 } from 'lucide-react'

interface PipelineTriggerProps {
  onPipelineStart: (runId: string) => void
}

export function PipelineTrigger({ onPipelineStart }: PipelineTriggerProps) {
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [featureSpec, setFeatureSpec] = useState<any>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const spec = JSON.parse(e.target?.result as string)
        setFeatureSpec(spec)
      } catch (error) {
        console.error('Failed to parse feature spec:', error)
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
  }

  const handleRunPipeline = async () => {
    if (!featureSpec) {
      alert('Please upload a feature specification file first')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featureSpec }),
      })

      const data = await response.json()

      if (data.success) {
        onPipelineStart(data.runId)
      } else {
        alert(`Failed to start pipeline: ${data.error}`)
      }
    } catch (error) {
      console.error('Failed to start pipeline:', error)
      alert('Failed to start pipeline')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          Pipeline Trigger
        </CardTitle>
        <CardDescription>
          Upload a feature specification and start the AI Orchestra pipeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label
              htmlFor="feature-spec"
              className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
            >
              <span className="flex items-center space-x-2">
                <Upload className="w-6 h-6 text-gray-600" />
                <span className="font-medium text-gray-600">
                  {selectedFile
                    ? selectedFile.name
                    : 'Drop feature spec JSON or click to browse'}
                </span>
              </span>
              <input
                id="feature-spec"
                type="file"
                className="hidden"
                accept=".json"
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {/* Feature Spec Preview */}
          {featureSpec && (
            <div className="p-4 bg-slate-50 rounded-md border">
              <h4 className="font-medium mb-2">Feature Specification</h4>
              <dl className="space-y-1 text-sm">
                <div className="flex">
                  <dt className="font-medium w-24">Name:</dt>
                  <dd className="text-muted-foreground">{featureSpec.name}</dd>
                </div>
                <div className="flex">
                  <dt className="font-medium w-24">Type:</dt>
                  <dd className="text-muted-foreground">{featureSpec.type}</dd>
                </div>
                <div className="flex">
                  <dt className="font-medium w-24">Frontend:</dt>
                  <dd className="text-muted-foreground">
                    {featureSpec.frontend?.enabled ? '✓ Enabled' : '✗ Disabled'}
                  </dd>
                </div>
                <div className="flex">
                  <dt className="font-medium w-24">Backend:</dt>
                  <dd className="text-muted-foreground">
                    {featureSpec.backend?.enabled ? '✓ Enabled' : '✗ Disabled'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Run Button */}
          <Button
            onClick={handleRunPipeline}
            disabled={!featureSpec || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting Pipeline...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Pipeline
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
