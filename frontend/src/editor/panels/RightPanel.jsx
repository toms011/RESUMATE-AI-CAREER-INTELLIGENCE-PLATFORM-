/**
 * RightPanel — Editor right sidebar using cd-* class system.
 * Tab-bar (cd-section) selects which control panel is visible — one
 * at a time to avoid cascading re-renders from all three simultaneously.
 */
import React, { useState } from 'react';
import { useEditor } from '../context/EditorContext';
import TypographyControls from '../controls/TypographyControls';
import ColorControls from '../controls/ColorControls';
import SpacingControls from '../controls/SpacingControls';

const TABS = [
  { id: 'typography', label: 'Type',  icon: 'Aa' },
  { id: 'colors',     label: 'Color', icon: '◆' },
  { id: 'spacing',    label: 'Space', icon: '↕'  },
];

function RightPanel() {
  const { actions } = useEditor();
  const [active, setActive] = useState('typography');

  return (
    <>
      {/* ── Tab selector ── */}
      <div className="cd-section" style={{ marginBottom: 4 }}>
        <div className="cd-section-hd">Style Controls</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`cd-elem-btn${active === t.id ? ' cd-elem-btn-active' : ''}`}
              style={{ flex: 1, padding: '6px 4px' }}
            >
              <span className="cd-elem-icon" style={{ fontSize: '0.85rem' }}>{t.icon}</span>
              <span className="cd-elem-lbl">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Single active control panel ── */}
      <div className="cd-section">
        {active === 'typography' && <TypographyControls />}
        {active === 'colors'     && <ColorControls />}
        {active === 'spacing'    && <SpacingControls />}
      </div>

      {/* ── Reset ── */}
      <div className="cd-section">
        <button
          className="cd-btn cd-btn-ghost"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={actions.resetStyles}
        >
          ↺ Reset to Template Defaults
        </button>
      </div>
    </>
  );
}

export default RightPanel;
