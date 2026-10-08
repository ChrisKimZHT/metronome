import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActionIcon, Button, Collapse, Kbd, Modal, NumberInput, Slider, TextInput, Tooltip } from '@mantine/core';
import { IconCheck, IconChevronDown, IconHandClick, IconKeyboard, IconMinus, IconPlayerPlayFilled, IconPlayerStopFilled, IconPlus, IconVolume, IconVolumeOff, IconX } from '@tabler/icons-react';
import { MetronomeEngine, type BeatFrame } from './audio/MetronomeEngine';
import { clampBpm, MAX_BPM, MIN_BPM, parseOffsets, PRESETS, tapBpm, tempoName } from './rhythm';
import { loadSettings, saveSettings, type Settings } from './settings';
import { PwaStatus } from './PwaStatus';

const COMMON_BPMS = [60, 72, 80, 90, 100, 120, 144, 160, 180, 200];
const FAVICON_URL = './favicon.svg';

function RhythmGlyph({ offsets, large = false }: { offsets: readonly number[]; large?: boolean }) {
  return <svg className={large ? 'rhythm-glyph large' : 'rhythm-glyph'} viewBox="0 0 100 32" aria-hidden="true">
    <line x1="6" x2="94" y1="24" y2="24" stroke="currentColor" strokeOpacity=".18" strokeWidth="1.5" />
    {[0, ...offsets].map((offset, i) => <g key={offset}>
      <line x1={8 + offset * 86} x2={8 + offset * 86} y1={i === 0 ? 5 : 11} y2="23" stroke="currentColor" strokeWidth={i === 0 ? 3.5 : 2.5} strokeLinecap="round" />
      <circle cx={8 + offset * 86} cy="24" r={i === 0 ? 3.5 : 2.5} fill="currentColor" />
    </g>)}
  </svg>;
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [bpmDraft, setBpmDraft] = useState<string | number>(settings.bpm);
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState('');
  const [customOpen, setCustomOpen] = useState(true);
  const [customDraft, setCustomDraft] = useState(settings.custom);
  const [customError, setCustomError] = useState('');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [active, setActive] = useState(-1);
  const engine = useRef<MetronomeEngine | null>(null);
  const playhead = useRef<HTMLDivElement>(null);
  const taps = useRef<number[]>([]);
  const tapReset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startingRef = useRef(false);
  const playingRef = useRef(false);
  const previousFrame = useRef({ beat: -1, active: -1 });

  const preset = PRESETS.find((item) => item.id === settings.preset);
  const offsets = useMemo(() => settings.preset === 'custom'
    ? parseOffsets(settings.custom).offsets : [...(preset?.offsets ?? [])], [settings.preset, settings.custom, preset]);
  const rhythmName = preset?.name ?? '自定义节奏';
  const elapsedTime = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`;

  const update = useCallback((patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch })), []);
  const setBpm = useCallback((value: number) => {
    const bpm = clampBpm(value);
    setSettings((current) => ({ ...current, bpm }));
    setBpmDraft(bpm);
  }, []);

  useEffect(() => {
    const onFrame = (frame: BeatFrame) => {
      if (playhead.current) playhead.current.style.left = `${frame.progress * 100}%`;
      if (frame.active !== previousFrame.current.active || frame.beat !== previousFrame.current.beat) setActive(frame.active);
      previousFrame.current = frame;
    };
    engine.current = new MetronomeEngine(onFrame, () => {
      setPlaying(false);
      playingRef.current = false;
      setError('音频已被浏览器暂停，点击开始继续练习。');
    });
    return () => { engine.current?.dispose(); engine.current = null; clearTimeout(tapReset.current); };
  }, []);

  useEffect(() => {
    engine.current?.configure({ bpm: settings.bpm, offsets, volume: settings.volume, muted: settings.muted });
    saveSettings(settings);
  }, [settings, offsets]);

  useEffect(() => {
    if (!playing) return;
    const startedAt = performance.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((performance.now() - startedAt) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing]);

  const toggle = useCallback(async () => {
    if (playingRef.current || startingRef.current) {
      engine.current?.stop();
      playingRef.current = false;
      startingRef.current = false;
      setPlaying(false);
      setStarting(false);
      return;
    }
    setError('');
    startingRef.current = true;
    setStarting(true);
    try {
      const started = await engine.current?.start();
      if (started) { playingRef.current = true; setElapsedSeconds(0); setPlaying(true); }
    } catch {
      setError('暂时无法播放声音，请检查浏览器音频权限后重试。');
    } finally { startingRef.current = false; setStarting(false); }
  }, []);

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
    tapReset.current = setTimeout(() => { setTapCount(0); taps.current = []; }, 3200);
  }, [setBpm]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || shortcutsOpen) return;
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
  }, [settings.bpm, settings.muted, toggle, tap, update, setBpm, shortcutsOpen]);

  const selectPreset = (id: string) => { update({ preset: id }); setCustomError(''); };
  const applyCustom = () => {
    const result = parseOffsets(customDraft);
    if (result.error) { setCustomError(result.error); return; }
    update({ preset: 'custom', custom: customDraft.trim() });
    setCustomError('');
  };

  return <div className="app-shell">
    <header className="site-header">
      <div className="brand"><img src={FAVICON_URL} width="36" height="36" alt="" /><h1>节拍器</h1></div>
      <Tooltip label="键盘快捷键"><ActionIcon variant="subtle" color="dark" size="lg" aria-label="查看键盘快捷键" onClick={() => setShortcutsOpen(true)}><IconKeyboard size={21} stroke={1.5} /></ActionIcon></Tooltip>
    </header>

    <main>
      <section className={`visualizer ${playing ? 'running' : ''}`} aria-label="节奏预览">
        <div className="visualizer-info"><h2>{rhythmName}</h2><span>{offsets.length + 1} 次发声 / 拍</span></div>
        <div className="rhythm-timeline"><div className="timeline-track"><div className="track-line" /><div className="playhead" ref={playhead} />{[0, ...offsets].map((offset, i) => <div key={offset} className={`beat-marker ${i === 0 ? 'main-beat' : ''} ${playing && active === i ? 'active' : ''}`} style={{ left: `${offset * 100}%` }}><span className="marker-dot" /><span className="marker-label">{i === 0 ? '主拍' : Number(offset.toFixed(3))}</span></div>)}<div className="end-marker"><span /><span>下一拍</span></div></div></div>
      </section>

      <div className="workspace">
        <section className="tempo-panel" aria-labelledby="tempo-title">
          <div className="panel-heading"><h2 id="tempo-title">速度</h2><span className={`status ${playing ? 'is-playing' : ''}`}><i />{playing ? '播放中' : starting ? '准备中' : '已停止'}</span></div>
          <div className="tempo-display">
            <div className="tempo-name">{tempoName(settings.bpm)}</div>
            <div className="bpm-control">
              <ActionIcon className="step-button" variant="default" size={44} radius="xl" aria-label="速度减 1" disabled={settings.bpm <= MIN_BPM} onClick={() => setBpm(settings.bpm - 1)}><IconMinus size={20} /></ActionIcon>
              <NumberInput classNames={{ root: 'bpm-root', input: 'bpm-input' }} aria-label="每分钟节拍数 BPM" value={bpmDraft} onChange={(value) => { setBpmDraft(value); if (typeof value === 'number' && value >= MIN_BPM && value <= MAX_BPM) update({ bpm: Math.round(value) }); }} onBlur={() => setBpm(typeof bpmDraft === 'number' ? bpmDraft : settings.bpm)} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} min={MIN_BPM} max={MAX_BPM} allowDecimal={false} allowNegative={false} hideControls variant="unstyled" />
              <ActionIcon className="step-button" variant="default" size={44} radius="xl" aria-label="速度加 1" disabled={settings.bpm >= MAX_BPM} onClick={() => setBpm(settings.bpm + 1)}><IconPlus size={20} /></ActionIcon>
            </div>
            <span className="bpm-unit">BPM</span>
          </div>
          <div className="tempo-slider"><Slider thumbLabel="速度滑块" value={settings.bpm} onChange={setBpm} min={MIN_BPM} max={MAX_BPM} label={null} size={5} thumbSize={20} /><div className="range-labels"><span>20</span><span>拖动调速 · 点击数字输入</span><span>300</span></div></div>
          <div className="bpm-presets" role="group" aria-label="常用 BPM">{COMMON_BPMS.map((bpm) => <Button key={bpm} className="bpm-preset" variant={settings.bpm === bpm ? 'filled' : 'default'} aria-label={`设为 ${bpm} BPM`} aria-pressed={settings.bpm === bpm} onClick={() => setBpm(bpm)}>{bpm}</Button>)}</div>
          <div className="transport">
            <Button className="play-button" size="xl" radius="md" onClick={() => void toggle()} leftSection={playing ? <IconPlayerStopFilled size={20} /> : <IconPlayerPlayFilled size={20} />} aria-label={playing ? '停止节拍器' : '开始节拍器'}>{playing ? '停止' : starting ? '取消' : '开始'}{playing ? <span className="button-timer" role="timer" aria-label="运行时间">{elapsedTime}</span> : <span className="button-key">SPACE</span>}</Button>
            <Tooltip label="连续点击测算速度（T）"><Button className={`tap-button ${tapCount ? 'tapped' : ''}`} variant="default" size="xl" radius="md" onClick={tap} aria-label="点击测速 Tap Tempo"><IconHandClick size={23} stroke={1.5} /><span>{tapCount ? `已点击 ${tapCount} 次` : '点击测速'}</span></Button></Tooltip>
          </div>
          <div className="audio-controls"><Tooltip label={settings.muted ? '取消静音（M）' : '静音（M）'}><ActionIcon variant="subtle" color="dark" size="lg" onClick={() => update({ muted: !settings.muted })} aria-label={settings.muted ? '取消静音' : '静音'} aria-pressed={settings.muted}>{settings.muted || settings.volume === 0 ? <IconVolumeOff size={21} stroke={1.5} /> : <IconVolume size={21} stroke={1.5} />}</ActionIcon></Tooltip><Slider thumbLabel="音量" value={settings.volume} onChange={(volume) => update({ volume, muted: false })} label={(value) => `${value}%`} size={4} thumbSize={12} className="volume-slider" /><span>{settings.muted ? '静音' : `${settings.volume}%`}</span></div>
        </section>

        <section className="rhythm-panel" aria-labelledby="rhythm-title">
          <div className="panel-heading"><h2 id="rhythm-title">节拍细分</h2><button className="text-button" onClick={() => { selectPreset('quarter'); setCustomDraft(''); update({ custom: '' }); }}>重置</button></div>
          <div className="preset-grid">{PRESETS.map((item) => <button key={item.id} className={`preset ${settings.preset === item.id ? 'selected' : ''}`} aria-label={`${item.name}，${item.detail}`} aria-pressed={settings.preset === item.id} onClick={() => selectPreset(item.id)}>
            <RhythmGlyph offsets={item.offsets} />
            <span>{item.name}</span>
            {settings.preset === item.id && <IconCheck className="preset-check" size={14} stroke={2.5} />}
          </button>)}<button className={`preset custom-preset ${settings.preset === 'custom' ? 'selected' : ''}`} onClick={() => setCustomOpen((open) => !open)} aria-expanded={customOpen} aria-controls="custom-editor"><IconPlus size={23} stroke={1.4} /><span>自定义</span></button></div>
          <button className="custom-toggle" onClick={() => setCustomOpen((open) => !open)} aria-expanded={customOpen} aria-controls="custom-editor"><span>自定义细分（小数 / 分数）</span><IconChevronDown size={16} className={customOpen ? 'rotated' : ''} /></button>
          <Collapse in={customOpen}>
            <form id="custom-editor" className="custom-editor" onSubmit={(event) => { event.preventDefault(); applyCustom(); }}>
              <label htmlFor="custom-offsets">拍内细分位置</label>
              <p id="custom-help">主拍为 0，下一拍为 1；多个位置用逗号分隔。</p>
              <div className="custom-input-row">
                <TextInput id="custom-offsets" aria-describedby="custom-help" placeholder="例如：1/3, 1/2, 2/3" value={customDraft} onChange={(event) => { setCustomDraft(event.currentTarget.value); setCustomError(''); }} error={customError} />
                <Button type="submit" size="sm">应用细分</Button>
              </div>
            </form>
          </Collapse>
        </section>
      </div>

      {error && <div className="error-message" role="alert"><span>{error}</span><ActionIcon aria-label="关闭提示" color="red" variant="subtle" onClick={() => setError('')}><IconX size={16} /></ActionIcon></div>}

      <PwaStatus playing={playing || starting} />
    </main>

    <Modal closeButtonProps={{ 'aria-label': '关闭快捷键说明' }} opened={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title="键盘快捷键" centered radius="lg"><p className="modal-description">输入文字或操作滑块时，优先使用控件自身的按键。按钮聚焦时，空格仍控制开始 / 停止，Enter 触发按钮。此说明窗口打开时，快捷键暂停。</p><div className="shortcut-list"><div><span>开始 / 停止</span><Kbd>Space</Kbd></div><div><span>点击测速</span><Kbd>T</Kbd></div><div><span>速度 ±1 BPM</span><span><Kbd>↑</Kbd> <Kbd>↓</Kbd></span></div><div><span>速度 ±5 BPM</span><span><Kbd>Shift</Kbd> + <Kbd>↑ / ↓</Kbd></span></div><div><span>静音 / 取消静音</span><Kbd>M</Kbd></div></div></Modal>
  </div>;
}
