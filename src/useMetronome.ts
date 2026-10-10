import { useCallback, useEffect, useRef, useState } from 'react';
import { MetronomeEngine, type EngineSettings } from './audio/MetronomeEngine';

type PlaybackStatus = 'stopped' | 'starting' | 'playing';

export function useMetronome({ bpm, offsets, volume, muted }: EngineSettings) {
  const [status, setStatus] = useState<PlaybackStatus>('stopped');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState('');
  const [active, setActive] = useState(-1);
  const engine = useRef<MetronomeEngine | null>(null);
  const playhead = useRef<HTMLDivElement>(null);
  // Keyboard events can arrive before React renders the updated status.
  const statusRef = useRef<PlaybackStatus>('stopped');
  const startRequest = useRef(0);

  const changeStatus = useCallback((next: PlaybackStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    let previousActive = -1;
    const instance = new MetronomeEngine((frame) => {
      if (playhead.current) playhead.current.style.left = `${frame.progress * 100}%`;
      if (frame.active !== previousActive) {
        setActive(frame.active);
        previousActive = frame.active;
      }
    }, () => {
      changeStatus('stopped');
      setError('音频已被浏览器暂停，点击开始继续练习。');
    });
    engine.current = instance;
    return () => {
      ++startRequest.current;
      instance.dispose();
      engine.current = null;
    };
  }, [changeStatus]);

  useEffect(() => {
    engine.current?.configure({ bpm, offsets, volume, muted });
  }, [bpm, offsets, volume, muted]);

  useEffect(() => {
    if (status !== 'playing') return;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [status]);

  const toggle = useCallback(async () => {
    const request = ++startRequest.current;
    if (statusRef.current !== 'stopped') {
      engine.current?.stop();
      changeStatus('stopped');
      return;
    }

    setError('');
    changeStatus('starting');
    try {
      const started = await engine.current?.start();
      // A cancelled start must not overwrite a newer playback request.
      if (request !== startRequest.current) return;
      if (started) setElapsedSeconds(0);
      changeStatus(started ? 'playing' : 'stopped');
    } catch {
      if (request !== startRequest.current) return;
      changeStatus('stopped');
      setError('暂时无法播放声音，请检查浏览器音频权限后重试。');
    }
  }, [changeStatus]);

  return {
    playing: status === 'playing',
    starting: status === 'starting',
    elapsedSeconds,
    active,
    playhead,
    toggle,
    error,
    clearError: () => setError(''),
  };
}
