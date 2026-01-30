'use client';

import { useState, useEffect } from 'react';
import Dashboard from '@/components/Dashboard';
import ChatBot from '@/components/ChatBot';
import type { PredictionModel } from '@/types';

export default function Home() {
  const [model, setModel] = useState<PredictionModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    async function fetchModel() {
      try {
        const res = await fetch('/api/predictions');
        const data = await res.json();
        if (data.success) {
          setModel(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch model:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchModel();

    // Refresh every 60 seconds
    const interval = setInterval(fetchModel, 60000);
    return () => clearInterval(interval);
  }, []);

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
      <Dashboard model={model} onOpenChat={() => setChatOpen(true)} />
      <ChatBot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </main>
  );
}
