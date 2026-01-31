'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import type { PredictionModel, PortfolioAnalysis, MarketComparisonResponse, MarketOdds, EdgeCalculation } from '@/types';

interface DashboardProps {
  model: PredictionModel;
  portfolio: PortfolioAnalysis | null;
  markets: MarketComparisonResponse | null;
  onOpenChat: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

const formatPrice = (price: number): string => {
  if (!price || isNaN(price)) return '—';
  return `${(price * 100).toFixed(1)}¢`;
};

const formatPct = (prob: number): string => {
  if (!prob || isNaN(prob)) return '—';
  return `${(prob * 100).toFixed(0)}%`;
};

function getOurProb(model: PredictionModel, song: string, marketType: string): number | null {
  if (marketType === 'first_song') {
    const p = model.firstSong.predictions.find(s => s.song.toLowerCase() === song.toLowerCase());
    return p ? p.probability : null;
  }
  if (marketType === 'songs_played') {
    const s = model.setlist.primary.find(s => s.song.toLowerCase() === song.toLowerCase());
    return s ? s.inclusionProbability : null;
  }
  if (marketType === 'guest_performer') {
    const g = model.guests.find(g => g.name.toLowerCase() === song.toLowerCase());
    return g ? g.probability : null;
  }
  return null;
}

// ============================================================================
// SIGNAL BADGE (BUY_YES / BUY_NO / NO_EDGE)
// ============================================================================

function SignalBadge({ edge, modelProb, marketProb }: { edge: number; modelProb: number | null; marketProb: number }) {
  if (modelProb === null) return <span className="text-xs text-terminal-dim">—</span>;
  const rawEdge = modelProb - marketProb;
  let direction: string;
  let cls: string;
  if (rawEdge > 0.03) { direction = 'BUY YES'; cls = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'; }
  else if (rawEdge < -0.03) { direction = 'BUY NO'; cls = 'bg-red-500/20 text-red-400 border-red-500/40'; }
  else { direction = 'NO EDGE'; cls = 'bg-zinc-700/30 text-zinc-500 border-zinc-600/30'; }
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${cls}`}>{direction}</span>;
}

// ============================================================================
// KALSHI MARKET ROW — YES/NO orderbook with bid/ask
// ============================================================================

function KalshiMarketRow({ market, modelProb }: { market: MarketOdds; modelProb: number | null }) {
  const rawEdge = modelProb !== null ? modelProb - market.impliedProbability : 0;
  const isNo = rawEdge < -0.03;
  const edgePct = modelProb !== null ? Math.abs(rawEdge) * 100 : 0;
  const hasEdge = modelProb !== null && Math.abs(rawEdge) > 0.03;

  return (
    <tr className={`border-b border-terminal-border/50 ${hasEdge ? 'bg-gold/5' : ''}`}>
      {/* Song name */}
      <td className="py-2 pr-2">
        <div className="font-bold text-sm">{market.song}</div>
      </td>
      {/* YES Orderbook */}
      <td className="py-2 px-1">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">YES</span>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-emerald-400/70 font-mono">{formatPrice(market.yes.bid)}</span>
            <span className="text-terminal-dim">/</span>
            <span className="text-emerald-400 font-mono font-bold">{formatPrice(market.yes.ask)}</span>
          </div>
          <div className="text-[10px] text-terminal-dim font-mono">
            {(market.yes.mid * 100).toFixed(0)}%
          </div>
        </div>
      </td>
      {/* NO Orderbook */}
      <td className="py-2 px-1">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">NO</span>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-red-400/70 font-mono">{formatPrice(market.no.bid)}</span>
            <span className="text-terminal-dim">/</span>
            <span className="text-red-400 font-mono font-bold">{formatPrice(market.no.ask)}</span>
          </div>
          <div className="text-[10px] text-terminal-dim font-mono">
            {(market.no.mid * 100).toFixed(0)}%
          </div>
        </div>
      </td>
      {/* Spread */}
      <td className="py-2 px-1 text-center">
        <div className="text-[10px] text-terminal-dim">spread</div>
        <div className="text-xs font-mono text-terminal-dim">
          {(market.yes.spread * 100).toFixed(0)}¢
        </div>
      </td>
      {/* Model */}
      <td className="py-2 px-2 text-right">
        <div className={`text-[10px] ${isNo ? 'text-red-400/70' : 'text-terminal-dim'}`}>
          {isNo ? 'NO model' : 'model'}
        </div>
        <div className={`font-mono text-sm ${isNo ? 'text-red-400' : ''}`}>
          {modelProb !== null ? (isNo ? formatPct(1 - modelProb) : formatPct(modelProb)) : '—'}
        </div>
      </td>
      {/* Edge */}
      <td className="py-2 px-2 text-right">
        <div className="text-[10px] text-terminal-dim">edge</div>
        <span className={`font-mono text-sm font-bold ${hasEdge ? 'text-emerald-400' : 'text-terminal-dim'}`}>
          {hasEdge ? '+' : ''}{edgePct.toFixed(1)}%
        </span>
      </td>
      {/* Signal */}
      <td className="py-2 pl-2 text-right">
        <SignalBadge edge={rawEdge} modelProb={modelProb} marketProb={market.impliedProbability} />
      </td>
    </tr>
  );
}

// ============================================================================
// POLYMARKET MARKET ROW — YES/NO single price
// ============================================================================

function PolymarketMarketRow({ market, modelProb }: { market: MarketOdds; modelProb: number | null }) {
  const rawEdge = modelProb !== null ? modelProb - market.impliedProbability : 0;
  const isNo = rawEdge < -0.03;
  const edgePct = modelProb !== null ? Math.abs(rawEdge) * 100 : 0;
  const hasEdge = modelProb !== null && Math.abs(rawEdge) > 0.03;

  return (
    <tr className={`border-b border-terminal-border/50 ${hasEdge ? 'bg-purple-500/5' : ''}`}>
      {/* Name */}
      <td className="py-2 pr-2">
        <div className="font-bold text-sm">{market.song}</div>
      </td>
      {/* YES Price */}
      <td className="py-2 px-1">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">YES</span>
          <div className="text-sm font-mono font-bold text-emerald-400">
            {(market.yes.mid * 100).toFixed(0)}¢
          </div>
        </div>
      </td>
      {/* NO Price */}
      <td className="py-2 px-1">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">NO</span>
          <div className="text-sm font-mono font-bold text-red-400">
            {(market.no.mid * 100).toFixed(0)}¢
          </div>
        </div>
      </td>
      {/* Model */}
      <td className="py-2 px-2 text-right">
        <div className={`text-[10px] ${isNo ? 'text-red-400/70' : 'text-terminal-dim'}`}>
          {isNo ? 'NO model' : 'model'}
        </div>
        <div className={`font-mono text-sm ${isNo ? 'text-red-400' : ''}`}>
          {modelProb !== null ? (isNo ? formatPct(1 - modelProb) : formatPct(modelProb)) : '—'}
        </div>
      </td>
      {/* Edge */}
      <td className="py-2 px-2 text-right">
        <div className="text-[10px] text-terminal-dim">edge</div>
        <span className={`font-mono text-sm font-bold ${hasEdge ? 'text-emerald-400' : 'text-terminal-dim'}`}>
          {hasEdge ? '+' : ''}{edgePct.toFixed(1)}%
        </span>
      </td>
      {/* Volume */}
      <td className="py-2 px-1 text-right">
        <div className="text-[10px] text-terminal-dim">vol</div>
        <div className="text-xs text-terminal-dim font-mono">
          {market.volume > 0 ? `$${(market.volume / 1000).toFixed(0)}k` : '—'}
        </div>
      </td>
      {/* Signal */}
      <td className="py-2 pl-1 text-right">
        <SignalBadge edge={rawEdge} modelProb={modelProb} marketProb={market.impliedProbability} />
      </td>
    </tr>
  );
}

// ============================================================================
// MARKET SECTION — one market category with Kalshi + Polymarket tables
// ============================================================================

function MarketSection({
  title,
  kalshiMarkets,
  polymarketMarkets,
  model,
  marketType,
  isLive,
}: {
  title: string;
  kalshiMarkets: MarketOdds[];
  polymarketMarkets: MarketOdds[];
  model: PredictionModel;
  marketType: string;
  isLive: boolean;
}) {
  return (
    <div className="border-b-2 border-terminal-border">
      <div className="bg-gold text-terminal-bg px-4 py-3 font-bold flex justify-between items-center">
        <span>{title}</span>
        <LiveDot active={isLive} />
      </div>
      <div className="grid grid-cols-2">
        {/* Kalshi side */}
        <div className="border-r-2 border-terminal-border p-4">
          <div className="text-terminal-dim text-xs mb-2 font-bold flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 px-1.5 py-0.5 text-[10px]">KALSHI</span>
            <span>{kalshiMarkets.length} markets</span>
          </div>
          {kalshiMarkets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {kalshiMarkets.slice(0, 15).map((m) => (
                    <KalshiMarketRow
                      key={m.song}
                      market={m}
                      modelProb={getOurProb(model, m.song, marketType)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-terminal-dim text-sm py-4">NO KALSHI MARKETS</div>
          )}
        </div>

        {/* Polymarket side */}
        <div className="p-4">
          <div className="text-terminal-dim text-xs mb-2 font-bold flex items-center gap-2">
            <span className="bg-purple-500/20 text-purple-400 border border-purple-500/40 px-1.5 py-0.5 text-[10px]">POLYMARKET</span>
            <span>{polymarketMarkets.length} markets</span>
          </div>
          {polymarketMarkets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {polymarketMarkets.slice(0, 15).map((m) => (
                    <PolymarketMarketRow
                      key={m.song}
                      market={m}
                      modelProb={getOurProb(model, m.song, marketType)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-terminal-dim text-sm py-4">NO POLYMARKET MARKETS</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================

export default function Dashboard({ model, portfolio, markets, onOpenChat }: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Animated graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let data: number[] = [];
    for (let i = 0; i < 100; i++) {
      data.push(50 + Math.sin(i * 0.1) * 20 + (Math.random() - 0.5) * 10);
    }

    const draw = () => {
      const last = data[data.length - 1];
      data.push(Math.max(10, Math.min(90, last + (Math.random() - 0.5) * 5)));
      if (data.length > 100) data.shift();

      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 30) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke(); }
      for (let i = 0; i < canvas.height; i += 30) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke(); }

      const stepX = canvas.width / (data.length - 1);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      data.forEach((v, i) => { const x = i * stepX; const y = canvas.height - (v / 100) * canvas.height; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();

      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      data.forEach((v, i) => { const x = i * stepX; const y = canvas.height - (v / 100) * canvas.height; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();

      const currentVal = data[data.length - 1];
      const currentY = canvas.height - (currentVal / 100) * canvas.height;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(canvas.width - 5, currentY, 6, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(draw);
    };

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = canvas.parentElement?.clientHeight || 300;
    };
    resize();
    window.addEventListener('resize', resize);
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationId); };
  }, []);

  const liveEdges: EdgeCalculation[] = markets?.edges ?? [];
  const topLiveEdge = liveEdges.length > 0 ? liveEdges[0] : model.marketPositions.highConviction[0] ?? null;
  const daysUntil = Math.floor((new Date('2026-02-08').getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
  const isLive = !!markets;

  // Ticker
  const tickerParts = [
    `${model.firstSong.predictions[0].song} ${(model.firstSong.predictions[0].probability * 100).toFixed(0)}%`,
    markets?.kalshi.firstSong[0] ? `KALSHI #1: ${markets.kalshi.firstSong[0].song} ${(markets.kalshi.firstSong[0].impliedProbability * 100).toFixed(0)}%` : null,
    markets?.polymarket.firstSong[0] ? `POLY #1: ${markets.polymarket.firstSong[0].song} ${(markets.polymarket.firstSong[0].impliedProbability * 100).toFixed(0)}%` : null,
    topLiveEdge ? `EDGE: ${topLiveEdge.recommendation.replace('_', ' ')} ${topLiveEdge.song} ${topLiveEdge.edge > 0 ? '+' : ''}${(topLiveEdge.edge * 100).toFixed(0)}%` : null,
    `MODEL v${model.meta.version}`,
    markets ? `UPDATED ${new Date(markets.lastFetched).toLocaleTimeString()}` : null,
  ].filter(Boolean).join(' \u25C6 ');

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Ticker */}
      <div className="bg-gold text-terminal-bg py-3 overflow-hidden border-b-2 border-gold-dark">
        <div className="animate-ticker whitespace-nowrap font-bold">
          {tickerParts} \u25C6 {tickerParts}
        </div>
      </div>

      {/* Header */}
      <header className="grid grid-cols-4 border-b-2 border-terminal-border">
        <div className="col-span-2 bg-gold text-terminal-bg p-4 font-bold text-xl flex items-center gap-3">
          <span>🐰</span>
          <span>BB_HALFTIME v{model.meta.version}</span>
        </div>
        <NavItem active>PREDICTIONS</NavItem>
        <NavItem onClick={onOpenChat}>
          <MessageCircle className="w-4 h-4 mr-2" />
          ASK AI
        </NavItem>
      </header>

      {/* Hero */}
      <div className="grid grid-cols-2 border-b-2 border-terminal-border min-h-[400px]">
        <div className="p-8 border-r-2 border-terminal-border flex flex-col justify-center">
          <div className="text-terminal-dim text-sm mb-4 flex gap-6">
            <span>[EVENT: SUPER_BOWL_LX]</span>
            <span>[DATE: 2026.02.08]</span>
            <span>[{daysUntil}D REMAINING]</span>
          </div>
          <h1 className="text-5xl font-bold leading-none mb-6">
            BAD BUNNY<br />
            <span className="text-gold">HALFTIME_</span><br />
            PREDICTION<br />
            ENGINE
          </h1>
          <p className="text-terminal-dim mb-6 max-w-md">
            FIRST SPANISH-LANGUAGE SOLO HEADLINER. ORIGINAL PROBABILITY MODEL.
            MARKET COMPARISON. EDGE DETECTION.
          </p>
          <div className="flex gap-4">
            <button className="btn-terminal">VIEW MODEL</button>
            <button className="btn-terminal" style={{ boxShadow: '4px 4px 0 #B8860B' }}>EXPORT</button>
          </div>
        </div>
        <div className="relative">
          <canvas ref={canvasRef} className="w-full h-full" />
          <div className="absolute top-4 left-4 bg-terminal-bg/90 border border-terminal-border p-3">
            <div className="text-terminal-dim text-xs">FIRST_SONG_PROB</div>
            <div className="text-gold text-2xl font-bold">
              {(model.firstSong.predictions[0].probability * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* THREE MARKET SECTIONS — YES/NO ORDERBOOKS                         */}
      {/* ================================================================== */}

      {/* 1. FIRST SONG */}
      <MarketSection
        title="FIRST_SONG — What will Bad Bunny open with?"
        kalshiMarkets={markets?.kalshi.firstSong ?? []}
        polymarketMarkets={markets?.polymarket.firstSong ?? []}
        model={model}
        marketType="first_song"
        isLive={isLive}
      />

      {/* 2. SONGS PLAYED */}
      <MarketSection
        title="SONGS_PLAYED — Will this song be performed?"
        kalshiMarkets={markets?.kalshi.songsPlayed ?? []}
        polymarketMarkets={markets?.polymarket.songsPlayed ?? []}
        model={model}
        marketType="songs_played"
        isLive={isLive}
      />

      {/* 3. GUEST PERFORMERS */}
      <MarketSection
        title="GUEST_PERFORMERS — Who will appear on stage?"
        kalshiMarkets={markets?.kalshi.guestPerformers ?? []}
        polymarketMarkets={markets?.polymarket.guestPerformers ?? []}
        model={model}
        marketType="guest_performer"
        isLive={isLive}
      />

      {/* Manifesto */}
      <div className="p-6 text-2xl font-bold border-b-2 border-terminal-border">
        <span className="text-gold">&gt;</span> MODEL PREDICTION: <span className="text-gold">{model.firstSong.predictions[0].song}</span> TO OPEN<br />
        <span className="text-gold">&gt;</span> CONFIDENCE: <span className="text-status-success">{(model.meta.confidence * 100).toFixed(0)}%</span><br />
        <span className="text-gold">&gt;</span> BIGGEST EDGE:{' '}
        {topLiveEdge ? (
          <span className={topLiveEdge.edge > 0 ? 'text-status-success' : 'text-status-danger'}>
            {topLiveEdge.recommendation.replace('_', ' ')} {topLiveEdge.song} @ {(topLiveEdge.marketProbability * 100).toFixed(0)}%
          </span>
        ) : (
          <span className="text-terminal-dim">CALCULATING...</span>
        )}
      </div>

      {/* Setlist + Guests */}
      <div className="grid grid-cols-3 border-b-2 border-terminal-border">
        <div className="col-span-2 border-r-2 border-terminal-border">
          <div className="bg-gold text-terminal-bg px-4 py-3 font-bold">
            PREDICTED_SETLIST [{model.setlist.primary.length} SONGS / 13:30]
          </div>
          <div className="grid grid-cols-4">
            {model.setlist.primary.map((song) => (
              <SetlistCard key={song.position} {...song} />
            ))}
          </div>
        </div>
        <div>
          <div className="bg-terminal-bg-alt px-4 py-3 font-bold border-b-2 border-terminal-border">
            GUEST_APPEARANCES
          </div>
          <div className="p-4 space-y-3">
            {model.guests.slice(0, 5).map((guest) => (
              <GuestRow key={guest.name} {...guest} />
            ))}
          </div>
        </div>
      </div>

      {/* Trade Cards */}
      <div className="grid grid-cols-4 border-b-2 border-terminal-border">
        {(liveEdges.length > 0
          ? liveEdges.filter(e => e.recommendation !== 'HOLD').slice(0, 4)
          : [...model.marketPositions.highConviction.slice(0, 3), ...model.marketPositions.valuePlays.slice(0, 1)]
        ).map((pos) => (
          <TradeCard key={`${pos.song}-${pos.platform}-${pos.marketType}`} {...pos} />
        ))}
      </div>

      {/* Portfolio Section */}
      {portfolio && (
        <div className="border-b-2 border-terminal-border">
          <div className="bg-gold text-terminal-bg px-4 py-3 font-bold flex justify-between">
            <span>KALSHI_PORTFOLIO</span>
            <span>BALANCE: ${portfolio.portfolio.balance.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2">
            <div className="p-4 border-r-2 border-terminal-border">
              <div className="text-terminal-dim text-xs mb-3">POSITIONS</div>
              {portfolio.portfolio.positions.length === 0 ? (
                <div className="text-terminal-dim text-sm">NO SB POSITIONS</div>
              ) : (
                portfolio.portfolio.positions.map((pos) => (
                  <div key={pos.ticker} className="mb-3 border-b border-terminal-border pb-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold">{pos.title}</span>
                      <span className={pos.unrealizedPnl >= 0 ? 'text-status-success' : 'text-status-danger'}>
                        {pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-terminal-dim">
                      <span>{pos.side.toUpperCase()} x{pos.quantity} @ {(pos.avgPrice * 100).toFixed(0)}¢</span>
                      <span>NOW {(pos.currentPrice * 100).toFixed(0)}¢</span>
                    </div>
                  </div>
                ))
              )}
              <div className="mt-3 pt-2 border-t border-terminal-border flex justify-between font-bold">
                <span>UNREALIZED P&L</span>
                <span className={portfolio.portfolio.totalUnrealizedPnl >= 0 ? 'text-status-success' : 'text-status-danger'}>
                  ${portfolio.portfolio.totalUnrealizedPnl.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="text-terminal-dim text-xs mb-3">RECOMMENDATIONS</div>
              {portfolio.recommendations.map((rec) => (
                <div key={rec.position.ticker} className="mb-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-bold">{rec.position.title}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold ${
                      rec.action === 'CLOSE' ? 'bg-status-danger text-terminal-bg' :
                      rec.action === 'INCREASE' ? 'bg-status-success text-terminal-bg' :
                      'bg-terminal-border text-terminal-fg'
                    }`}>{rec.action}</span>
                  </div>
                  <div className="text-terminal-dim text-xs">{rec.reasoning}</div>
                </div>
              ))}
              {portfolio.missedOpportunities.length > 0 && (
                <>
                  <div className="text-terminal-dim text-xs mt-4 mb-2">MISSED OPPORTUNITIES</div>
                  {portfolio.missedOpportunities.map((opp) => (
                    <div key={opp.song} className="text-sm mb-1">
                      <span className="text-gold">{opp.song}</span>
                      <span className="text-terminal-dim ml-2">{opp.recommendation}</span>
                      <span className={`ml-2 ${opp.edge > 0 ? 'text-status-success' : 'text-status-danger'}`}>
                        {opp.edge > 0 ? '+' : ''}{(opp.edge * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gold text-terminal-bg px-6 py-4 flex justify-between font-bold">
        <div className="flex gap-8">
          <span>TERMINAL_ID: BB_SB60_001</span>
          <span>SESSION: {currentTime.toISOString().split('T')[0]}</span>
        </div>
        <div className="flex gap-8">
          <span>REFRESH: 15s</span>
          <span>{currentTime.toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function NavItem({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <div
      className={`border-l-2 border-terminal-border flex items-center justify-center font-bold cursor-pointer transition-all ${
        active ? 'bg-gold text-terminal-bg' : 'hover:bg-gold-dark hover:text-terminal-bg'
      }`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function LiveDot({ active }: { active?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`live-dot ${active ? 'active' : 'cached'}`} />
      <span className={active ? 'text-terminal-bg' : 'text-terminal-dim'}>{active ? 'LIVE' : 'CACHED'}</span>
    </div>
  );
}

function SetlistCard({ position, song, guest, inclusionProbability }: { position: number; song: string; guest: string | null; inclusionProbability: number }) {
  const isLock = inclusionProbability >= 0.9;
  return (
    <div className="p-4 border-r border-b border-terminal-border relative">
      <div className="absolute top-2 left-2 bg-gold text-terminal-bg w-5 h-5 flex items-center justify-center text-xs font-bold">
        {position}
      </div>
      <div className="pt-5">
        <div className={`font-bold text-sm ${isLock ? 'text-gold' : ''}`}>{song}</div>
        {guest && <div className="text-gold-light text-xs mt-1">ft. {guest}</div>}
        <div className={`text-xs mt-1 ${isLock ? 'text-status-success' : inclusionProbability >= 0.7 ? 'text-gold' : 'text-terminal-dim'}`}>
          {(inclusionProbability * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

function GuestRow({ name, probability, associatedSong }: { name: string; probability: number; associatedSong: string | null }) {
  const isLikely = probability >= 0.6;
  return (
    <div>
      <div className="flex justify-between mb-1 text-sm">
        <div>
          <span className={isLikely ? 'text-gold font-bold' : ''}>{name}</span>
          {associatedSong && <span className="text-terminal-dim text-xs ml-2">[{associatedSong}]</span>}
        </div>
        <span className={isLikely ? 'text-status-success' : probability >= 0.4 ? 'text-gold' : 'text-terminal-dim'}>
          {(probability * 100).toFixed(0)}%
        </span>
      </div>
      <div className="probability-bar h-4">
        <div
          className="probability-bar-fill"
          style={{
            width: `${probability * 100}%`,
            background: isLikely ? 'linear-gradient(90deg, #00aa55, #00FF88)' : 'linear-gradient(90deg, #666, #999)'
          }}
        />
      </div>
    </div>
  );
}

function TradeCard({ song, ourProbability, marketProbability, platform, edge, recommendation, confidence, marketType }: {
  song: string;
  ourProbability: number;
  marketProbability: number;
  platform: string;
  edge: number;
  recommendation: string;
  confidence: string;
  marketType?: string;
}) {
  const isBuyYes = recommendation === 'BUY_YES';
  const isBuyNo = recommendation === 'BUY_NO';
  const bgClass = isBuyYes ? 'trade-card buy-yes' : isBuyNo ? 'trade-card buy-no' : 'trade-card hold';

  return (
    <div className={bgClass}>
      <div className={`inline-block px-2 py-1 text-xs font-bold mb-2 ${
        isBuyYes ? 'bg-status-success text-terminal-bg' :
        isBuyNo ? 'bg-status-danger text-terminal-bg' :
        'bg-terminal-border text-terminal-fg'
      }`}>
        {recommendation.replace('_', ' ')}
      </div>
      <div className="font-bold text-sm">{song}</div>
      <div className="text-terminal-dim text-xs mb-1">{platform}</div>
      {marketType && <div className="text-terminal-dim text-[10px] mb-2">{marketType.replace('_', ' ').toUpperCase()}</div>}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <div className="text-terminal-dim">MARKET</div>
          <div className="font-bold">{(marketProbability * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-terminal-dim">OURS</div>
          <div className="font-bold">{(ourProbability * 100).toFixed(0)}%</div>
        </div>
      </div>
      <div className="pt-2 border-t border-terminal-border flex justify-between items-center">
        <span className={`text-xl font-bold ${edge > 0 ? 'text-status-success' : edge < 0 ? 'text-status-danger' : 'text-terminal-dim'}`}>
          {edge > 0 ? '+' : ''}{(edge * 100).toFixed(0)}%
        </span>
        <span className="text-terminal-dim text-xs">{confidence.toUpperCase()}</span>
      </div>
    </div>
  );
}
