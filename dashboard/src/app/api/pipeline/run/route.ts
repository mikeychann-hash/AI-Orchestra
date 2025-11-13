import { NextRequest, NextResponse } from 'next/server'
import {
  PipelineController,
  FeatureSpecLoader,
  type FeatureSpec,
} from 'ai-orchestra'

// Store active pipeline runs in memory (in production, use Redis or a database)
const activeRuns = new Map<
  string,
  {
    controller: PipelineController
    result: any
    logs: any[]
    artifacts: any[]
    timestamp: number
  }
>()

// Cleanup old runs every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MAX_RUN_AGE = 60 * 60 * 1000 // 1 hour
const MAX_RUNS = 100 // Maximum number of concurrent runs

setInterval(() => {
  const now = Date.now()
  for (const [runId, run] of activeRuns.entries()) {
    if (now - run.timestamp > MAX_RUN_AGE) {
      activeRuns.delete(runId)
      console.log(`[Pipeline] Cleaned up old run: ${runId}`)
    }
  }

  // If still too many runs, delete oldest ones
  if (activeRuns.size > MAX_RUNS) {
    const sortedRuns = Array.from(activeRuns.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toDelete = sortedRuns.slice(0, activeRuns.size - MAX_RUNS)
    toDelete.forEach(([runId]) => {
      activeRuns.delete(runId)
      console.log(`[Pipeline] Cleaned up excess run: ${runId}`)
    })
  }
}, CLEANUP_INTERVAL)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { featureSpec } = body

    if (!featureSpec) {
      return NextResponse.json(
        { success: false, error: 'Feature spec is required' },
        { status: 400 }
      )
    }

    // Validate feature spec
    let validatedSpec: FeatureSpec
    try {
      validatedSpec = FeatureSpecLoader.fromObject(featureSpec)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid feature spec: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        { status: 400 }
      )
    }

    // Create pipeline controller
    const pipeline = new PipelineController({
      maxQAIterations: validatedSpec.quality?.maxQAIterations || 3,
      maxDebugIterations: 2,
      continueOnWarnings: true,
      parallelExecution: true,
      saveArtifacts: true,
      verbose: true,
      artifactsPath: './pipeline-artifacts',
    })

    // Generate run ID
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

    // Store the run
    activeRuns.set(runId, {
      controller: pipeline,
      result: null,
      logs: [],
      artifacts: [],
      timestamp: Date.now(),
    })

    // Start pipeline in background
    pipeline
      .run(validatedSpec)
      .then((result) => {
        const run = activeRuns.get(runId)
        if (run) {
          run.result = result
          run.logs = result.logs || []
          run.artifacts = result.artifacts || []
        }
      })
      .catch((error) => {
        const run = activeRuns.get(runId)
        if (run) {
          run.logs.push({
            timestamp: Date.now(),
            level: 'error',
            stage: 'pipeline',
            message: `Pipeline failed: ${error.message}`,
          })
        }
      })

    return NextResponse.json({
      success: true,
      runId,
      message: 'Pipeline started successfully',
    })
  } catch (error) {
    console.error('Error starting pipeline:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
