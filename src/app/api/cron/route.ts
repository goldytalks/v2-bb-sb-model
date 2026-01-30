import { NextRequest, NextResponse } from 'next/server';
import { getMarketComparison } from '@/lib/markets';
import { findAllEdges, getModel } from '@/lib/model';

export const dynamic = 'force-dynamic';

/**
 * Cron endpoint for hourly market comparison updates
 * Called by Vercel Cron - see vercel.json
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch latest market data
    const marketData = await getMarketComparison();

    // Calculate edges
    const model = getModel();
    const allMarkets = [
      ...marketData.kalshi.firstSong,
      ...marketData.polymarket.firstSong,
      ...marketData.fanduel.firstSong,
    ];
    const edges = findAllEdges(allMarkets);

    // Find significant edge changes (could trigger alerts)
    const significantEdges = edges.filter(e => Math.abs(e.edge) > 0.15);

    // Log for monitoring
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
