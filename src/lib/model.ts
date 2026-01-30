/**
 * BB-SB-MODEL v2 - Core Prediction Engine
 *
 * This is the source of truth for all probability calculations.
 * Markets are NEVER used as input - only for comparison.
 */

import type { PredictionModel, SongPrediction, EdgeCalculation, MarketOdds, GuestPrediction } from '@/types';
import predictionsData from '@/data/predictions.json';

// ============================================================================
// CONSTANTS
// ============================================================================

export const WEIGHTS = {
  streaming: 0.20,
  concert: 0.15,
  sbSuitability: 0.25,
  cultural: 0.20,
  albumPush: 0.20,
} as const;

export const CONFIDENCE_THRESHOLDS = {
  veryHigh: 0.8,
  high: 0.6,
  medium: 0.4,
  low: 0.0,
} as const;

// ============================================================================
// MODEL ACCESS
// ============================================================================

let modelCache: PredictionModel | null = null;

export function getModel(): PredictionModel {
  if (!modelCache) {
    modelCache = predictionsData as PredictionModel;
  }
  return modelCache;
}

export function invalidateCache(): void {
  modelCache = null;
}

// ============================================================================
// PROBABILITY CALCULATIONS
// ============================================================================

/**
 * Calculate weighted probability score from factors
 * This is our ORIGINAL calculation - not based on markets
 */
export function calculateProbabilityScore(factors: SongPrediction['factors']): number {
  const score = (
    factors.streaming * WEIGHTS.streaming +
    factors.concert * WEIGHTS.concert +
    factors.sbSuitability * WEIGHTS.sbSuitability +
    factors.cultural * WEIGHTS.cultural +
    factors.albumPush * WEIGHTS.albumPush
  );

  // Normalize to 0-1 range
  return score / 100;
}

/**
 * Convert raw scores to probability distribution
 * Ensures all probabilities sum to 1
 */
export function normalizeProbabilities(songs: SongPrediction[]): SongPrediction[] {
  const scores = songs.map(s => calculateProbabilityScore(s.factors));
  const total = scores.reduce((a, b) => a + b, 0);

  return songs.map((song, i) => ({
    ...song,
    probability: scores[i] / total,
  }));
}

/**
 * Determine confidence level based on probability spread and factors
 */
export function getConfidenceLevel(
  probability: number,
  factors: SongPrediction['factors']
): 'low' | 'medium' | 'high' | 'very_high' {
  // High confidence if factors are consistent (low variance)
  const factorValues = Object.values(factors);
  const mean = factorValues.reduce((a, b) => a + b, 0) / factorValues.length;
  const variance = factorValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / factorValues.length;
  const consistency = 1 - (Math.sqrt(variance) / 100);

  // Combine probability magnitude with factor consistency
  const confidenceScore = (probability * 0.6) + (consistency * 0.4);

  if (confidenceScore >= CONFIDENCE_THRESHOLDS.veryHigh) return 'very_high';
  if (confidenceScore >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (confidenceScore >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
  return 'low';
}

// ============================================================================
// EDGE CALCULATIONS
// ============================================================================

/**
 * Calculate edge between our probability and market probability
 * Positive edge = market underpricing (BUY opportunity)
 * Negative edge = market overpricing (SELL/FADE opportunity)
 */
export function calculateEdge(
  ourProbability: number,
  marketProbability: number,
  platform: string
): EdgeCalculation {
  const edge = ourProbability - marketProbability;

  let recommendation: EdgeCalculation['recommendation'];
  let confidence: EdgeCalculation['confidence'];

  if (edge > 0.15) {
    recommendation = 'BUY';
    confidence = 'very_high';
  } else if (edge > 0.05) {
    recommendation = 'BUY';
    confidence = 'high';
  } else if (edge > 0.02) {
    recommendation = 'BUY';
    confidence = 'medium';
  } else if (edge > -0.02) {
    recommendation = 'HOLD';
    confidence = 'low';
  } else if (edge > -0.10) {
    recommendation = 'FADE';
    confidence = 'medium';
  } else if (edge > -0.20) {
    recommendation = 'SELL';
    confidence = 'high';
  } else {
    recommendation = 'SELL';
    confidence = 'very_high';
  }

  return {
    song: '',  // Will be set by caller
    ourProbability,
    marketProbability,
    platform,
    edge,
    recommendation,
    confidence,
  };
}

/**
 * Find all edges between our model and market data
 */
export function findAllEdges(marketData: MarketOdds[]): EdgeCalculation[] {
  const model = getModel();
  const edges: EdgeCalculation[] = [];

  for (const market of marketData) {
    // Find our probability for this song
    const ourPrediction = model.firstSong.predictions.find(
      p => p.song.toLowerCase() === market.song.toLowerCase()
    );

    if (ourPrediction) {
      const edge = calculateEdge(
        ourPrediction.probability,
        market.impliedProbability,
        market.platform
      );
      edge.song = market.song;
      edges.push(edge);
    }
  }

  // Sort by absolute edge value (largest mispricings first)
  return edges.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));
}

// ============================================================================
// MODEL UPDATES
// ============================================================================

/**
 * Update a specific song's factors and recalculate probability
 * This triggers a full renormalization
 */
export function updateSongFactors(
  song: string,
  factors: Partial<SongPrediction['factors']>,
  reasoning?: string
): SongPrediction | null {
  const model = getModel();
  const prediction = model.firstSong.predictions.find(
    p => p.song.toLowerCase() === song.toLowerCase()
  );

  if (!prediction) return null;

  // Update factors
  prediction.factors = { ...prediction.factors, ...factors };

  // Recalculate probability
  const newScore = calculateProbabilityScore(prediction.factors);
  prediction.probability = newScore;

  // Update confidence
  prediction.confidence = getConfidenceLevel(newScore, prediction.factors);

  // Update reasoning if provided
  if (reasoning) {
    prediction.reasoning = reasoning;
  }

  // Renormalize all probabilities
  const normalized = normalizeProbabilities(model.firstSong.predictions);
  model.firstSong.predictions = normalized;

  // Update timestamp
  model.meta.lastUpdated = new Date().toISOString();

  return prediction;
}

/**
 * Directly set a song's probability (bypasses factor calculation)
 * Use sparingly - prefer updateSongFactors
 */
export function setDirectProbability(
  song: string,
  newProbability: number,
  reasoning: string
): SongPrediction | null {
  const model = getModel();
  const prediction = model.firstSong.predictions.find(
    p => p.song.toLowerCase() === song.toLowerCase()
  );

  if (!prediction) return null;

  const oldProbability = prediction.probability;
  prediction.probability = newProbability;
  prediction.reasoning = `${reasoning} [Updated from ${(oldProbability * 100).toFixed(1)}% to ${(newProbability * 100).toFixed(1)}%]`;

  // Update timestamp
  model.meta.lastUpdated = new Date().toISOString();

  // Add to update log
  model.updateLog.push({
    date: new Date().toISOString().split('T')[0],
    version: model.meta.version,
    changes: `Updated ${song} probability: ${oldProbability} → ${newProbability}`,
    author: 'model_engine',
  });

  return prediction;
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

export function getFirstSongPredictions(): SongPrediction[] {
  return getModel().firstSong.predictions;
}

export function getLastSongPredictions(): SongPrediction[] {
  return getModel().lastSong.predictions;
}

export function getSetlist(): PredictionModel['setlist'] {
  return getModel().setlist;
}

export function getGuests(): GuestPrediction[] {
  return getModel().guests;
}

export function getMarketPositions(): PredictionModel['marketPositions'] {
  return getModel().marketPositions;
}

export function getModelMeta(): PredictionModel['meta'] {
  return getModel().meta;
}

export function getTopEdge(): EdgeCalculation | null {
  const positions = getMarketPositions();
  if (positions.highConviction.length === 0) return null;

  // Return the edge with largest absolute value
  return positions.highConviction.reduce((best, current) =>
    Math.abs(current.edge) > Math.abs(best.edge) ? current : best
  );
}
