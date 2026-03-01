'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import type { YouTubePlayer as YTPlayer } from '@/hooks/useVideoSync';

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement, config: Record<string, unknown>) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname === 'youtu.be') return u.pathname.slice(1);
  } catch {}
  return null;
}

let apiLoading = false;
let apiReady = false;
const readyCallbacks: (() => void)[] = [];

function loadYouTubeAPI(): Promise<void> {
  if (apiReady) return Promise.resolve();
  return new Promise(resolve => {
    readyCallbacks.push(resolve);
    if (apiLoading) return;
    apiLoading = true;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      prev?.();
      readyCallbacks.forEach(cb => cb());
      readyCallbacks.length = 0;
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
}

interface Props {
  url: string;
  onReady: (player: YTPlayer) => void;
  className?: string;
}

export function YouTubePlayer({ url, onReady, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const videoId = extractVideoId(url);

  const initPlayer = useCallback(() => {
    if (!containerRef.current || !videoId || !window.YT) return;

    // Create a child div for YT to replace
    const el = document.createElement('div');
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(el);

    playerRef.current = new window.YT.Player(el, {
      videoId,
      playerVars: {
        autoplay: 0,
        modestbranding: 1,
        rel: 0,
        controls: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: { target: YTPlayer }) => {
          setReady(true);
          onReadyRef.current(event.target);
        },
      },
    });
  }, [videoId]);

  useEffect(() => {
    loadYouTubeAPI().then(initPlayer);
    return () => { playerRef.current = null; };
  }, [initPlayer]);

  if (!videoId) {
    return (
      <div className={`flex items-center justify-center text-[#444] ${className || ''}`}>
        <p className="text-xs">Invalid video URL</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className || ''}`}
      style={{ opacity: ready ? 1 : 0.3, transition: 'opacity 0.3s' }}
    />
  );
}
