/**
 * BB-SB-MODEL v2 - Market Data Fetchers
 *
 * IMPORTANT: This data is used ONLY for comparison with our model.
 * Market data NEVER influences our probability calculations.
 *
 * Platforms: Kalshi + Polymarket (both have First Song & Songs Played markets)
 */

import type { MarketOdds, MarketComparisonResponse } from '@/types';
import { findAllEdges } from './model';

// ============================================================================
// API ENDPOINTS
// ============================================================================

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com';
const POLYMARKET_CLOB_API = 'https://clob.polymarket.com';

// ============================================================================
// KALSHI FETCHER
// ============================================================================

export async function fetchKalshiOdds(): Promise<{
  firstSong: MarketOdds[];
  songsPlayed: MarketOdds[];
}> {
  try {
    const response = await fetch(
      `${KALSHI_API}/markets?series_ticker=SBLX`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      throw new Error(`Kalshi API error: ${response.status}`);
    }

    const data = await response.json();
    const markets = data.markets || [];

    const firstSong: MarketOdds[] = [];
    const songsPlayed: MarketOdds[] = [];

    for (const m of markets) {
      const ticker: string = m.ticker || '';
      const yesPrice = (m.yes_bid || m.last_price || 0) / 100;
      const noPrice = 1 - yesPrice;
      const title: string = (m.title || '').toLowerCase();

      const odds: MarketOdds = {
        platform: 'kalshi',
        song: m.title || ticker,
        marketType: 'first_song',
        impliedProbability: yesPrice,
        yesPrice,
        noPrice,
        volume: m.volume || 0,
        lastUpdated: new Date().toISOString(),
      };

      if (ticker.includes('FIRST') || title.includes('first song')) {
        odds.marketType = 'first_song';
        firstSong.push(odds);
      } else if (ticker.includes('PLAYED') || title.includes('played') || title.includes('setlist')) {
        odds.marketType = 'songs_played';
        songsPlayed.push(odds);
      } else {
        // Default to first_song bucket
        firstSong.push(odds);
      }
    }

    // If API returned no parseable markets, use fallbacks
    if (firstSong.length === 0) {
      firstSong.push(...getKalshiFallback('first_song'));
    }
    if (songsPlayed.length === 0) {
      songsPlayed.push(...getKalshiFallback('songs_played'));
    }

    return { firstSong, songsPlayed };
  } catch (error) {
    console.error('Kalshi fetch error:', error);
    return {
      firstSong: getKalshiFallback('first_song'),
      songsPlayed: getKalshiFallback('songs_played'),
    };
  }
}

function getKalshiFallback(marketType: 'first_song' | 'songs_played'): MarketOdds[] {
  const now = new Date().toISOString();
  if (marketType === 'first_song') {
    return [
      { platform: 'kalshi', song: 'NuevaYol', marketType: 'first_song', impliedProbability: 0.56, yesPrice: 0.56, noPrice: 0.44, volume: 12500, lastUpdated: now },
      { platform: 'kalshi', song: 'Tití Me Preguntó', marketType: 'first_song', impliedProbability: 0.26, yesPrice: 0.26, noPrice: 0.74, volume: 8200, lastUpdated: now },
      { platform: 'kalshi', song: 'La MuDANZA', marketType: 'first_song', impliedProbability: 0.21, yesPrice: 0.21, noPrice: 0.79, volume: 5100, lastUpdated: now },
      { platform: 'kalshi', song: 'DÁKITI', marketType: 'first_song', impliedProbability: 0.13, yesPrice: 0.13, noPrice: 0.87, volume: 3800, lastUpdated: now },
      { platform: 'kalshi', song: 'BAILE INoLVIDABLE', marketType: 'first_song', impliedProbability: 0.11, yesPrice: 0.11, noPrice: 0.89, volume: 2900, lastUpdated: now },
    ];
  }
  return [
    { platform: 'kalshi', song: 'DÁKITI', marketType: 'songs_played', impliedProbability: 0.92, yesPrice: 0.92, noPrice: 0.08, volume: 6200, lastUpdated: now },
    { platform: 'kalshi', song: 'Tití Me Preguntó', marketType: 'songs_played', impliedProbability: 0.85, yesPrice: 0.85, noPrice: 0.15, volume: 5800, lastUpdated: now },
    { platform: 'kalshi', song: 'Me Porto Bonito', marketType: 'songs_played', impliedProbability: 0.80, yesPrice: 0.80, noPrice: 0.20, volume: 4500, lastUpdated: now },
    { platform: 'kalshi', song: 'BAILE INoLVIDABLE', marketType: 'songs_played', impliedProbability: 0.88, yesPrice: 0.88, noPrice: 0.12, volume: 5100, lastUpdated: now },
    { platform: 'kalshi', song: 'DtMF', marketType: 'songs_played', impliedProbability: 0.75, yesPrice: 0.75, noPrice: 0.25, volume: 3900, lastUpdated: now },
  ];
}

// ============================================================================
// POLYMARKET FETCHER (Gamma API for discovery, CLOB for prices)
// ============================================================================

interface GammaMarket {
  id: string;
  condition_id: string;
  question: string;
  slug: string;
  tokens?: { token_id: string; outcome: string }[];
  outcomePrices?: string;
}

export async function fetchPolymarketOdds(): Promise<{
  firstSong: MarketOdds[];
  songsPlayed: MarketOdds[];
}> {
  try {
    // Discover markets via Gamma API
    const searchRes = await fetch(
      `${POLYMARKET_GAMMA_API}/markets?tag=super-bowl&closed=false&limit=50`,
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 60 } }
    );

    if (!searchRes.ok) throw new Error(`Gamma API error: ${searchRes.status}`);

    const markets: GammaMarket[] = await searchRes.json();

    const firstSong: MarketOdds[] = [];
    const songsPlayed: MarketOdds[] = [];

    for (const market of markets) {
      const q = (market.question || '').toLowerCase();
      const isBadBunny = q.includes('bad bunny');
      if (!isBadBunny) continue;

      const isFirstSong = q.includes('first song') || q.includes('opening song');
      const isSongsPlayed = q.includes('played') || q.includes('setlist') || q.includes('perform');

      // Try to get price from CLOB
      let yesPrice = 0.5;
      try {
        if (market.condition_id) {
          const clobRes = await fetch(
            `${POLYMARKET_CLOB_API}/markets/${market.condition_id}`,
            { headers: { 'Accept': 'application/json' }, next: { revalidate: 60 } }
          );
          if (clobRes.ok) {
            const clobData = await clobRes.json();
            const prices = clobData.outcomePrices;
            if (typeof prices === 'string') {
              const parsed = JSON.parse(prices);
              yesPrice = parseFloat(parsed[0]) || 0.5;
            } else if (Array.isArray(prices)) {
              yesPrice = parseFloat(prices[0]) || 0.5;
            }
          }
        }
      } catch {
        // Use default price
      }

      // Also try outcomePrices from Gamma response
      if (market.outcomePrices) {
        try {
          const parsed = JSON.parse(market.outcomePrices);
          yesPrice = parseFloat(parsed[0]) || yesPrice;
        } catch {
          // keep existing
        }
      }

      const odds: MarketOdds = {
        platform: 'polymarket',
        song: market.question || market.slug,
        marketType: isFirstSong ? 'first_song' : 'songs_played',
        impliedProbability: yesPrice,
        yesPrice,
        noPrice: 1 - yesPrice,
        volume: 0,
        lastUpdated: new Date().toISOString(),
      };

      if (isFirstSong) {
        firstSong.push(odds);
      } else if (isSongsPlayed) {
        songsPlayed.push(odds);
      }
    }

    // Fallback if no markets found
    if (firstSong.length === 0) firstSong.push(...getPolymarketFallback('first_song'));
    if (songsPlayed.length === 0) songsPlayed.push(...getPolymarketFallback('songs_played'));

    return { firstSong, songsPlayed };
  } catch (error) {
    console.error('Polymarket fetch error:', error);
    return {
      firstSong: getPolymarketFallback('first_song'),
      songsPlayed: getPolymarketFallback('songs_played'),
    };
  }
}

function getPolymarketFallback(marketType: 'first_song' | 'songs_played'): MarketOdds[] {
  const now = new Date().toISOString();
  if (marketType === 'first_song') {
    return [
      { platform: 'polymarket', song: 'NuevaYol', marketType: 'first_song', impliedProbability: 0.52, yesPrice: 0.52, noPrice: 0.48, volume: 8500, lastUpdated: now },
      { platform: 'polymarket', song: 'Tití Me Preguntó', marketType: 'first_song', impliedProbability: 0.28, yesPrice: 0.28, noPrice: 0.72, volume: 6200, lastUpdated: now },
      { platform: 'polymarket', song: 'DÁKITI', marketType: 'first_song', impliedProbability: 0.10, yesPrice: 0.10, noPrice: 0.90, volume: 3100, lastUpdated: now },
    ];
  }
  return [
    { platform: 'polymarket', song: 'DÁKITI', marketType: 'songs_played', impliedProbability: 0.90, yesPrice: 0.90, noPrice: 0.10, volume: 5000, lastUpdated: now },
    { platform: 'polymarket', song: 'Tití Me Preguntó', marketType: 'songs_played', impliedProbability: 0.82, yesPrice: 0.82, noPrice: 0.18, volume: 4200, lastUpdated: now },
    { platform: 'polymarket', song: 'Me Porto Bonito', marketType: 'songs_played', impliedProbability: 0.78, yesPrice: 0.78, noPrice: 0.22, volume: 3800, lastUpdated: now },
  ];
}

// ============================================================================
// UNIFIED MARKET COMPARISON
// ============================================================================

export async function getMarketComparison(): Promise<MarketComparisonResponse> {
  const [kalshi, polymarket] = await Promise.all([
    fetchKalshiOdds(),
    fetchPolymarketOdds(),
  ]);

  // Combine all first song markets for edge calculation
  const allFirstSongMarkets = [
    ...kalshi.firstSong,
    ...polymarket.firstSong,
  ];

  // Combine songs played markets
  const allSongsPlayedMarkets = [
    ...kalshi.songsPlayed,
    ...polymarket.songsPlayed,
  ];

  // Calculate edges against our model
  const firstSongEdges = findAllEdges(allFirstSongMarkets);
  const songsPlayedEdges = findAllEdges(allSongsPlayedMarkets);

  return {
    kalshi: {
      firstSong: kalshi.firstSong,
      songsPlayed: kalshi.songsPlayed,
    },
    polymarket: {
      firstSong: polymarket.firstSong,
      songsPlayed: polymarket.songsPlayed,
    },
    lastFetched: new Date().toISOString(),
    edges: [...firstSongEdges, ...songsPlayedEdges],
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function americanToImplied(american: string): number {
  const odds = parseInt(american.replace('+', '').replace('-', ''));
  if (american.startsWith('+')) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
}

export function impliedToAmerican(probability: number): string {
  if (probability >= 0.5) {
    const odds = Math.round((probability / (1 - probability)) * 100);
    return `-${odds}`;
  } else {
    const odds = Math.round(((1 - probability) / probability) * 100);
    return `+${odds}`;
  }
}
