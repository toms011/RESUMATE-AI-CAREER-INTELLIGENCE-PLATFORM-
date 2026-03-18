/**
 * SpacingControls — Margins, line height, and layout density controls
 *
 * Line-height slider uses local draft state — commits to context
 * only on pointer release to avoid flooding the context.
 */
import React, { useState, useEffect } from 'react';
import { useEditor, SPACING_PRESETS } from '../context/EditorContext';

function SpacingControls() {
  const { state, actions, effectiveLineHeight, effectiveMargins } = useEditor();

  const currentSpacing = state.styleOverrides.spacing;

  // Local draft for line height — commits on pointer up
  const [draftLineHeight, setDraftLineHeight] = useState(effectiveLineHeight);
  useEffect(() => { setDraftLineHeight(effectiveLineHeight); }, [effectiveLineHeight]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Layout Density Presets */}
      <div>
        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8 }}>Layout Density</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
          {Object.entries(SPACING_PRESETS).map(([key]) => (
            <button
              key={key}
              onClick={() => actions.setSpacingPreset(key)}
              style={{
                padding: '8px 4px', borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                border: `2px solid ${currentSpacing === key ? '#2563eb' : '#e2e8f0'}`,
                background: currentSpacing === key ? '#eff6ff' : '#fff',
                color: currentSpacing === key ? '#2563eb' : '#64748b',
                fontWeight: currentSpacing === key ? 600 : 400,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: key === 'compact' ? 1 : key === 'spacious' ? 4 : 2, marginBottom: 4 }}>
                {[1,2,3].map(i => <div key={i} style={{ width: 20, height: 2, background: currentSpacing === key ? '#93c5fd' : '#cbd5e1', borderRadius: 1 }} />)}
              </div>
              <span style={{ fontSize: '0.6875rem', textTransform: 'capitalize' }}>{key}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Line Height Slider — local draft, commits on pointer up */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b' }}>Line Height</label>
          <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>{draftLineHeight.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="1.0"
          max="2.0"
          step="0.05"
          value={draftLineHeight}
          onChange={(e) => setDraftLineHeight(parseFloat(e.target.value))}
          onPointerUp={(e) => actions.setStyleOverride('lineHeight', parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#2563eb' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: '#94a3b8', marginTop: 2 }}>
          <span>Tight</span><span>Relaxed</span>
        </div>
      </div>

      {/* Page Margins */}
      <div>
        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8 }}>Page Margins (mm)</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {['top', 'bottom', 'left', 'right'].map(side => (
            <div key={side} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '0.625rem', color: '#94a3b8', textTransform: 'uppercase', width: 24, flexShrink: 0 }}>{side.slice(0, 3)}</span>
              <input
                type="number"
                min="5"
                max="40"
                value={effectiveMargins[side]}
                onChange={(e) => {
                  const val = Math.max(5, Math.min(40, parseInt(e.target.value) || 10));
                  actions.setStyleOverride('margins', { ...effectiveMargins, [side]: val });
                }}
                style={{ width: '100%', padding: '4px 6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, fontSize: '0.75rem', textAlign: 'center' }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
          {[{ label: 'Narrow', m: 12 }, { label: 'Normal', m: 20 }, { label: 'Wide', m: 25 }].map(({ label, m }) => (
            <button
              key={label}
              onClick={() => actions.setStyleOverride('margins', { top: m, bottom: m, left: m, right: m })}
              style={{ flex: 1, padding: '4px 2px', fontSize: '0.625rem', fontWeight: 500, borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-fit Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#475569', margin: 0 }}>Auto-fit Content</p>
          <p style={{ fontSize: '0.625rem', color: '#94a3b8', margin: 0 }}>Shrink text if overflow</p>
        </div>
        <button
          onClick={() => actions.setStyleOverride('autoFit', !state.styleOverrides.autoFit)}
          style={{
            width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0, position: 'relative',
            background: state.styleOverrides.autoFit ? '#2563eb' : '#e2e8f0',
          }}
        >
          <span style={{
            position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 8, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            left: state.styleOverrides.autoFit ? 18 : 2, transition: 'left 0.15s',
          }} />
        </button>
      </div>
    </div>
  );
}

export default SpacingControls;
