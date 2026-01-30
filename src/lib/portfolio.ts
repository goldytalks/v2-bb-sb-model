/**
 * Kalshi Portfolio Integration
 *
 * Fetches user's Kalshi positions and compares against model edges.
 */

import type { KalshiPortfolio, KalshiPosition, PortfolioAnalysis } from '@/types';
import { kalshiAuthFetch } from './kalshi-auth';
import { findAllEdges } from './model';
import { fetchKalshiOdds } from './markets';

export async function fetchKalshiPortfolio(): Promise<KalshiPortfolio | null> {
  try {
    const [balanceRes, positionsRes] = await Promise.all([
      kalshiAuthFetch('/portfolio/balance'),
      kalshiAuthFetch('/portfolio/positions'),
    ]);

    if (!balanceRes || !positionsRes) return null;
    if (!balanceRes.ok || !positionsRes.ok) return null;

    const balanceData = await balanceRes.json();
    const positionsData = await positionsRes.json();

    const positions: KalshiPosition[] = (positionsData.market_positions || [])
      .filter((p: Record<string, unknown>) => {
        const ticker = (p.ticker as string) || '';
        return ticker.includes('SBLX') || ticker.includes('BADBUNNY') || ticker.includes('SB-');
      })
      .map((p: Record<string, unknown>) => ({
        ticker: p.ticker as string,
        title: (p.title as string) || (p.ticker as string),
        side: (p.position as number) > 0 ? 'yes' : 'no',
        quantity: Math.abs(p.position as number),
        avgPrice: ((p.average_price as number) || 0) / 100,
        currentPrice: ((p.market_price as number) || 0) / 100,
        unrealizedPnl: ((p.unrealized_pnl as number) || 0) / 100,
      }));

    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

    return {
      balance: (balanceData.balance || 0) / 100,
      positions,
      totalUnrealizedPnl,
    };
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return null;
  }
}

export async function analyzePortfolio(): Promise<PortfolioAnalysis | null> {
  const portfolio = await fetchKalshiPortfolio();
  if (!portfolio) return null;

  const { firstSong } = await fetchKalshiOdds();
  const edges = findAllEdges([...firstSong]);

  const recommendations = portfolio.positions.map((position) => {
    const matchingEdge = edges.find(
      (e) => position.ticker.toLowerCase().includes(e.song.toLowerCase().replace(/\s+/g, ''))
    );

    const modelEdge = matchingEdge?.edge || 0;
    let action: 'HOLD' | 'CLOSE' | 'INCREASE';
    let reasoning: string;

    if (position.side === 'yes' && modelEdge < -0.10) {
      action = 'CLOSE';
      reasoning = `Model sees ${(modelEdge * 100).toFixed(0)}% negative edge — overpriced`;
    } else if (position.side === 'no' && modelEdge > 0.10) {
      action = 'CLOSE';
      reasoning = `Model sees ${(modelEdge * 100).toFixed(0)}% positive edge — underpriced`;
    } else if (Math.abs(modelEdge) > 0.15) {
      action = 'INCREASE';
      reasoning = `Strong ${(modelEdge * 100).toFixed(0)}% edge supports this position`;
    } else {
      action = 'HOLD';
      reasoning = 'Position aligns with model within tolerance';
    }

    return { position, modelEdge, action, reasoning };
  });

  const heldTickers = portfolio.positions.map((p) => p.ticker.toLowerCase());
  const missedOpportunities = edges
    .filter((e) => Math.abs(e.edge) > 0.10)
    .filter((e) => !heldTickers.some((t) => t.includes(e.song.toLowerCase().replace(/\s+/g, ''))))
    .map((e) => ({
      song: e.song,
      edge: e.edge,
      recommendation: e.recommendation as 'BUY_YES' | 'BUY_NO',
    }))
    .filter((e) => e.recommendation !== 'HOLD' as string);

  return { portfolio, recommendations, missedOpportunities };
}
