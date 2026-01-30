import { NextResponse } from 'next/server';
import { getMarketComparison } from '@/lib/markets';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const comparison = await getMarketComparison();

    return NextResponse.json({
      success: true,
      data: comparison,
      note: 'Market data is for COMPARISON only. Our model probabilities are calculated independently.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Markets API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
