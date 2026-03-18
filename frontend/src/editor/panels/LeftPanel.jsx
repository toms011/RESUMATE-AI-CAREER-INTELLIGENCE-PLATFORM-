/**
 * LeftPanel — Editor left sidebar using cd-* class system.
 * Two stacked cd-section blocks (no tabs): Sections + Templates.
 * Matches CertificateDesigner's left panel pattern exactly.
 */
import React from 'react';
import { useEditor } from '../context/EditorContext';
import SectionList from './SectionList';
import TemplatePanel from './TemplatePanel';

function LeftPanel() {
  const { state } = useEditor();

  return (
    <>
      {/* ── Sections block ── */}
      <div className="cd-section">
        <div className="cd-section-hd">≡ Sections</div>
        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 8, marginTop: -2 }}>
          {state.editorMode === 'layout'
            ? 'Drag sections to reorder'
            : 'Switch to Layout mode to reorder'}
        </p>
        <SectionList />
      </div>

      {/* ── Templates block ── */}
      <div className="cd-section">
        <div className="cd-section-hd">≡ Templates</div>
        <TemplatePanel />
      </div>
    </>
  );
}

export default LeftPanel;
