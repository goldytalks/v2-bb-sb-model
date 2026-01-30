/**
 * BB-SB-MODEL v2 - Market Data Fetchers
 *
 * IMPORTANT: This data is used ONLY for comparison with our model.
 * Market data NEVER influences our probability calculations.
 */

import type { MarketOdds, MarketComparisonResponse } from '@/types';
import { findAllEdges, getModel } from './model';

// ============================================================================
// API ENDPOINTS
// ============================================================================

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const POLYMARKET_API = 'https://clob.polymarket.com';

// Market IDs - update these when real markets are available
const MARKET_IDS = {
  kalshi: {
    firstSong: 'SBLX-BADBUNNY-FIRST',
    guests: 'SBLX-BADBUNNY-GUESTS',
  },
  polymarket: {
    firstSong: '', // Add when available
  },
};

// ============================================================================
// KALSHI FETCHER
// ============================================================================

interface KalshiMarketResponse {
  market?: {
    ticker: string;
    yes_bid: number;
    no_bid: number;
    last_price: number;
    volume: number;
  };
}

export async function fetchKalshiOdds(): Promise<MarketOdds[]> {
  try {
    // For Super Bowl markets, we need to fetch from their elections API
    const response = await fetch(
      `${KALSHI_API}/markets?series_ticker=SBLX`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      throw new Error(`Kalshi API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse markets into our format
    const odds: MarketOdds[] = [];

    // Map Kalshi market data to our song predictions
    // This is mock data structure - update when real markets available
    const kalshiSongs = [
      { song: 'NuevaYol', impliedProbability: 0.56, volume: 12500 },
      { song: 'Tití Me Preguntó', impliedProbability: 0.26, volume: 8200 },
      { song: 'La MuDANZA', impliedProbability: 0.21, volume: 5100 },
      { song: 'DÁKITI', impliedProbability: 0.13, volume: 3800 },
      { song: 'BAILE INoLVIDABLE', impliedProbability: 0.11, volume: 2900 },
      { song: 'La Canción', impliedProbability: 0.05, volume: 1200 },
      { song: 'DtMF', impliedProbability: 0.03, volume: 800 },
    ];

    for (const item of kalshiSongs) {
      odds.push({
        platform: 'kalshi',
        song: item.song,
        impliedProbability: item.impliedProbability,
        volume: item.volume,
        lastUpdated: new Date().toISOString(),
      });
    }

    return odds;
  } catch (error) {
    console.error('Kalshi fetch error:', error);
    // Return cached/fallback data
    return getKalshiFallback();
  }
}

function getKalshiFallback(): MarketOdds[] {
  return [
    { platform: 'kalshi', song: 'NuevaYol', impliedProbability: 0.56, volume: 12500, lastUpdated: new Date().toISOString() },
    { platform: 'kalshi', song: 'Tití Me Preguntó', impliedProbability: 0.26, volume: 8200, lastUpdated: new Date().toISOString() },
    { platform: 'kalshi', song: 'La MuDANZA', impliedProbability: 0.21, volume: 5100, lastUpdated: new Date().toISOString() },
    { platform: 'kalshi', song: 'DÁKITI', impliedProbability: 0.13, volume: 3800, lastUpdated: new Date().toISOString() },
    { platform: 'kalshi', song: 'BAILE INoLVIDABLE', impliedProbability: 0.11, volume: 2900, lastUpdated: new Date().toISOString() },
  ];
}

// ============================================================================
// POLYMARKET FETCHER
// ============================================================================

export async function fetchPolymarketOdds(): Promise<MarketOdds[]> {
  try {
    // Polymarket API - update with real condition ID when available
    if (!MARKET_IDS.polymarket.firstSong) {
      return getPolymarketFallback();
    }

    const response = await fetch(
      `${POLYMARKET_API}/markets/${MARKET_IDS.polymarket.firstSong}`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse into our format
    return [{
      platform: 'polymarket',
      song: 'First Song Market',
      impliedProbability: data.outcomePrices?.[0] || 0.5,
      volume: data.volume || 0,
      lastUpdated: new Date().toISOString(),
    }];
  } catch (error) {
    console.error('Polymarket fetch error:', error);
    return getPolymarketFallback();
  }
}

function getPolymarketFallback(): MarketOdds[] {
  return [
    { platform: 'polymarket', song: 'NuevaYol', impliedProbability: 0.52, volume: 8500, lastUpdated: new Date().toISOString() },
    { platform: 'polymarket', song: 'Tití Me Preguntó', impliedProbability: 0.28, volume: 6200, lastUpdated: new Date().toISOString() },
  ];
}

// ============================================================================
// FANDUEL FETCHER (Scraping approach - odds from sportsbooks)
// ============================================================================

export async function fetchFanDuelOdds(): Promise<{
  firstSong: MarketOdds[];
  lastSong: MarketOdds[];
  guests: MarketOdds[];
}> {
  // FanDuel doesn't have a public API - use cached odds
  // Update these manually or via scraping service
  return {
    firstSong: [
      { platform: 'fanduel', song: 'BAILE INoLVIDABLE', impliedProbability: 0.323, americanOdds: '+210', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'MONACO', impliedProbability: 0.250, americanOdds: '+300', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'ALAMBRE PuA', impliedProbability: 0.227, americanOdds: '+340', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'La MuDANZA', impliedProbability: 0.189, americanOdds: '+430', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'Tití Me Preguntó', impliedProbability: 0.167, americanOdds: '+500', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'NuevaYol', impliedProbability: 0.133, americanOdds: '+650', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'DtMF', impliedProbability: 0.118, americanOdds: '+750', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'Me Porto Bonito', impliedProbability: 0.083, americanOdds: '+1100', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'I Like It', impliedProbability: 0.059, americanOdds: '+1600', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'DÁKITI', impliedProbability: 0.036, americanOdds: '+2700', lastUpdated: new Date().toISOString() },
    ],
    lastSong: [
      { platform: 'fanduel', song: 'EoO', impliedProbability: 0.323, americanOdds: '+210', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'DtMF', impliedProbability: 0.313, americanOdds: '+220', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'La MuDANZA', impliedProbability: 0.208, americanOdds: '+380', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'BAILE INoLVIDABLE', impliedProbability: 0.091, americanOdds: '+1000', lastUpdated: new Date().toISOString() },
    ],
    guests: [
      { platform: 'fanduel', song: 'Cardi B', impliedProbability: 0.714, americanOdds: '-250', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'J Balvin', impliedProbability: 0.615, americanOdds: '-160', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'Jennifer Lopez', impliedProbability: 0.556, americanOdds: '-125', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'Ricky Martin', impliedProbability: 0.556, americanOdds: '-125', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'Karol G', impliedProbability: 0.500, americanOdds: '+100', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'Daddy Yankee', impliedProbability: 0.345, americanOdds: '+190', lastUpdated: new Date().toISOString() },
      { platform: 'fanduel', song: 'Drake', impliedProbability: 0.077, americanOdds: '+1200', lastUpdated: new Date().toISOString() },
    ],
  };
}

// ============================================================================
// UNIFIED MARKET COMPARISON
// ============================================================================

export async function getMarketComparison(): Promise<MarketComparisonResponse> {
  const [kalshi, polymarket, fanduel] = await Promise.all([
    fetchKalshiOdds(),
    fetchPolymarketOdds(),
    fetchFanDuelOdds(),
  ]);

  // Combine all first song markets for edge calculation
  const allFirstSongMarkets = [
    ...kalshi,
    ...polymarket,
    ...fanduel.firstSong,
  ];

  // Calculate edges against our model
  const edges = findAllEdges(allFirstSongMarkets);

  return {
    kalshi: {
      firstSong: kalshi,
      guests: [], // Add when available
    },
    polymarket: {
      firstSong: polymarket,
    },
    fanduel,
    lastFetched: new Date().toISOString(),
    edges,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert American odds to implied probability
 */
export function americanToImplied(american: string): number {
  const odds = parseInt(american.replace('+', '').replace('-', ''));
  if (american.startsWith('+')) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
}

/**
 * Convert implied probability to American odds
 */
export function impliedToAmerican(probability: number): string {
  if (probability >= 0.5) {
    const odds = Math.round((probability / (1 - probability)) * 100);
    return `-${odds}`;
  } else {
    const odds = Math.round(((1 - probability) / probability) * 100);
    return `+${odds}`;
  }
}
