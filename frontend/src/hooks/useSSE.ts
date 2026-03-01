'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { PipelineEvent } from '@/lib/types';

export function useSSE(url: string | null) {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [currentStep, setCurrentStep] = useState<PipelineEvent | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const maxProgressRef = useRef(0);

  useEffect(() => {
    if (!url) return;
    maxProgressRef.current = 0;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: PipelineEvent = JSON.parse(event.data);

        // Skip heartbeat events — they carry no new info
        if (data.heartbeat) return;

        // Enforce monotonic progress — never go backwards
        if (data.step !== 'error') {
          data.progress = Math.max(data.progress, maxProgressRef.current);
          maxProgressRef.current = data.progress;
        }

        // Always update current step (drives progress bar + message)
        setCurrentStep(data);

        // Ticker events only update progress/message, not the event log
        if (!data.ticker) {
          setEvents(prev => [...prev, data]);
        }

        if (data.step === 'complete') { setIsComplete(true); es.close(); }
        else if (data.step === 'error') { setError(data.message); es.close(); }
      } catch (e) { console.error('SSE parse error:', e); }
    };

    es.onerror = () => { setError('Connection lost'); es.close(); };
    return () => { es.close(); };
  }, [url]);

  const reset = useCallback(() => {
    setEvents([]); setCurrentStep(null); setIsComplete(false); setError(null);
    maxProgressRef.current = 0;
  }, []);

  return { events, currentStep, isComplete, error, reset };
}
