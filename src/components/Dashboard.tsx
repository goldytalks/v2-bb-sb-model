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

// Helper: find our model probability for a song (first_song predictions or setlist inclusion)
function getOurProb(model: PredictionModel, song: string, marketType: 'first_song' | 'songs_played'): number | null {
  if (marketType === 'first_song') {
    const p = model.firstSong.predictions.find(
      s => s.song.toLowerCase() === song.toLowerCase()
    );
    return p ? p.probability : null;
  }
  const s = model.setlist.primary.find(
    s => s.song.toLowerCase() === song.toLowerCase()
  );
  return s ? s.inclusionProbability : null;
}

// Helper: build rows from live MarketOdds[] + model
function buildMarketRows(odds: MarketOdds[], model: PredictionModel) {
  return odds.map(o => {
    const ourProb = getOurProb(model, o.song, o.marketType);
    const marketPct = Math.round(o.impliedProbability * 100);
    const ourPct = ourProb !== null ? Math.round(ourProb * 100) : null;
    const edge = ourPct !== null ? ourPct - marketPct : null;
    return {
      song: o.song.toUpperCase(),
      market: marketPct,
      ours: ourPct ?? 0,
      edge: edge ?? 0,
      yesPrice: o.yesPrice ?? o.impliedProbability,
      noPrice: o.noPrice ?? (1 - o.impliedProbability),
      volume: o.volume ?? 0,
    };
  }).sort((a, b) => b.market - a.market);
}

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

  // Derive live market rows from API data
  const kalshiFirstSong = useMemo(() => markets ? buildMarketRows(markets.kalshi.firstSong, model) : [], [markets, model]);
  const kalshiSongsPlayed = useMemo(() => markets ? buildMarketRows(markets.kalshi.songsPlayed, model) : [], [markets, model]);
  const polyFirstSong = useMemo(() => markets ? buildMarketRows(markets.polymarket.firstSong, model) : [], [markets, model]);
  const polySongsPlayed = useMemo(() => markets ? buildMarketRows(markets.polymarket.songsPlayed, model) : [], [markets, model]);
  const liveEdges: EdgeCalculation[] = markets?.edges ?? [];

  // Build combined chart data: merge Kalshi + Polymarket for each song (first_song)
  const firstSongChartData = useMemo(() => {
    const songMap = new Map<string, { song: string; kalshiYes: number | null; polyYes: number | null; model: number }>();
    for (const row of kalshiFirstSong) {
      const key = row.song;
      const existing = songMap.get(key) || { song: key, kalshiYes: null, polyYes: null, model: row.ours };
      existing.kalshiYes = row.market;
      existing.model = row.ours;
      songMap.set(key, existing);
    }
    for (const row of polyFirstSong) {
      const key = row.song;
      const existing = songMap.get(key) || { song: key, kalshiYes: null, polyYes: null, model: row.ours };
      existing.polyYes = row.market;
      if (!existing.model) existing.model = row.ours;
      songMap.set(key, existing);
    }
    return Array.from(songMap.values()).sort((a, b) => (b.kalshiYes ?? b.polyYes ?? 0) - (a.kalshiYes ?? a.polyYes ?? 0));
  }, [kalshiFirstSong, polyFirstSong]);

  // Songs played chart data
  const songsPlayedChartData = useMemo(() => {
    const songMap = new Map<string, { song: string; kalshi: number | null; poly: number | null; model: number }>();
    for (const row of kalshiSongsPlayed) {
      const key = row.song;
      const existing = songMap.get(key) || { song: key, kalshi: null, poly: null, model: row.ours };
      existing.kalshi = row.market;
      existing.model = row.ours;
      songMap.set(key, existing);
    }
    for (const row of polySongsPlayed) {
      const key = row.song;
      const existing = songMap.get(key) || { song: key, kalshi: null, poly: null, model: row.ours };
      existing.poly = row.market;
      if (!existing.model) existing.model = row.ours;
      songMap.set(key, existing);
    }
    return Array.from(songMap.values()).sort((a, b) => (b.kalshi ?? b.poly ?? 0) - (a.kalshi ?? a.poly ?? 0));
  }, [kalshiSongsPlayed, polySongsPlayed]);

  // Top edge from live data
  const topLiveEdge = liveEdges.length > 0 ? liveEdges[0] : model.marketPositions.highConviction[0] ?? null;

  const daysUntil = Math.floor((new Date('2026-02-08').getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));

  // Dynamic ticker from live data
  const tickerParts = [
    `${model.firstSong.predictions[0].song} ${(model.firstSong.predictions[0].probability * 100).toFixed(0)}% ▲`,
    kalshiFirstSong[0] ? `${kalshiFirstSong[0].song} KALSHI: ${kalshiFirstSong[0].market}%${kalshiFirstSong[0].edge < -10 ? ' [OVERPRICED]' : ''}` : null,
    `BAILE CLOSER: ${(model.lastSong.predictions[0].probability * 100).toFixed(0)}%`,
    `CARDI B: ${(model.guests[0].probability * 100).toFixed(0)}%`,
    topLiveEdge ? `EDGE: ${topLiveEdge.recommendation.replace('_', ' ')} ${topLiveEdge.song} ${topLiveEdge.edge > 0 ? '+' : ''}${(topLiveEdge.edge * 100).toFixed(0)}%` : null,
    `MODEL v${model.meta.version}`,
    markets ? `UPDATED ${new Date(markets.lastFetched).toLocaleTimeString()}` : null,
  ].filter(Boolean).join(' ◆ ');

  const isLive = !!markets;

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Ticker */}
      <div className="bg-gold text-terminal-bg py-3 overflow-hidden border-b-2 border-gold-dark">
        <div className="animate-ticker whitespace-nowrap font-bold">
          {tickerParts} ◆ {tickerParts}
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

      {/* Markets Grid: Kalshi + Polymarket — LIVE DATA */}
      <div className="grid grid-cols-2 border-b-2 border-terminal-border">
        {/* Kalshi First Song */}
        <div className="border-r-2 border-terminal-border">
          <div className="bg-gold text-terminal-bg px-4 py-3 font-bold flex justify-between items-center">
            <span>KALSHI_FIRST_SONG</span>
            <LiveDot active={isLive} />
          </div>
          <div className="p-4 space-y-4">
            {kalshiFirstSong.length > 0 ? kalshiFirstSong.map((item, i) => (
              <MarketRow key={item.song} {...item} highlight={i === 0} />
            )) : (
              <div className="text-terminal-dim text-sm">LOADING KALSHI DATA...</div>
            )}
          </div>
        </div>

        {/* Polymarket First Song */}
        <div>
          <div className="bg-terminal-bg-alt text-terminal-fg px-4 py-3 font-bold flex justify-between items-center border-b-2 border-terminal-border">
            <span>POLYMARKET_FIRST_SONG</span>
            <LiveDot active={isLive} />
          </div>
          <div className="p-4 space-y-4">
            {polyFirstSong.length > 0 ? polyFirstSong.map((item, i) => (
              <MarketRow key={item.song} {...item} highlight={i === 0} />
            )) : (
              <div className="text-terminal-dim text-sm">LOADING POLYMARKET DATA...</div>
            )}
          </div>
        </div>
      </div>

      {/* Market Chart: YES/NO price bars side-by-side with model — LIVE DATA */}
      <div className="border-b-2 border-terminal-border">
        <div className="bg-gold text-terminal-bg px-4 py-3 font-bold flex justify-between items-center">
          <span>MARKET_PRICES vs MODEL [YES / NO]</span>
          {markets && <span className="text-xs font-normal">LAST UPDATE: {new Date(markets.lastFetched).toLocaleTimeString()}</span>}
        </div>
        <div className="p-4 grid grid-cols-2 gap-6">
          <div>
            <div className="text-terminal-dim text-xs mb-3">FIRST SONG — KALSHI vs POLYMARKET vs MODEL</div>
            {firstSongChartData.map((item) => (
              <div key={item.song} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>{item.song}</span>
                  <span className="text-gold">MODEL {item.model}%</span>
                </div>
                <div className="flex gap-1 h-5">
                  <div className="relative flex-1 bg-terminal-bg-alt border border-terminal-border overflow-hidden">
                    <div className="h-full bg-gold/60" style={{ width: `${item.kalshiYes ?? 0}%` }} />
                    <span className="absolute right-1 top-0 text-[10px] leading-5">K:{item.kalshiYes ?? '—'}%</span>
                  </div>
                  <div className="relative flex-1 bg-terminal-bg-alt border border-terminal-border overflow-hidden">
                    <div className="h-full bg-status-success/40" style={{ width: `${item.polyYes ?? 0}%` }} />
                    <span className="absolute right-1 top-0 text-[10px] leading-5">P:{item.polyYes ?? '—'}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-terminal-dim text-xs mb-3">SONGS PLAYED — KALSHI vs POLYMARKET vs MODEL</div>
            {songsPlayedChartData.map((item) => (
              <div key={item.song} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>{item.song}</span>
                  <span className="text-gold">MODEL {item.model}%</span>
                </div>
                <div className="flex gap-1 h-5">
                  <div className="relative flex-1 bg-terminal-bg-alt border border-terminal-border overflow-hidden">
                    <div className="h-full bg-gold/60" style={{ width: `${item.kalshi ?? 0}%` }} />
                    <span className="absolute right-1 top-0 text-[10px] leading-5">K:{item.kalshi ?? '—'}%</span>
                  </div>
                  <div className="relative flex-1 bg-terminal-bg-alt border border-terminal-border overflow-hidden">
                    <div className="h-full bg-status-success/40" style={{ width: `${item.poly ?? 0}%` }} />
                    <span className="absolute right-1 top-0 text-[10px] leading-5">P:{item.poly ?? '—'}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manifesto — LIVE DATA */}
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

      {/* Trade Cards — from live edges */}
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

// Sub-components
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

function MarketRow({ song, market, ours, edge, highlight }: { song: string; market: number; ours: number; edge: number; highlight?: boolean }) {
  return (
    <div>
      <div className="flex justify-between mb-1 text-sm">
        <span className={highlight ? 'text-gold' : ''}>{highlight && '► '}{song}</span>
        <div className="flex gap-4">
          <span className="text-gold font-bold">{market}%</span>
          <span className="text-terminal-dim">{ours}%</span>
          <span className={edge > 0 ? 'text-status-success' : edge < 0 ? 'text-status-danger' : 'text-terminal-dim'}>
            {edge > 0 ? '+' : ''}{edge}%
          </span>
        </div>
      </div>
      <div className="probability-bar">
        <div className="probability-bar-fill" style={{ width: `${market}%` }} />
      </div>
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
