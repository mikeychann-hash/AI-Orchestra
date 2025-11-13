import { NextRequest, NextResponse } from 'next/server'
import {
  PipelineController,
  FeatureSpecLoader,
  type FeatureSpec,
} from 'ai-orchestra'

/**
 * In-memory storage for active pipeline runs
 *
 * @description Stores pipeline execution state including controller, results, logs, and artifacts.
 * In production environments, this should be migrated to Redis for horizontal scaling
 * and persistence across restarts. See ADR-003 and ADR-008 in ARCHITECTURE_DECISIONS.md.
 *
 * @type {Map<string, PipelineRun>}
 *
 * @example
 * ```typescript
 * const run = activeRuns.get(runId);
 * if (run) {
 *   console.log('Status:', run.result ? 'completed' : 'running');
 *   console.log('Logs:', run.logs.length);
 * }
 * ```
 */
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

/**
 * Cleanup interval for removing old pipeline runs
 * @constant {number}
 * @default 300000 (5 minutes)
 */
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Maximum age for a pipeline run before automatic cleanup
 * @constant {number}
 * @default 3600000 (1 hour)
 */
const MAX_RUN_AGE = 60 * 60 * 1000 // 1 hour

/**
 * Maximum number of concurrent pipeline runs to prevent memory exhaustion
 * @constant {number}
 * @default 100
 */
const MAX_RUNS = 100 // Maximum number of concurrent runs

/**
 * Automatic cleanup job for old pipeline runs
 *
 * @description Runs every 5 minutes to prevent memory leaks by:
 * 1. Removing runs older than MAX_RUN_AGE (1 hour)
 * 2. Enforcing MAX_RUNS limit by deleting oldest runs if exceeded
 *
 * This prevents unbounded memory growth and ensures stable long-running deployments.
 * Fixed in Iteration 1 as part of Bug #1 (Critical memory leak).
 *
 * @see {@link MASTER_BUG_GUIDE.md} Bug #1 - Memory Leak in Pipeline API Route
 * @see {@link ARCHITECTURE_DECISIONS.md} ADR-003 - Memory Leak Prevention Strategy
 */
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

/**
 * POST /api/pipeline/run - Start a new pipeline execution
 *
 * @description Validates a feature specification and starts a pipeline execution in the background.
 * Returns immediately with a run ID that can be used to check status and retrieve results.
 *
 * @param {NextRequest} request - Next.js request object containing feature spec in body
 *
 * @returns {Promise<NextResponse>} JSON response with success status and run ID
 *
 * @example Success Response
 * ```json
 * {
 *   "success": true,
 *   "runId": "run-1699901234567-a1b2c3d4e5",
 *   "message": "Pipeline started successfully"
 * }
 * ```
 *
 * @example Error Response (400 - Invalid Spec)
 * ```json
 * {
 *   "success": false,
 *   "error": "Invalid feature spec: Missing required field 'name'"
 * }
 * ```
 *
 * @example Request Body
 * ```json
 * {
 *   "featureSpec": {
 *     "name": "User Authentication",
 *     "description": "Implement user login and registration",
 *     "frontend": { "framework": "React" },
 *     "backend": { "framework": "Express" },
 *     "quality": { "maxQAIterations": 3 }
 *   }
 * }
 * ```
 *
 * @throws {400} Feature spec is required
 * @throws {400} Invalid feature spec format
 * @throws {500} Internal server error during pipeline initialization
 */
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
