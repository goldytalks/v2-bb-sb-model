/**
 * BB-SB-MODEL v2 - AI Chatbot Engine
 *
 * Uses Groq (Llama 3.1) for fast inference
 * Answers questions about our prediction model
 */

import Groq from 'groq-sdk';
import type { ChatMessage, ChatResponse } from '@/types';
import { getModel, getTopEdge, getFirstSongPredictions, getSetlist, getGuests, getMarketPositions } from './model';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

function getSystemPrompt(): string {
  const model = getModel();
  const topEdge = getTopEdge();

  return `You are the AI assistant for the Bad Bunny Super Bowl LX Halftime Show Prediction Model v${model.meta.version}.

## Your Role
You answer questions about our prediction model for Bad Bunny's Super Bowl LX halftime performance on February 8, 2026. You have access to the full model data and can explain probabilities, reasoning, and betting edges.

## Key Principles
1. OUR MODEL is the source of truth - we generate original probabilities
2. Market data (Kalshi, Polymarket, FanDuel) is used ONLY for comparison
3. We NEVER adjust our probabilities based on market movements
4. Edge = Our Probability - Market Probability

## Current Model Summary
- Model Version: ${model.meta.version}
- Last Updated: ${model.meta.lastUpdated}
- Overall Confidence: ${(model.meta.confidence * 100).toFixed(0)}%

## First Song Predictions
${model.firstSong.predictions.map((p, i) => `${i + 1}. ${p.song}: ${(p.probability * 100).toFixed(1)}% (${p.confidence} confidence)`).join('\n')}

## Top Betting Edge
${topEdge ? `${topEdge.recommendation} ${topEdge.song} on ${topEdge.platform}: ${topEdge.edge > 0 ? '+' : ''}${(topEdge.edge * 100).toFixed(1)}% edge` : 'No significant edges detected'}

## Setlist Prediction (8 songs)
${model.setlist.primary.map(s => `${s.position}. ${s.song}${s.guest ? ` ft. ${s.guest}` : ''} (${(s.inclusionProbability * 100).toFixed(0)}%)`).join('\n')}

## Guest Appearance Probabilities
${model.guests.map(g => `- ${g.name}: ${(g.probability * 100).toFixed(0)}%`).join('\n')}

## High Conviction Trades
${model.marketPositions.highConviction.map(e => `- ${e.recommendation} ${e.song} (${e.platform}): ${(e.edge * 100).toFixed(1)}% edge`).join('\n')}

## Methodology
Our probabilities are calculated using a weighted factor model:
- Streaming Data: 20% weight
- Concert Frequency: 15% weight
- Super Bowl Suitability: 25% weight
- Cultural Significance: 20% weight
- Current Album Push: 20% weight

## Response Guidelines
- Be concise and direct
- Always cite specific probabilities from our model
- When discussing edges, clarify that positive = underpriced (BUY) and negative = overpriced (SELL)
- If asked about methodology, explain our factor-based approach
- If asked about market data, clarify it's for comparison only
- Use uppercase for song titles
- Include confidence levels when relevant`;
}

// ============================================================================
// CHAT FUNCTION
// ============================================================================

export async function chat(
  message: string,
  history: ChatMessage[] = []
): Promise<ChatResponse> {
  try {
    const systemPrompt = getSystemPrompt();

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.9,
    });

    const response = completion.choices[0]?.message?.content || 'I could not generate a response.';

    // Extract any sources mentioned
    const sources = extractSources(response);

    return {
      response,
      sources,
      confidence: 0.85, // Based on model confidence
    };
  } catch (error) {
    console.error('Chat error:', error);

    // Fallback to rule-based responses
    return getFallbackResponse(message);
  }
}

// ============================================================================
// FALLBACK RESPONSES (when API unavailable)
// ============================================================================

function getFallbackResponse(message: string): ChatResponse {
  const model = getModel();
  const lowerMessage = message.toLowerCase();

  // First song question
  if (lowerMessage.includes('first song') || lowerMessage.includes('open') || lowerMessage.includes('opener')) {
    const top = model.firstSong.predictions[0];
    return {
      response: `Based on our model, **${top.song}** is the most likely opening song at **${(top.probability * 100).toFixed(0)}%** probability (${top.confidence} confidence).

${top.reasoning}

Top 3 predictions:
1. ${model.firstSong.predictions[0].song}: ${(model.firstSong.predictions[0].probability * 100).toFixed(0)}%
2. ${model.firstSong.predictions[1].song}: ${(model.firstSong.predictions[1].probability * 100).toFixed(0)}%
3. ${model.firstSong.predictions[2].song}: ${(model.firstSong.predictions[2].probability * 100).toFixed(0)}%`,
      sources: ['Model predictions', 'setlist.fm data'],
    };
  }

  // Setlist question
  if (lowerMessage.includes('setlist') || lowerMessage.includes('songs') || lowerMessage.includes('perform')) {
    const setlist = model.setlist.primary;
    return {
      response: `Predicted 8-song setlist (~13:30):

${setlist.map(s => `${s.position}. **${s.song}**${s.guest ? ` ft. ${s.guest}` : ''} (${(s.inclusionProbability * 100).toFixed(0)}%)`).join('\n')}

**Locks** (95%+): ${model.setlist.songTiers.locks.join(', ')}
**Very Likely** (80%+): ${model.setlist.songTiers.veryLikely.join(', ')}`,
      sources: ['Model setlist predictions'],
    };
  }

  // Guest question
  if (lowerMessage.includes('guest') || lowerMessage.includes('cardi') || lowerMessage.includes('appear')) {
    return {
      response: `Guest appearance probabilities:

${model.guests.slice(0, 5).map(g => `- **${g.name}**: ${(g.probability * 100).toFixed(0)}%${g.associatedSong ? ` (${g.associatedSong})` : ''}`).join('\n')}

Most likely: **Cardi B** (75%) for "I Like It" - his only #1 hit.`,
      sources: ['Model guest predictions'],
    };
  }

  // Edge/betting question
  if (lowerMessage.includes('edge') || lowerMessage.includes('bet') || lowerMessage.includes('trade') || lowerMessage.includes('buy') || lowerMessage.includes('sell')) {
    const positions = model.marketPositions.highConviction;
    return {
      response: `Top betting edges (Our Probability vs Market):

${positions.map(p => `**${p.recommendation} ${p.song}** on ${p.platform}
  Market: ${(p.marketProbability * 100).toFixed(0)}% | Ours: ${(p.ourProbability * 100).toFixed(0)}% | Edge: ${p.edge > 0 ? '+' : ''}${(p.edge * 100).toFixed(0)}%`).join('\n\n')}

Biggest edge: **SELL NuevaYol on Kalshi** (-36% edge)
The market has NuevaYol at 56% but our model says 20%.`,
      sources: ['Model edge calculations', 'Kalshi', 'FanDuel'],
    };
  }

  // NuevaYol specific
  if (lowerMessage.includes('nuevayol')) {
    return {
      response: `**NuevaYol Analysis:**

Our probability: **20%** (medium confidence)
Kalshi market: **56%**
Edge: **-36%** (SELL)

Why we're lower than the market:
- Not in Bad Bunny's top-20 all-time streaming songs
- Zero stadium opener track record
- His festival/special event pattern (Coachella 2023) shows he chooses proven stadium activators over album promotion

The market is capturing narrative appeal but ignoring structural evidence.`,
      sources: ['Model analysis', 'setlist.fm', 'Spotify data'],
    };
  }

  // Default response
  return {
    response: `I can answer questions about:
- **First song predictions** (What will Bad Bunny open with?)
- **Full setlist** (What 8 songs will he perform?)
- **Guest appearances** (Will Cardi B appear?)
- **Betting edges** (Where are markets mispriced?)
- **Model methodology** (How do we calculate probabilities?)

What would you like to know?`,
    sources: [],
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function extractSources(response: string): string[] {
  const sources: string[] = [];

  if (response.includes('streaming') || response.includes('Spotify')) {
    sources.push('Spotify data');
  }
  if (response.includes('setlist') || response.includes('concert')) {
    sources.push('setlist.fm');
  }
  if (response.includes('Kalshi')) {
    sources.push('Kalshi markets');
  }
  if (response.includes('FanDuel')) {
    sources.push('FanDuel odds');
  }
  if (response.includes('Grammy') || response.includes('award')) {
    sources.push('Awards data');
  }
  if (response.includes('trailer') || response.includes('Apple Music')) {
    sources.push('Apple Music trailer');
  }

  return sources.length > 0 ? sources : ['Model predictions'];
}

// ============================================================================
// QUICK ANSWERS
// ============================================================================

export function getQuickAnswer(topic: 'first_song' | 'setlist' | 'guests' | 'edges'): string {
  const model = getModel();

  switch (topic) {
    case 'first_song':
      const top = model.firstSong.predictions[0];
      return `${top.song} at ${(top.probability * 100).toFixed(0)}%`;

    case 'setlist':
      return model.setlist.primary.map(s => s.song).join(' → ');

    case 'guests':
      return model.guests
        .filter(g => g.probability >= 0.5)
        .map(g => `${g.name} (${(g.probability * 100).toFixed(0)}%)`)
        .join(', ');

    case 'edges':
      const topEdge = getTopEdge();
      return topEdge
        ? `${topEdge.recommendation} ${topEdge.song}: ${(topEdge.edge * 100).toFixed(0)}% edge`
        : 'No significant edges';

    default:
      return 'Unknown topic';
  }
}
