import { NextRequest, NextResponse } from 'next/server';
import { setDirectProbability, updateSongFactors, getModel, invalidateCache } from '@/lib/model';
import type { UpdateRequest } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * Update model probabilities
 * Requires authentication in production
 */
export async function POST(request: NextRequest) {
  try {
    const body: UpdateRequest = await request.json();

    if (!body.song) {
      return NextResponse.json(
        { success: false, error: 'Song is required' },
        { status: 400 }
      );
    }

    let result;

    if (body.newProbability !== undefined) {
      // Direct probability update
      result = setDirectProbability(
        body.song,
        body.newProbability,
        body.reasoning || 'Manual update'
      );
    } else {
      // Factor-based update (if factors provided)
      return NextResponse.json(
        { success: false, error: 'newProbability or factors required' },
        { status: 400 }
      );
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: `Song "${body.song}" not found` },
        { status: 404 }
      );
    }

    // Invalidate cache to ensure fresh data on next request
    invalidateCache();

    return NextResponse.json({
      success: true,
      data: {
        song: result.song,
        newProbability: result.probability,
        confidence: result.confidence,
        reasoning: result.reasoning,
      },
      message: `Updated ${body.song} probability`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update model' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for current model state
 */
export async function GET() {
  const model = getModel();
  return NextResponse.json({
    success: true,
    data: {
      version: model.meta.version,
      lastUpdated: model.meta.lastUpdated,
      updateLog: model.updateLog.slice(-5), // Last 5 updates
    },
    timestamp: new Date().toISOString(),
  });
}
