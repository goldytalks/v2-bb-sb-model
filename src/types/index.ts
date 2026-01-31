// ============================================================================
// CORE MODEL TYPES
// ============================================================================

export type MarketType = 'first_song' | 'songs_played' | 'guest_performer';

export interface SongPrediction {
  rank: number;
  song: string;
  album: string;
  probability: number;
  confidence: 'low' | 'medium' | 'high' | 'very_high';
  reasoning: string;
  factors: {
    streaming: number;      // 0-100 score
    concert: number;        // 0-100 score
    sbSuitability: number;  // 0-100 score
    cultural: number;       // 0-100 score
    albumPush: number;      // 0-100 score
  };
}

export interface OrderbookSide {
  bid: number;
  ask: number;
  mid: number;
  spread: number;
}

export interface MarketOdds {
  platform: 'kalshi' | 'polymarket';
  song: string;
  marketType: MarketType;
  impliedProbability: number;
  yes: OrderbookSide;
  no: OrderbookSide;
  volume: number;
  lastUpdated: string;
}

export interface EdgeCalculation {
  song: string;
  ourProbability: number;
  marketProbability: number;
  platform: string;
  marketType: MarketType;
  edge: number;  // ourProb - marketProb
  recommendation: 'BUY_YES' | 'BUY_NO' | 'HOLD';
  confidence: 'low' | 'medium' | 'high' | 'very_high';
}

export interface SetlistPrediction {
  position: number;
  song: string;
  album: string;
  runtime: string;
  guest: string | null;
  function: 'opener' | 'hit_medley' | 'guest_feature' | 'cultural_statement' | 'emotional_peak' | 'climax' | 'closer';
  inclusionProbability: number;
}

export interface GuestPrediction {
  name: string;
  probability: number;
  associatedSong: string | null;
  marketOdds?: {
    platform: string;
    impliedProbability: number;
  };
  reasoning: string;
}

export interface Intelligence {
  id: string;
  timestamp: string;
  type: 'rehearsal' | 'interview' | 'guest_sighting' | 'production' | 'market' | 'other';
  source: string;
  content: string;
  impact: string;
  confidence: 'low' | 'medium' | 'high';
  processed: boolean;
  adjustments?: {
    song: string;
    field: string;
    oldValue: number;
    newValue: number;
  }[];
}

export interface ModelMeta {
  version: string;
  lastUpdated: string;
  lastCalibration: string;
  dataSourcesUpdated: {
    streaming: string;
    concerts: string;
    markets: string;
  };
  confidence: number;  // Overall model confidence 0-1
}

// ============================================================================
// KALSHI PORTFOLIO TYPES
// ============================================================================

export interface KalshiPosition {
  ticker: string;
  title: string;
  side: 'yes' | 'no';
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
}

export interface KalshiPortfolio {
  balance: number;
  positions: KalshiPosition[];
  totalUnrealizedPnl: number;
}

export interface PortfolioAnalysis {
  portfolio: KalshiPortfolio;
  recommendations: {
    position: KalshiPosition;
    modelEdge: number;
    action: 'HOLD' | 'CLOSE' | 'INCREASE';
    reasoning: string;
  }[];
  missedOpportunities: {
    song: string;
    edge: number;
    recommendation: 'BUY_YES' | 'BUY_NO';
  }[];
}

// ============================================================================
// FULL MODEL STATE
// ============================================================================

export interface PredictionModel {
  meta: ModelMeta;
  firstSong: {
    predictions: SongPrediction[];
    marketInefficiency: {
      mostOverpriced: EdgeCalculation | null;
      mostUnderpriced: EdgeCalculation | null;
    };
  };
  lastSong: {
    predictions: SongPrediction[];
  };
  setlist: {
    primary: SetlistPrediction[];
    alternate: {
      scenario: string;
      trigger: string;
      changes: { position: number; from: string; to: string }[];
    };
    songTiers: {
      locks: string[];
      veryLikely: string[];
      likely: string[];
      possible: string[];
      unlikely: string[];
    };
  };
  guests: GuestPrediction[];
  marketPositions: {
    highConviction: EdgeCalculation[];
    valuePlays: EdgeCalculation[];
    arbitrage: {
      opportunity: string;
      kalshiImplied: number;
      otherImplied: number;
      spread: number;
      recommendation: string;
    } | null;
  };
  intelligence: Intelligence[];
  updateLog: {
    date: string;
    version: string;
    changes: string;
    author: string;
  }[];
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
  sources?: string[];
  confidence?: number;
}

export interface UpdateRequest {
  song: string;
  betType: 'first_song' | 'last_song' | 'setlist' | 'guest';
  newProbability?: number;
  reasoning?: string;
  intelType?: Intelligence['type'];
  intelContent?: string;
  intelSource?: string;
}

export interface MarketComparisonResponse {
  kalshi: {
    firstSong: MarketOdds[];
    songsPlayed: MarketOdds[];
    guestPerformers: MarketOdds[];
  };
  polymarket: {
    firstSong: MarketOdds[];
    songsPlayed: MarketOdds[];
    guestPerformers: MarketOdds[];
  };
  lastFetched: string;
  edges: EdgeCalculation[];
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface DashboardProps {
  initialData?: PredictionModel;
}

export interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ProbabilityBarProps {
  percentage: number;
  label?: string;
  color?: string;
  showValue?: boolean;
  animate?: boolean;
}

export interface TradeCardProps {
  action: 'BUY_YES' | 'BUY_NO' | 'HOLD';
  platform: string;
  bet: string;
  marketPrice: string;
  fairValue: string;
  edge: string;
  confidence: string;
}
