'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { PipelineEvent } from '@/lib/types';

export function useSSE(url: string | null) {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: PipelineEvent = JSON.parse(event.data);
        setEvents(prev => [...prev, data]);
        if (data.step === 'complete') { setIsComplete(true); es.close(); }
        else if (data.step === 'error') { setError(data.message); es.close(); }
      } catch (e) { console.error('SSE parse error:', e); }
    };

    es.onerror = () => { setError('Connection lost'); es.close(); };
    return () => { es.close(); };
  }, [url]);

  const currentStep = events.at(-1) ?? null;

  const reset = useCallback(() => {
    setEvents([]); setIsComplete(false); setError(null);
  }, []);

  return { events, currentStep, isComplete, error, reset };
}
