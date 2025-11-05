import { NextRequest, NextResponse } from 'next/server'

// This would ideally be shared with the run route or stored in a database
// For this example, we'll use a simple in-memory store
const logsStore = new Map<string, any[]>()

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const { runId } = params

    // In a real implementation, this would query the actual pipeline run
    // For now, return mock logs or stored logs
    const logs = logsStore.get(runId) || []

    // Get status from the pipeline (mock for now)
    const status = {
      status: logs.length > 0 ? 'running' : 'pending',
      qaIterations: 0,
      debugIterations: 0,
      finalScore: null,
    }

    return NextResponse.json({
      success: true,
      logs,
      status,
    })
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Helper function to add logs (called by pipeline)
export function addLogs(runId: string, newLogs: any[]) {
  const existing = logsStore.get(runId) || []
  logsStore.set(runId, [...existing, ...newLogs])
}
