import { NextResponse } from 'next/server';
import { analyzePortfolio } from '@/lib/portfolio';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const analysis = await analyzePortfolio();

    if (!analysis) {
      return NextResponse.json({
        success: false,
        error: 'Portfolio not available. Set KALSHI_API_KEY and KALSHI_PRIVATE_KEY env vars.',
      });
    }

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}
