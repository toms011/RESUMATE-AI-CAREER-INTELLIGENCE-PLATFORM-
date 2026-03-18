/**
 * ColorControls — Accent color and header color pickers
 *
 * Uses local draft state for the color inputs so the native color picker
 * dragging does NOT dispatch to context on every mousemove frame.
 * Context is updated only on pointer-release (onBlur / onPointerUp).
 */
import React, { useState, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';

const PRESET_COLORS = [
  { value: '#2563eb', label: 'Blue' },
  { value: '#0891b2', label: 'Cyan' },
  { value: '#059669', label: 'Green' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#dc2626', label: 'Red' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#ca8a04', label: 'Gold' },
  { value: '#475569', label: 'Slate' },
  { value: '#1e293b', label: 'Dark' },
  { value: '#be185d', label: 'Pink' },
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#0d9488', label: 'Teal' },
];

function ColorControls() {
  const { state, actions, mergedStyles } = useEditor();

  const committedAccent = state.styleOverrides.accentColor || mergedStyles.accentColor || '#2563eb';
  const currentHeaderColor = state.styleOverrides.headerColor || mergedStyles.headerColor || 'inherit';

  // Local-only draft — does NOT trigger context on every picker mousemove
  const [draftColor, setDraftColor] = useState(committedAccent);

  // Keep draft in sync when context changes externally (preset click, reset)
  useEffect(() => {
    setDraftColor(committedAccent);
  }, [committedAccent]);

  const commitColor = (color) => actions.setStyleOverride('accentColor', color);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Accent Color */}
      <div>
        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8 }}>
          Accent Color
        </label>

        {/* Preset swatches */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5, marginBottom: 8 }}>
          {PRESET_COLORS.map(color => (
            <button
              key={color.value}
              onClick={() => { setDraftColor(color.value); commitColor(color.value); }}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 6, cursor: 'pointer',
                backgroundColor: color.value,
                border: '2px solid transparent',
                outline: committedAccent === color.value ? '2px solid #2563eb' : 'none',
                outlineOffset: committedAccent === color.value ? 2 : 0,
              }}
              title={color.label}
            />
          ))}
        </div>

        {/* Custom color — local draft, commits on pointer release */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: draftColor, flexShrink: 0, overflow: 'hidden', cursor: 'pointer' }}>
            <input
              type="color"
              value={draftColor}
              onChange={(e) => setDraftColor(e.target.value)}
              onBlur={(e) => commitColor(e.target.value)}
              onPointerUp={(e) => commitColor(e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
          </div>
          <input
            type="text"
            value={draftColor}
            onChange={(e) => {
              const val = e.target.value;
              setDraftColor(val);
              if (/^#[0-9A-Fa-f]{6}$/.test(val)) commitColor(val);
            }}
            style={{ flex: 1, padding: '5px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.75rem', fontFamily: 'monospace' }}
            placeholder="#2563eb"
          />
        </div>
      </div>

      {/* Header Color */}
      <div>
        <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 8 }}>
          Section Header Color
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'Default', color: null },
            { label: 'Accent',  color: committedAccent },
            { label: 'Dark',    color: '#1e293b' },
          ].map(({ label, color }) => {
            const isActive = color === null
              ? !state.styleOverrides.headerColor
              : state.styleOverrides.headerColor === color;
            return (
              <button
                key={label}
                onClick={() => actions.setStyleOverride('headerColor', color)}
                style={{
                  padding: '5px 10px', fontSize: '0.6875rem', borderRadius: 6,
                  border: `1.5px solid ${isActive ? '#2563eb' : '#e2e8f0'}`,
                  background: isActive ? '#eff6ff' : '#fff',
                  color: isActive ? '#2563eb' : '#64748b',
                  cursor: 'pointer', fontWeight: isActive ? 600 : 400,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div style={{ padding: '10px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 4, height: 32, borderRadius: 2, background: committedAccent }} />
        <div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: currentHeaderColor === 'inherit' ? '#1e293b' : currentHeaderColor, margin: 0 }}>
            SECTION TITLE
          </p>
          <p style={{ fontSize: '0.625rem', color: '#94a3b8', margin: 0 }}>Header + accent preview</p>
        </div>
      </div>
    </div>
  );
}

export default ColorControls;
