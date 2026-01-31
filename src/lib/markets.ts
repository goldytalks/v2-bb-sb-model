/**
 * BB-SB-MODEL v2 - Market Data Fetchers
 *
 * IMPORTANT: This data is used ONLY for comparison with our model.
 * Market data NEVER influences our probability calculations.
 *
 * Platforms: Kalshi + Polymarket
 * Markets: First Song, Songs Played, Guest Performers
 */

import type { MarketOdds, MarketComparisonResponse, OrderbookSide } from '@/types';
import { findAllEdges } from './model';

// ============================================================================
// API ENDPOINTS & MARKET IDS
// ============================================================================

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com';

// Kalshi event tickers (discovered from live API)
const KALSHI_EVENTS = {
  firstSong: 'KXFIRSTSUPERBOWLSONG',
  // No songs-played or guest-performer events exist on Kalshi yet
};

// Polymarket event slugs (discovered from live site)
const POLYMARKET_EVENTS = {
  firstSong: 'first-song-at-super-bowl-lx-halftime-show',
  guestPerformers: 'who-will-perform-at-super-bowl-halftime-show',
};

// ============================================================================
// HELPERS
// ============================================================================

function makeOrderbookSide(bid: number, ask: number): OrderbookSide {
  const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : Math.max(bid, ask);
  return { bid, ask, mid, spread: ask - bid };
}

function makeSinglePriceSide(price: number): OrderbookSide {
  return { bid: price, ask: price, mid: price, spread: 0 };
}

// ============================================================================
// KALSHI FETCHER
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
  guestPerformers: MarketOdds[];
}> {
  const firstSong = await fetchKalshiEvent(KALSHI_EVENTS.firstSong, 'first_song');

  return {
    firstSong,
    songsPlayed: [],   // No Kalshi market exists
    guestPerformers: [], // No Kalshi market exists
  };
}

async function fetchKalshiEvent(
  seriesTicker: string,
  marketType: 'first_song' | 'songs_played' | 'guest_performer'
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

    if (markets.length === 0) return [];

    const odds: MarketOdds[] = [];

    for (const m of markets) {
      if (m.status !== 'active') continue;

      const song = m.yes_sub_title || m.no_sub_title || '';
      if (!song) continue;

      // Prices are in cents (0-100)
      const yesBid = m.yes_bid / 100;
      const yesAsk = m.yes_ask / 100;
      const noBid = m.no_bid / 100;
      const noAsk = m.no_ask / 100;

      const yes = makeOrderbookSide(yesBid, yesAsk);
      const no = makeOrderbookSide(noBid, noAsk);

      odds.push({
        platform: 'kalshi',
        song,
        marketType,
        impliedProbability: yes.mid > 0 ? yes.mid : m.last_price / 100,
        yes,
        no,
        volume: m.volume || 0,
        lastUpdated: new Date().toISOString(),
      });
    }

    odds.sort((a, b) => b.impliedProbability - a.impliedProbability);
    return odds;
  } catch (error) {
    console.error(`Kalshi fetch error for ${seriesTicker}:`, error);
    return [];
  }
}

// ============================================================================
// POLYMARKET FETCHER
// ============================================================================

interface GammaEvent {
  id: number;
  title: string;
  slug: string;
  markets: GammaMarket[];
}

interface GammaMarket {
  id: string;
  condition_id: string;
  question: string;
  slug: string;
  groupItemTitle?: string;
  outcomePrices?: string;
  volume?: string;
  liquidity?: string;
  active: boolean;
  closed: boolean;
}

export async function fetchPolymarketOdds(): Promise<{
  firstSong: MarketOdds[];
  songsPlayed: MarketOdds[];
  guestPerformers: MarketOdds[];
}> {
  const [firstSong, guestPerformers] = await Promise.all([
    fetchPolymarketEvent(POLYMARKET_EVENTS.firstSong, 'first_song'),
    fetchPolymarketEvent(POLYMARKET_EVENTS.guestPerformers, 'guest_performer'),
  ]);

  return {
    firstSong,
    songsPlayed: [], // No Polymarket market exists for songs played
    guestPerformers,
  };
}

async function fetchPolymarketEvent(
  slug: string,
  marketType: 'first_song' | 'songs_played' | 'guest_performer'
): Promise<MarketOdds[]> {
  try {
    const res = await fetch(
      `${POLYMARKET_GAMMA_API}/events?slug=${slug}`,
      { headers: { 'Accept': 'application/json' }, next: { revalidate: 15 } }
    );

    if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);

    const events: GammaEvent[] = await res.json();
    if (!events.length || !events[0].markets) return [];

    const odds: MarketOdds[] = [];

    for (const market of events[0].markets) {
      if (market.closed || !market.active) continue;

      // Extract name from groupItemTitle or question
      let name = market.groupItemTitle || market.question || market.slug;
      // Clean up long question formats
      if (name.length > 50) {
        // Try to extract the key name from the question
        const match = name.match(/Will (.+?) (?:be |perform|play)/i);
        if (match) name = match[1];
      }

      // Parse outcomePrices: "[yesPrice, noPrice]"
      let yesPrice = 0;
      let noPrice = 0;
      if (market.outcomePrices) {
        try {
          const parsed = JSON.parse(market.outcomePrices);
          yesPrice = parseFloat(parsed[0]) || 0;
          noPrice = parseFloat(parsed[1]) || 0;
        } catch { /* skip */ }
      }

      if (yesPrice === 0 && noPrice === 0) continue;

      const yes = makeSinglePriceSide(yesPrice);
      const no = makeSinglePriceSide(noPrice);
      const volume = parseFloat(market.volume || '0');

      odds.push({
        platform: 'polymarket',
        song: name,
        marketType,
        impliedProbability: yesPrice,
        yes,
        no,
        volume,
        lastUpdated: new Date().toISOString(),
      });
    }

    odds.sort((a, b) => b.impliedProbability - a.impliedProbability);
    return odds;
  } catch (error) {
    console.error(`Polymarket fetch error for ${slug}:`, error);
    return [];
  }
}

// ============================================================================
// UNIFIED MARKET COMPARISON
// ============================================================================

export async function getMarketComparison(): Promise<MarketComparisonResponse> {
  const [kalshi, polymarket] = await Promise.all([
    fetchKalshiOdds(),
    fetchPolymarketOdds(),
  ]);

  const allFirstSong = [...kalshi.firstSong, ...polymarket.firstSong];
  const allSongsPlayed = [...kalshi.songsPlayed, ...polymarket.songsPlayed];
  const allGuestPerformers = [...kalshi.guestPerformers, ...polymarket.guestPerformers];

  const edges = [
    ...findAllEdges(allFirstSong),
    ...findAllEdges(allSongsPlayed),
    ...findAllEdges(allGuestPerformers),
  ];

  return {
    kalshi: {
      firstSong: kalshi.firstSong,
      songsPlayed: kalshi.songsPlayed,
      guestPerformers: kalshi.guestPerformers,
    },
    polymarket: {
      firstSong: polymarket.firstSong,
      songsPlayed: polymarket.songsPlayed,
      guestPerformers: polymarket.guestPerformers,
    },
    lastFetched: new Date().toISOString(),
    edges,
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
