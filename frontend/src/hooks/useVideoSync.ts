'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

export function useVideoSync() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  }, []);

  const bindVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoadedMetadata = () => setDuration(el.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMetadata);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  });

  return { videoRef, currentTime, duration, isPlaying, seekTo, togglePlay, bindVideo };
}
