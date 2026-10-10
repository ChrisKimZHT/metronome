import { useState } from 'react';
import { Button, Collapse, TextInput } from '@mantine/core';
import { IconCheck, IconChevronDown, IconPlus } from '@tabler/icons-react';
import { parseOffsets, PRESETS } from './rhythm';
import { DEFAULT_SETTINGS, type Settings } from './settings';

function RhythmGlyph({ offsets }: { offsets: readonly number[] }) {
  return (
    <svg className="rhythm-glyph" viewBox="0 0 100 32" aria-hidden="true">
      <line x1="6" x2="94" y1="24" y2="24" stroke="currentColor" strokeOpacity=".18" strokeWidth="1.5" />
      {[0, ...offsets].map((offset, index) => {
        const x = 8 + offset * 86;
        const size = index === 0 ? 3.5 : 2.5;
        return (
          <g key={offset}>
            <line x1={x} x2={x} y1={index === 0 ? 5 : 11} y2="23" stroke="currentColor" strokeWidth={size} strokeLinecap="round" />
            <circle cx={x} cy="24" r={size} fill="currentColor" />
          </g>
        );
      })}
    </svg>
  );
}

type RhythmPanelProps = {
  preset: string;
  custom: string;
  onChange: (patch: Partial<Settings>) => void;
};

export function RhythmPanel({ preset, custom, onChange }: RhythmPanelProps) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState(custom);
  const [error, setError] = useState('');

  const selectPreset = (id: string) => {
    onChange({ preset: id });
    setError('');
  };

  const reset = () => {
    onChange({ preset: DEFAULT_SETTINGS.preset, custom: DEFAULT_SETTINGS.custom });
    setDraft(DEFAULT_SETTINGS.custom);
    setError('');
  };

  const applyCustom = () => {
    const result = parseOffsets(draft);
    if (result.error) {
      setError(result.error);
      return;
    }
    onChange({ preset: 'custom', custom: draft.trim() });
    setError('');
  };

  return (
    <section className="rhythm-panel" aria-labelledby="rhythm-title">
      <div className="panel-heading">
        <h2 id="rhythm-title">节拍细分</h2>
        <button className="text-button" onClick={reset}>重置</button>
      </div>
      <div className="preset-grid">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            className={`preset ${preset === item.id ? 'selected' : ''}`}
            aria-label={`${item.name}，${item.detail}`}
            aria-pressed={preset === item.id}
            onClick={() => selectPreset(item.id)}
          >
            <RhythmGlyph offsets={item.offsets} />
            <span>{item.name}</span>
            {preset === item.id && <IconCheck className="preset-check" size={14} stroke={2.5} />}
          </button>
        ))}
        <button
          className={`preset custom-preset ${preset === 'custom' ? 'selected' : ''}`}
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls="custom-editor"
        >
          <IconPlus size={23} stroke={1.4} />
          <span>自定义</span>
        </button>
      </div>
      <button
        className="custom-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="custom-editor"
      >
        <span>自定义细分</span>
        <IconChevronDown size={16} className={open ? 'rotated' : ''} />
      </button>
      <Collapse in={open}>
        <form
          id="custom-editor"
          className="custom-editor"
          onSubmit={(event) => {
            event.preventDefault();
            applyCustom();
          }}
        >
          <label htmlFor="custom-offsets">拍内细分位置</label>
          <p id="custom-help">主拍为 0，下一拍为 1；多个位置用逗号分隔。</p>
          <div className="custom-input-row">
            <TextInput
              id="custom-offsets"
              aria-describedby="custom-help"
              placeholder="例如：1/3, 1/2, 2/3"
              value={draft}
              onChange={(event) => {
                setDraft(event.currentTarget.value);
                setError('');
              }}
              error={error}
            />
            <Button type="submit" size="sm">应用</Button>
          </div>
        </form>
      </Collapse>
    </section>
  );
}
