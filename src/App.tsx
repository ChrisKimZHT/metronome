import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Button, NumberInput, Slider, Tooltip } from '@mantine/core';
import { IconHandClick, IconMinus, IconPlayerPlayFilled, IconPlayerStopFilled, IconPlus, IconVolume, IconVolumeOff, IconX } from '@tabler/icons-react';
import { useMetronome } from './useMetronome';
import { RhythmPanel } from './RhythmPanel';
import { clampBpm, MAX_BPM, MIN_BPM, parseOffsets, PRESETS, tapBpm, tempoName } from './rhythm';
import { loadSettings, saveSettings, type Settings } from './settings';
import { PwaStatus } from './PwaStatus';
import { version } from '../package.json';

const COMMON_BPMS = [60, 72, 80, 90, 100, 120, 144, 160, 180, 200];
const FAVICON_URL = './favicon.svg';

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [bpmDraft, setBpmDraft] = useState<string | number>(settings.bpm);
  const [tapCount, setTapCount] = useState(0);
  const taps = useRef<number[]>([]);
  const tapReset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const preset = PRESETS.find((item) => item.id === settings.preset);
  const offsets = useMemo(() => settings.preset === 'custom'
    ? parseOffsets(settings.custom).offsets : [...(preset?.offsets ?? [])], [settings.preset, settings.custom, preset]);
  const { playing, starting, elapsedSeconds, active, playhead, toggle, error, clearError } = useMetronome({ ...settings, offsets });
  const rhythmName = preset?.name ?? '自定义节奏';
  const elapsedTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;

  const update = useCallback((patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch })), []);
  const setBpm = useCallback((value: number) => {
    const bpm = clampBpm(value);
    update({ bpm });
    setBpmDraft(bpm);
  }, [update]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => () => clearTimeout(tapReset.current), []);

  const tap = useCallback(() => {
    const now = performance.now();
    const last = taps.current.at(-1);
    if (last !== undefined && now - last < 100) return;
    if (last === undefined || now - last > 3200) taps.current = [];
    taps.current = [...taps.current.slice(-5), now];
    const bpm = tapBpm(taps.current);
    if (bpm !== null) setBpm(bpm);
    setTapCount(taps.current.length);
    clearTimeout(tapReset.current);
    tapReset.current = setTimeout(() => {
      setTapCount(0);
      taps.current = [];
    }, 3200);
  }, [setBpm]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"], [role="slider"]')) return;
      if (event.code === 'Space') {
        // Keep Space as the transport shortcut even when a button has focus.
        // Prevent the native Space click so the focused button is not activated too.
        event.preventDefault();
        if (!event.repeat) void toggle();
      } else if (event.code === 'KeyT') {
        event.preventDefault();
        if (!event.repeat) tap();
      } else if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault();
        setBpm(settings.bpm + (event.code === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 5 : 1));
      } else if (event.code === 'KeyM' && !event.repeat) {
        update({ muted: !settings.muted });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings.bpm, settings.muted, toggle, tap, update, setBpm]);

  const editBpm = (value: string | number) => {
    setBpmDraft(value);
    if (typeof value === 'number' && value >= MIN_BPM && value <= MAX_BPM) {
      update({ bpm: Math.round(value) });
    }
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="brand">
          <img src={FAVICON_URL} width="40" height="40" alt="" />
          <div className="brand-text">
            <h1>节拍器</h1>
            <p className="app-version">v{version}</p>
          </div>
        </div>
      </header>

      <main>
        <section className={`visualizer ${playing ? 'running' : ''}`} aria-label="节奏预览">
          <div className="visualizer-info">
            <h2>{rhythmName}</h2>
            <span>{offsets.length + 1} 次发声 / 拍</span>
          </div>
          <div className="rhythm-timeline">
            <div className="timeline-track">
              <div className="track-line" />
              <div className="playhead" ref={playhead} />
              {[0, ...offsets].map((offset, index) => (
                <div
                  key={offset}
                  className={`beat-marker ${index === 0 ? 'main-beat' : ''} ${playing && active === index ? 'active' : ''}`}
                  style={{ left: `${offset * 100}%` }}
                >
                  <span className="marker-dot" />
                  <span className="marker-label">{index === 0 ? '主拍' : Number(offset.toFixed(3))}</span>
                </div>
              ))}
              <div className="end-marker"><span /><span>下一拍</span></div>
            </div>
          </div>
        </section>

        <div className="workspace">
          <section className="tempo-panel" aria-labelledby="tempo-title">
            <div className="panel-heading">
              <h2 id="tempo-title">速度</h2>
              <span className={`status ${playing ? 'is-playing' : ''}`}>
                <i />{playing ? '播放中' : starting ? '准备中' : '已停止'}
              </span>
            </div>
            <div className="tempo-display">
              <div className="tempo-name">{tempoName(settings.bpm)}</div>
              <div className="bpm-control">
                <ActionIcon
                  className="step-button"
                  variant="default"
                  size={44}
                  radius="xl"
                  aria-label="速度减 1"
                  disabled={settings.bpm <= MIN_BPM}
                  onClick={() => setBpm(settings.bpm - 1)}
                >
                  <IconMinus size={20} />
                </ActionIcon>
                <NumberInput
                  classNames={{ root: 'bpm-root', input: 'bpm-input' }}
                  aria-label="每分钟节拍数 BPM"
                  value={bpmDraft}
                  onChange={editBpm}
                  onBlur={() => setBpm(typeof bpmDraft === 'number' ? bpmDraft : settings.bpm)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                  min={MIN_BPM}
                  max={MAX_BPM}
                  allowDecimal={false}
                  allowNegative={false}
                  hideControls
                  variant="unstyled"
                />
                <ActionIcon
                  className="step-button"
                  variant="default"
                  size={44}
                  radius="xl"
                  aria-label="速度加 1"
                  disabled={settings.bpm >= MAX_BPM}
                  onClick={() => setBpm(settings.bpm + 1)}
                >
                  <IconPlus size={20} />
                </ActionIcon>
              </div>
              <span className="bpm-unit">BPM</span>
            </div>
            <div className="tempo-slider">
              <Slider
                thumbLabel="速度滑块"
                value={settings.bpm}
                onChange={setBpm}
                min={MIN_BPM}
                max={MAX_BPM}
                label={null}
                size={5}
                thumbSize={20}
              />
              <div className="range-labels"><span>{MIN_BPM}</span><span>{MAX_BPM}</span></div>
            </div>
            <div className="bpm-presets" role="group" aria-label="常用 BPM">
              {COMMON_BPMS.map((bpm) => (
                <Button
                  key={bpm}
                  className="bpm-preset"
                  variant={settings.bpm === bpm ? 'filled' : 'default'}
                  aria-label={`设为 ${bpm} BPM`}
                  aria-pressed={settings.bpm === bpm}
                  onClick={() => setBpm(bpm)}
                >
                  {bpm}
                </Button>
              ))}
            </div>
            <div className="transport">
              <Button
                className="play-button"
                size="xl"
                radius="md"
                onClick={() => void toggle()}
                leftSection={playing ? <IconPlayerStopFilled size={20} /> : <IconPlayerPlayFilled size={20} />}
                aria-label={playing ? '停止节拍器' : starting ? '取消启动' : '开始节拍器'}
              >
                {playing ? '停止' : starting ? '取消' : '开始'}
                {playing ? (
                  <span className="button-timer" role="timer" aria-label="运行时间">{elapsedTime}</span>
                ) : (
                  <span className="button-key">SPACE</span>
                )}
              </Button>
              <Tooltip label="连续点击测算速度（T）">
                <Button
                  className={`tap-button ${tapCount ? 'tapped' : ''}`}
                  variant="default"
                  size="xl"
                  radius="md"
                  onClick={tap}
                  aria-label="点击测速 Tap Tempo"
                >
                  <IconHandClick size={23} stroke={1.5} />
                  <span>{tapCount ? `已点击 ${tapCount} 次` : '点击测速'}</span>
                </Button>
              </Tooltip>
            </div>
            <div className="audio-controls">
              <Tooltip label={settings.muted ? '取消静音（M）' : '静音（M）'}>
                <ActionIcon
                  variant="subtle"
                  color="dark"
                  size="lg"
                  onClick={() => update({ muted: !settings.muted })}
                  aria-label={settings.muted ? '取消静音' : '静音'}
                  aria-pressed={settings.muted}
                >
                  {settings.muted || settings.volume === 0 ? (
                    <IconVolumeOff size={21} stroke={1.5} />
                  ) : (
                    <IconVolume size={21} stroke={1.5} />
                  )}
                </ActionIcon>
              </Tooltip>
              <Slider
                thumbLabel="音量"
                value={settings.volume}
                onChange={(volume) => update({ volume, muted: false })}
                label={(value) => `${value}%`}
                size={4}
                thumbSize={12}
                className="volume-slider"
              />
              <span>{settings.muted ? '静音' : `${settings.volume}%`}</span>
            </div>
          </section>

          <RhythmPanel preset={settings.preset} custom={settings.custom} onChange={update} />
        </div>

        {error && (
          <div className="error-message" role="alert">
            <span>{error}</span>
            <ActionIcon aria-label="关闭提示" color="red" variant="subtle" onClick={clearError}>
              <IconX size={16} />
            </ActionIcon>
          </div>
        )}

        <PwaStatus playing={playing || starting} />
      </main>
    </div>
  );
}
