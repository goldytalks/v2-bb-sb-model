'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types';

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatBot({ isOpen, onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Welcome to the BB Halftime Prediction Model! I can answer questions about:

• First song predictions
• Full setlist analysis
• Guest appearances
• Betting edges
• Model methodology

What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages.slice(-10), // Last 10 messages for context
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.data.response },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    "What's the most likely opener?",
    "Is NuevaYol overpriced?",
    "Who will appear as guests?",
    "Best bets right now?",
  ];

  if (!isOpen) return null;

  return (
    <div className="chat-container animate-slide-up z-50">
      {/* Header */}
      <div className="chat-header">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span>BB_MODEL_AI</span>
        </div>
        <button onClick={onClose} className="hover:opacity-70 transition-opacity">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-message ${msg.role === 'user' ? 'user' : 'assistant'} animate-fade-in`}
          >
            <div className="flex items-start gap-2">
              {msg.role === 'assistant' ? (
                <Bot className="w-4 h-4 text-gold mt-0.5 flex-shrink-0" />
              ) : (
                <User className="w-4 h-4 text-terminal-dim mt-0.5 flex-shrink-0" />
              )}
              <div className="whitespace-pre-wrap text-sm normal-case">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-message assistant animate-fade-in">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-gold animate-spin" />
              <span className="text-terminal-dim text-sm">PROCESSING...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 border-t border-terminal-border">
          <div className="text-xs text-terminal-dim mb-2">QUICK QUESTIONS:</div>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs px-2 py-1 border border-terminal-border hover:border-gold hover:text-gold transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="chat-input">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ASK ABOUT THE MODEL..."
            disabled={loading}
            className="flex-1"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-3 bg-gold text-terminal-bg hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
