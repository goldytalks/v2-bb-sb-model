/**
 * BB-SB-MODEL v2 - Core Prediction Engine
 *
 * This is the source of truth for all probability calculations.
 * Markets are NEVER used as input - only for comparison.
 */

import type { PredictionModel, SongPrediction, EdgeCalculation, MarketOdds, GuestPrediction, MarketType } from '@/types';
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

export function calculateProbabilityScore(factors: SongPrediction['factors']): number {
  const score = (
    factors.streaming * WEIGHTS.streaming +
    factors.concert * WEIGHTS.concert +
    factors.sbSuitability * WEIGHTS.sbSuitability +
    factors.cultural * WEIGHTS.cultural +
    factors.albumPush * WEIGHTS.albumPush
  );
  return score / 100;
}

export function normalizeProbabilities(songs: SongPrediction[]): SongPrediction[] {
  const scores = songs.map(s => calculateProbabilityScore(s.factors));
  const total = scores.reduce((a, b) => a + b, 0);
  return songs.map((song, i) => ({
    ...song,
    probability: scores[i] / total,
  }));
}

export function getConfidenceLevel(
  probability: number,
  factors: SongPrediction['factors']
): 'low' | 'medium' | 'high' | 'very_high' {
  const factorValues = Object.values(factors);
  const mean = factorValues.reduce((a, b) => a + b, 0) / factorValues.length;
  const variance = factorValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / factorValues.length;
  const consistency = 1 - (Math.sqrt(variance) / 100);
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
 * Positive edge → BUY_YES, Negative edge → BUY_NO, Near zero → HOLD
 */
export function calculateEdge(
  ourProbability: number,
  marketProbability: number,
  platform: string,
  marketType: MarketType = 'first_song'
): EdgeCalculation {
  const edge = ourProbability - marketProbability;

  let recommendation: EdgeCalculation['recommendation'];
  let confidence: EdgeCalculation['confidence'];

  const absEdge = Math.abs(edge);

  if (absEdge <= 0.02) {
    recommendation = 'HOLD';
    confidence = 'low';
  } else if (absEdge <= 0.05) {
    recommendation = edge > 0 ? 'BUY_YES' : 'BUY_NO';
    confidence = 'medium';
  } else if (absEdge <= 0.15) {
    recommendation = edge > 0 ? 'BUY_YES' : 'BUY_NO';
    confidence = 'high';
  } else {
    recommendation = edge > 0 ? 'BUY_YES' : 'BUY_NO';
    confidence = 'very_high';
  }

  return {
    song: '',  // Will be set by caller
    ourProbability,
    marketProbability,
    platform,
    marketType,
    edge,
    recommendation,
    confidence,
  };
}

/**
 * Find all edges between our model and market data.
 * Handles both first_song and songs_played market types.
 */
export function findAllEdges(marketData: MarketOdds[]): EdgeCalculation[] {
  const model = getModel();
  const edges: EdgeCalculation[] = [];

  for (const market of marketData) {
    const mType = market.marketType || 'first_song';

    if (mType === 'first_song') {
      const ourPrediction = model.firstSong.predictions.find(
        p => p.song.toLowerCase() === market.song.toLowerCase()
      );
      if (ourPrediction) {
        const edge = calculateEdge(
          ourPrediction.probability,
          market.impliedProbability,
          market.platform,
          'first_song'
        );
        edge.song = market.song;
        edges.push(edge);
      }
    } else if (mType === 'songs_played') {
      // For songs_played, match against setlist inclusion probabilities
      const setlistSong = model.setlist.primary.find(
        s => s.song.toLowerCase() === market.song.toLowerCase()
      );
      if (setlistSong) {
        const edge = calculateEdge(
          setlistSong.inclusionProbability,
          market.impliedProbability,
          market.platform,
          'songs_played'
        );
        edge.song = market.song;
        edges.push(edge);
      }
    } else if (mType === 'guest_performer') {
      // For guest_performer, match against guests[] predictions
      const guest = model.guests.find(
        g => g.name.toLowerCase() === market.song.toLowerCase()
      );
      if (guest) {
        const edge = calculateEdge(
          guest.probability,
          market.impliedProbability,
          market.platform,
          'guest_performer'
        );
        edge.song = market.song;
        edges.push(edge);
      }
    }
  }

  return edges.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));
}

// ============================================================================
// MODEL UPDATES
// ============================================================================

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

  prediction.factors = { ...prediction.factors, ...factors };
  const newScore = calculateProbabilityScore(prediction.factors);
  prediction.probability = newScore;
  prediction.confidence = getConfidenceLevel(newScore, prediction.factors);

  if (reasoning) {
    prediction.reasoning = reasoning;
  }

  const normalized = normalizeProbabilities(model.firstSong.predictions);
  model.firstSong.predictions = normalized;
  model.meta.lastUpdated = new Date().toISOString();

  return prediction;
}

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

  model.meta.lastUpdated = new Date().toISOString();

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
  return positions.highConviction.reduce((best, current) =>
    Math.abs(current.edge) > Math.abs(best.edge) ? current : best
  );
}
