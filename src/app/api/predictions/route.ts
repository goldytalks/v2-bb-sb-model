import { NextResponse } from 'next/server';
import { getModel } from '@/lib/model';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const model = getModel();

    return NextResponse.json({
      success: true,
      data: model,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Predictions API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}
