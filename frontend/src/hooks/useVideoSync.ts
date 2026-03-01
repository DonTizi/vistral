'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

export interface YouTubePlayer {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  playVideo(): void;
  pauseVideo(): void;
}

export function useVideoSync() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytRef = useRef<YouTubePlayer | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const [ytPlayer, setYtPlayer] = useState<YouTubePlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    } else if (ytRef.current) {
      ytRef.current.seekTo(time, true);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
    } else if (ytRef.current) {
      // YT states: 1 = playing
      ytRef.current.getPlayerState() === 1
        ? ytRef.current.pauseVideo()
        : ytRef.current.playVideo();
    }
  }, []);

  const bindVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    ytRef.current = null;
    setYtPlayer(null);
    setVideoEl(el);
  }, []);

  const bindYouTube = useCallback((player: YouTubePlayer | null) => {
    ytRef.current = player;
    videoRef.current = null;
    setVideoEl(null);
    setYtPlayer(player);
    if (player) {
      try { setDuration(player.getDuration()); } catch {}
    }
  }, []);

  // Native video events
  useEffect(() => {
    if (!videoEl) return;

    const onTimeUpdate = () => setCurrentTime(videoEl.currentTime);
    const onLoadedMetadata = () => setDuration(videoEl.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
    videoEl.addEventListener('play', onPlay);
    videoEl.addEventListener('pause', onPause);

    return () => {
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
      videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      videoEl.removeEventListener('play', onPlay);
      videoEl.removeEventListener('pause', onPause);
    };
  }, [videoEl]);

  // YouTube polling (no native timeupdate event)
  useEffect(() => {
    if (!ytPlayer) return;

    const interval = setInterval(() => {
      try {
        setCurrentTime(ytPlayer.getCurrentTime());
        const state = ytPlayer.getPlayerState();
        setIsPlaying(state === 1);
        const dur = ytPlayer.getDuration();
        if (dur > 0) setDuration(dur);
      } catch {}
    }, 250);

    return () => clearInterval(interval);
  }, [ytPlayer]);

  return { videoRef, currentTime, duration, isPlaying, seekTo, togglePlay, bindVideo, bindYouTube };
}
