'use client';

import { useState, useEffect, useCallback } from 'react';
import Dashboard from '@/components/Dashboard';
import ChatBot from '@/components/ChatBot';
import type { PredictionModel, PortfolioAnalysis } from '@/types';

export default function Home() {
  const [model, setModel] = useState<PredictionModel | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [modelRes, portfolioRes] = await Promise.all([
        fetch('/api/predictions'),
        fetch('/api/portfolio'),
      ]);

      const modelData = await modelRes.json();
      if (modelData.success) {
        setModel(modelData.data);
      }

      const portfolioData = await portfolioRes.json();
      if (portfolioData.success) {
        setPortfolio(portfolioData.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Poll every 60 seconds — cloud-only, no local dependency
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🐰</div>
          <div className="text-gold animate-pulse">LOADING_MODEL...</div>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-status-danger">
          <div className="text-2xl mb-4">ERROR</div>
          <div>Failed to load prediction model</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      <Dashboard model={model} portfolio={portfolio} onOpenChat={() => setChatOpen(true)} />
      <ChatBot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </main>
  );
}
