import { NextRequest, NextResponse } from 'next/server';
import { getMarketComparison } from '@/lib/markets';
import { findAllEdges, getModel } from '@/lib/model';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint for market comparison updates
 * Called by Vercel Cron - see vercel.json
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const marketData = await getMarketComparison();

    const allMarkets = [
      ...marketData.kalshi.firstSong,
      ...marketData.kalshi.songsPlayed,
      ...marketData.kalshi.guestPerformers,
      ...marketData.polymarket.firstSong,
      ...marketData.polymarket.songsPlayed,
      ...marketData.polymarket.guestPerformers,
    ];
    const edges = findAllEdges(allMarkets);

    const significantEdges = edges.filter(e => Math.abs(e.edge) > 0.15);

    console.log(`[CRON] Market update complete. Found ${significantEdges.length} significant edges.`);

    return NextResponse.json({
      success: true,
      message: 'Market comparison updated',
      stats: {
        marketsChecked: allMarkets.length,
        edgesCalculated: edges.length,
        significantEdges: significantEdges.length,
        topEdge: significantEdges[0] || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { success: false, error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
