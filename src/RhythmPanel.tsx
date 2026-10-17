import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Button, Collapse, TextInput } from '@mantine/core';
import { IconCheck, IconChevronDown, IconPlus } from '@tabler/icons-react';
import { parseOffsets, PRESETS } from './rhythm';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import quarter from './assets/rhythms/quarter.svg?no-inline';
import eighth from './assets/rhythms/eighth.svg?no-inline';
import triplet from './assets/rhythms/triplet.svg?no-inline';
import sixteenth from './assets/rhythms/sixteenth.svg?no-inline';
import dotted from './assets/rhythms/dotted.svg?no-inline';
import swing from './assets/rhythms/swing.svg?no-inline';
import quintuplet from './assets/rhythms/quintuplet.svg?no-inline';
import sextuplet from './assets/rhythms/sextuplet.svg?no-inline';
import septuplet from './assets/rhythms/septuplet.svg?no-inline';
import polyrhythm from './assets/rhythms/polyrhythm.svg?no-inline';
import polyrhythm34 from './assets/rhythms/polyrhythm-3-4.svg?no-inline';

const glyphs: Record<(typeof PRESETS)[number]['id'], string> = {
  quarter,
  eighth,
  triplet,
  sixteenth,
  dotted,
  swing,
  quintuplet,
  sextuplet,
  septuplet,
  polyrhythm,
  'polyrhythm-3-4': polyrhythm34,
};

type RhythmPanelProps = {
  preset: string;
  custom: string;
  onChange: (patch: Partial<Settings>) => void;
};

export function RhythmPanel({ preset, custom, onChange }: RhythmPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState(custom);
  const [error, setError] = useState<NonNullable<ReturnType<typeof parseOffsets>['error']> | ''>('');

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
        <h2 id="rhythm-title">{t('rhythm.title')}</h2>
        <button className="text-button" onClick={reset}>{t('rhythm.reset')}</button>
      </div>
      <div className="preset-grid">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            className={`preset ${preset === item.id ? 'selected' : ''}`}
            aria-label={t('rhythm.presetLabel', { name: t(item.nameKey), detail: t(item.detailKey) })}
            aria-pressed={preset === item.id}
            onClick={() => selectPreset(item.id)}
          >
            <svg className="rhythm-glyph" viewBox="0 0 120 48" aria-hidden="true" focusable="false">
              <use href={`${glyphs[item.id]}#glyph`} />
            </svg>
            <span>{t(item.nameKey)}</span>
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
          <span>{t('rhythm.custom')}</span>
        </button>
      </div>
      <button
        className="custom-toggle"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="custom-editor"
      >
        <span>{t('rhythm.customSubdivision')}</span>
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
          <label htmlFor="custom-offsets">{t('rhythm.positions')}</label>
          <p id="custom-help">{t('rhythm.help')}</p>
          <div className="custom-input-row">
            <TextInput
              id="custom-offsets"
              aria-describedby="custom-help"
              placeholder={t('rhythm.placeholder')}
              value={draft}
              onChange={(event) => {
                setDraft(event.currentTarget.value);
                setError('');
              }}
              error={error ? t(error) : undefined}
            />
            <Button type="submit" size="sm">{t('rhythm.apply')}</Button>
          </div>
        </form>
      </Collapse>
    </section>
  );
}
