/**
 * TypographyControls — Font family and font size scale controls
 *
 * Font scale slider uses local draft state — commits to context
 * only on pointer release so it doesn't flood the context with
 * a dispatch on every pixel of slider movement.
 */
import React, { useState, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';

const FONT_OPTIONS = [
  { value: 'Calibri, sans-serif', label: 'Calibri' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: "'Times New Roman', serif", label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Roboto', sans-serif", label: 'Roboto' },
  { value: "'Lato', sans-serif", label: 'Lato' },
  { value: "'Open Sans', sans-serif", label: 'Open Sans' },
  { value: "'Garamond', serif", label: 'Garamond' },
];

function TypographyControls() {
  const { state, actions, mergedStyles, effectiveFontScale } = useEditor();

  const currentFont = state.styleOverrides.fontFamily || mergedStyles.fontFamily || FONT_OPTIONS[0].value;
  const committedScale = effectiveFontScale;

  // Local draft scale — does NOT dispatch on every slider pixel move
  const [draftScale, setDraftScale] = useState(committedScale);

  // Keep in sync with context scale (e.g. reset, spacing preset changes)
  useEffect(() => {
    setDraftScale(committedScale);
  }, [committedScale]);

  return (
    <div className="typography-controls" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Font Family */}
      <div>
        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6 }}>Font Family</label>
        <select
          value={currentFont}
          onChange={(e) => actions.setStyleOverride('fontFamily', e.target.value)}
          style={{ width: '100%', padding: '6px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.8125rem', fontFamily: currentFont }}
        >
          {FONT_OPTIONS.map(font => (
            <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Scale Slider — local draft, commits on pointer up */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b' }}>Font Size</label>
          <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(draftScale * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.7"
          max="1.3"
          step="0.05"
          value={draftScale}
          onChange={(e) => setDraftScale(parseFloat(e.target.value))}
          onPointerUp={(e) => actions.setStyleOverride('fontScale', parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#2563eb' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: '#94a3b8', marginTop: 2 }}>
          <span>Compact</span>
          <span>Default</span>
          <span>Large</span>
        </div>
      </div>

      {/* Font preview */}
      <div style={{ padding: '10px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontFamily: currentFont }}>
        <p style={{ fontSize: '0.75rem', color: '#475569', margin: 0 }}>
          <strong>Preview:</strong> The quick brown fox jumps over the lazy dog.
        </p>
      </div>
    </div>
  );
}

export default TypographyControls;
