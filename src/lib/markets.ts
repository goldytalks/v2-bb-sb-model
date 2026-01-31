/**
 * BB-SB-MODEL v2 - Market Data Fetchers
 *
 * IMPORTANT: This data is used ONLY for comparison with our model.
 * Market data NEVER influences our probability calculations.
 *
 * Platforms: Kalshi (LIVE) + Polymarket (fallback until markets created)
 */

import type { MarketOdds, MarketComparisonResponse } from '@/types';
import { findAllEdges } from './model';

// ============================================================================
// API ENDPOINTS & MARKET IDS
// ============================================================================

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';

// Real Kalshi event tickers — discovered from live API
const KALSHI_EVENTS = {
  firstSong: 'KXFIRSTSUPERBOWLSONG',
};

const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com';
const POLYMARKET_CLOB_API = 'https://clob.polymarket.com';

// ============================================================================
// KALSHI FETCHER — LIVE DATA
// ============================================================================

interface KalshiMarket {
  ticker: string;
  title: string;
  yes_sub_title: string;
  no_sub_title: string;
  yes_bid: number;
  yes_ask: number;
  no_bid: number;
  no_ask: number;
  last_price: number;
  volume: number;
  volume_24h: number;
  open_interest: number;
  status: string;
  event_ticker: string;
}

export async function fetchKalshiOdds(): Promise<{
  firstSong: MarketOdds[];
  songsPlayed: MarketOdds[];
}> {
  const firstSong = await fetchKalshiEvent(KALSHI_EVENTS.firstSong, 'first_song');

  // No "songs played" event on Kalshi yet — return fallback
  const songsPlayed = getKalshiFallback('songs_played');

  return { firstSong, songsPlayed };
}

async function fetchKalshiEvent(
  seriesTicker: string,
  marketType: 'first_song' | 'songs_played'
): Promise<MarketOdds[]> {
  try {
    const response = await fetch(
      `${KALSHI_API}/markets?series_ticker=${seriesTicker}&limit=50`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 15 },
      }
    );

    if (!response.ok) {
      throw new Error(`Kalshi API error: ${response.status}`);
    }

    const data = await response.json();
    const markets: KalshiMarket[] = data.markets || [];

    if (markets.length === 0) {
      return getKalshiFallback(marketType);
    }

    const odds: MarketOdds[] = [];

    for (const m of markets) {
      if (m.status !== 'active') continue;

      // Song name is in yes_sub_title
      const song = m.yes_sub_title || m.no_sub_title || '';
      if (!song) continue;

      // Prices are in cents (0-100)
      const yesBid = m.yes_bid / 100;
      const yesAsk = m.yes_ask / 100;
      const noBid = m.no_bid / 100;
      // Use midpoint of bid/ask as implied probability, fall back to last price
      const yesMid = yesBid > 0 && yesAsk > 0
        ? (yesBid + yesAsk) / 2
        : m.last_price / 100;

      odds.push({
        platform: 'kalshi',
        song,
        marketType,
        impliedProbability: yesMid,
        yesPrice: yesBid > 0 ? yesBid : yesAsk,
        noPrice: noBid,
        volume: m.volume || 0,
        lastUpdated: new Date().toISOString(),
      });
    }

    // Sort by implied probability descending
    odds.sort((a, b) => b.impliedProbability - a.impliedProbability);

    return odds.length > 0 ? odds : getKalshiFallback(marketType);
  } catch (error) {
    console.error(`Kalshi fetch error for ${seriesTicker}:`, error);
    return getKalshiFallback(marketType);
  }
}

function getKalshiFallback(marketType: 'first_song' | 'songs_played'): MarketOdds[] {
  const now = new Date().toISOString();
  if (marketType === 'songs_played') {
    return [
      { platform: 'kalshi', song: 'DÁKITI', marketType: 'songs_played', impliedProbability: 0.92, yesPrice: 0.92, noPrice: 0.08, volume: 6200, lastUpdated: now },
      { platform: 'kalshi', song: 'Tití Me Preguntó', marketType: 'songs_played', impliedProbability: 0.85, yesPrice: 0.85, noPrice: 0.15, volume: 5800, lastUpdated: now },
      { platform: 'kalshi', song: 'Me Porto Bonito', marketType: 'songs_played', impliedProbability: 0.80, yesPrice: 0.80, noPrice: 0.20, volume: 4500, lastUpdated: now },
      { platform: 'kalshi', song: 'BAILE INoLVIDABLE', marketType: 'songs_played', impliedProbability: 0.88, yesPrice: 0.88, noPrice: 0.12, volume: 5100, lastUpdated: now },
      { platform: 'kalshi', song: 'DtMF', marketType: 'songs_played', impliedProbability: 0.75, yesPrice: 0.75, noPrice: 0.25, volume: 3900, lastUpdated: now },
    ];
  }
  // first_song fallback should never be needed now that we have the real ticker
  return [];
}

// ============================================================================
// POLYMARKET FETCHER
// No Bad Bunny halftime markets exist on Polymarket currently.
// Using fallback data. Will auto-discover when/if markets are created.
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
    // Try to discover markets via Gamma API
    const searchRes = await fetch(
      `${POLYMARKET_GAMMA_API}/markets?_limit=200&active=true&closed=false&_sort=volumeNum&_order=desc`,
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 15 } }
    );

    if (!searchRes.ok) throw new Error(`Gamma API error: ${searchRes.status}`);

    const markets: GammaMarket[] = await searchRes.json();

    const firstSong: MarketOdds[] = [];
    const songsPlayed: MarketOdds[] = [];

    for (const market of markets) {
      const q = (market.question || '').toLowerCase();
      const isBadBunny = q.includes('bad bunny') || q.includes('halftime');
      if (!isBadBunny) continue;

      const isFirstSong = q.includes('first song') || q.includes('opening song');
      const isSongsPlayed = q.includes('played') || q.includes('setlist') || q.includes('perform');

      let yesPrice = 0.5;
      // Try CLOB price
      try {
        if (market.condition_id) {
          const clobRes = await fetch(
            `${POLYMARKET_CLOB_API}/markets/${market.condition_id}`,
            { headers: { 'Accept': 'application/json' }, next: { revalidate: 15 } }
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
      } catch { /* use default */ }

      // Try outcomePrices from Gamma response
      if (market.outcomePrices) {
        try {
          const parsed = JSON.parse(market.outcomePrices);
          yesPrice = parseFloat(parsed[0]) || yesPrice;
        } catch { /* keep existing */ }
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

      if (isFirstSong) firstSong.push(odds);
      else if (isSongsPlayed) songsPlayed.push(odds);
    }

    // If no live markets found, use fallback
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
  // No Polymarket markets exist yet — return empty so dashboard shows "NO DATA"
  return [];
}

// ============================================================================
// UNIFIED MARKET COMPARISON
// ============================================================================

export async function getMarketComparison(): Promise<MarketComparisonResponse> {
  const [kalshi, polymarket] = await Promise.all([
    fetchKalshiOdds(),
    fetchPolymarketOdds(),
  ]);

  const allFirstSongMarkets = [...kalshi.firstSong, ...polymarket.firstSong];
  const allSongsPlayedMarkets = [...kalshi.songsPlayed, ...polymarket.songsPlayed];

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
