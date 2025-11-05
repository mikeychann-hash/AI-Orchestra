import { NextRequest, NextResponse } from 'next/server'

// This would ideally be shared with the run route or stored in a database
// For this example, we'll use a simple in-memory store
const artifactsStore = new Map<string, any[]>()

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const { runId } = params

    // In a real implementation, this would query the actual pipeline artifacts
    // For now, return mock artifacts or stored artifacts
    const artifacts = artifactsStore.get(runId) || []

    return NextResponse.json({
      success: true,
      artifacts,
    })
  } catch (error) {
    console.error('Error fetching artifacts:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Helper function to add artifacts (called by pipeline)
export function addArtifacts(runId: string, newArtifacts: any[]) {
  const existing = artifactsStore.get(runId) || []
  artifactsStore.set(runId, [...existing, ...newArtifacts])
}
