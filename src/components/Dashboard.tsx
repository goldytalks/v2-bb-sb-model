'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import type { PredictionModel, PortfolioAnalysis } from '@/types';

interface DashboardProps {
  model: PredictionModel;
  portfolio: PortfolioAnalysis | null;
  onOpenChat: () => void;
}

export default function Dashboard({ model, portfolio, onOpenChat }: DashboardProps) {
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
      for (let i = 0; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 30) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      const stepX = canvas.width / (data.length - 1);

      ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = i * stepX;
        const y = canvas.height - (v / 100) * canvas.height;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = i * stepX;
        const y = canvas.height - (v / 100) * canvas.height;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
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

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const daysUntil = Math.floor((new Date('2026-02-08').getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));

  const topEdge = model.marketPositions.highConviction[0];
  const tickerContent = [
    `${model.firstSong.predictions[0].song} ${(model.firstSong.predictions[0].probability * 100).toFixed(0)}% ▲`,
    `NUEVAYOL KALSHI: 56% [OVERPRICED]`,
    `BAILE CLOSER: 65%`,
    `CARDI B: 75%`,
    topEdge ? `EDGE: ${topEdge.recommendation} ${topEdge.song} ${topEdge.edge > 0 ? '+' : ''}${(topEdge.edge * 100).toFixed(0)}%` : '',
    `MODEL v${model.meta.version}`,
  ].filter(Boolean).join(' ◆ ');

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Ticker */}
      <div className="bg-gold text-terminal-bg py-3 overflow-hidden border-b-2 border-gold-dark">
        <div className="animate-ticker whitespace-nowrap font-bold">
          {tickerContent} ◆ {tickerContent}
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
            <button className="btn-terminal" style={{ boxShadow: '4px 4px 0 #B8860B' }}>
              EXPORT
            </button>
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

      {/* Markets Grid: Kalshi + Polymarket */}
      <div className="grid grid-cols-2 border-b-2 border-terminal-border">
        {/* Kalshi */}
        <div className="border-r-2 border-terminal-border">
          <div className="bg-gold text-terminal-bg px-4 py-3 font-bold flex justify-between items-center">
            <span>KALSHI_FIRST_SONG</span>
            <LiveDot active />
          </div>
          <div className="p-4 space-y-4">
            {[
              { song: 'NUEVAYOL', market: 56, ours: 20, edge: -36 },
              { song: 'TITÍ ME PREGUNTÓ', market: 26, ours: 28, edge: 2 },
              { song: 'LA MUDANZA', market: 21, ours: 5, edge: -16 },
              { song: 'DÁKITI', market: 13, ours: 12, edge: -1 },
              { song: 'BAILE INOLVIDABLE', market: 11, ours: 12, edge: 1 },
            ].map((item, i) => (
              <MarketRow key={item.song} {...item} highlight={i === 0} />
            ))}
          </div>
        </div>

        {/* Polymarket */}
        <div>
          <div className="bg-terminal-bg-alt text-terminal-fg px-4 py-3 font-bold flex justify-between items-center border-b-2 border-terminal-border">
            <span>POLYMARKET_FIRST_SONG</span>
            <LiveDot active />
          </div>
          <div className="p-4 space-y-4">
            {[
              { song: 'NUEVAYOL', market: 52, ours: 20, edge: -32 },
              { song: 'TITÍ ME PREGUNTÓ', market: 28, ours: 28, edge: 0 },
              { song: 'DÁKITI', market: 10, ours: 12, edge: 2 },
            ].map((item, i) => (
              <MarketRow key={item.song} {...item} highlight={i === 0} />
            ))}
          </div>
        </div>
      </div>

      {/* Market Chart: YES/NO price bars side-by-side with model */}
      <div className="border-b-2 border-terminal-border">
        <div className="bg-gold text-terminal-bg px-4 py-3 font-bold">
          MARKET_PRICES vs MODEL [YES / NO]
        </div>
        <div className="p-4 grid grid-cols-2 gap-6">
          <div>
            <div className="text-terminal-dim text-xs mb-3">KALSHI YES PRICE vs MODEL</div>
            {[
              { song: 'NUEVAYOL', kalshiYes: 56, polyYes: 52, model: 20 },
              { song: 'TITÍ', kalshiYes: 26, polyYes: 28, model: 28 },
              { song: 'DÁKITI', kalshiYes: 13, polyYes: 10, model: 12 },
              { song: 'BAILE', kalshiYes: 11, polyYes: null, model: 12 },
            ].map((item) => (
              <div key={item.song} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>{item.song}</span>
                  <span className="text-gold">MODEL {item.model}%</span>
                </div>
                <div className="flex gap-1 h-5">
                  <div className="relative flex-1 bg-terminal-bg-alt border border-terminal-border overflow-hidden">
                    <div className="h-full bg-gold/60" style={{ width: `${item.kalshiYes}%` }} />
                    <span className="absolute right-1 top-0 text-[10px] leading-5">K:{item.kalshiYes}%</span>
                  </div>
                  <div className="relative flex-1 bg-terminal-bg-alt border border-terminal-border overflow-hidden">
                    <div className="h-full bg-status-success/40" style={{ width: `${item.polyYes || 0}%` }} />
                    <span className="absolute right-1 top-0 text-[10px] leading-5">P:{item.polyYes ?? '—'}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="text-terminal-dim text-xs mb-3">SONGS PLAYED — KALSHI vs POLYMARKET</div>
            {[
              { song: 'DÁKITI', kalshi: 92, poly: 90, model: 95 },
              { song: 'BAILE', kalshi: 88, poly: null, model: 90 },
              { song: 'TITÍ', kalshi: 85, poly: 82, model: 75 },
              { song: 'ME PORTO BONITO', kalshi: 80, poly: 78, model: 85 },
              { song: 'DTMF', kalshi: 75, poly: null, model: 80 },
            ].map((item) => (
              <div key={item.song} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>{item.song}</span>
                  <span className="text-gold">MODEL {item.model}%</span>
                </div>
                <div className="flex gap-1 h-5">
                  <div className="relative flex-1 bg-terminal-bg-alt border border-terminal-border overflow-hidden">
                    <div className="h-full bg-gold/60" style={{ width: `${item.kalshi}%` }} />
                    <span className="absolute right-1 top-0 text-[10px] leading-5">K:{item.kalshi}%</span>
                  </div>
                  <div className="relative flex-1 bg-terminal-bg-alt border border-terminal-border overflow-hidden">
                    <div className="h-full bg-status-success/40" style={{ width: `${item.poly || 0}%` }} />
                    <span className="absolute right-1 top-0 text-[10px] leading-5">P:{item.poly ?? '—'}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manifesto */}
      <div className="p-6 text-2xl font-bold border-b-2 border-terminal-border">
        <span className="text-gold">&gt;</span> MODEL PREDICTION: <span className="text-gold">{model.firstSong.predictions[0].song}</span> TO OPEN<br />
        <span className="text-gold">&gt;</span> CONFIDENCE: <span className="text-status-success">{(model.meta.confidence * 100).toFixed(0)}%</span><br />
        <span className="text-gold">&gt;</span> BIGGEST EDGE: <span className="text-status-danger">BUY NO NUEVAYOL @ 56%</span>
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
        {model.marketPositions.highConviction.slice(0, 3).map((pos) => (
          <TradeCard key={pos.song} {...pos} />
        ))}
        {model.marketPositions.valuePlays.slice(0, 1).map((pos) => (
          <TradeCard key={pos.song} {...pos} />
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
          <span>REFRESH: 60s</span>
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

function TradeCard({ song, ourProbability, marketProbability, platform, edge, recommendation, confidence }: {
  song: string;
  ourProbability: number;
  marketProbability: number;
  platform: string;
  edge: number;
  recommendation: string;
  confidence: string;
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
      <div className="text-terminal-dim text-xs mb-3">{platform}</div>
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
