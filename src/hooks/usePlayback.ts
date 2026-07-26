// Проигрывание кадров ASCII-видео: currentFrame, isPlaying, start/stop.
// Владеет таймером покадровой прокрутки.
import { useState, useRef, useCallback, useEffect } from 'react';

export function usePlayback() {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPlayback = useCallback(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback((frames: string[], fps: number) => {
    if (frames.length === 0) return;
    stopPlayback();
    setIsPlaying(true);
    playIntervalRef.current = setInterval(() => {
      setCurrentFrame(p => (p + 1 >= frames.length ? 0 : p + 1));
    }, 1000 / fps);
  }, [stopPlayback]);

  // Останавливаем таймер при размонтировании.
  useEffect(() => () => { stopPlayback(); }, [stopPlayback]);

  return { currentFrame, setCurrentFrame, isPlaying, startPlayback, stopPlayback };
}
