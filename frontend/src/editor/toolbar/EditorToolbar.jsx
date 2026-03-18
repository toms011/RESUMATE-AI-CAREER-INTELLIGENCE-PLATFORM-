/**
 * EditorToolbar — Dark cd-header matching the certificate designer exactly.
 * Layout: [Back | Title | dirty-pill] ── [mode tabs] ── [Save | Export]
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor } from '../context/EditorContext';
import toast from 'react-hot-toast';
import ExportMenu from './ExportMenu';

const MODES = [
  { id: 'preview', label: 'Preview', icon: '◉' },
  { id: 'layout',  label: 'Layout',  icon: '⊞'  },
  { id: 'style',   label: 'Style',   icon: '◆' },
];

function EditorToolbar() {
  const navigate = useNavigate();
  const { state, actions } = useEditor();
  const [showExport, setShowExport] = useState(false);

  const handleSave = async () => {
    const success = await actions.saveResumeData();
    if (success) toast.success('Resume saved!');
    else toast.error('Failed to save resume');
  };

  const handleBack = () => {
    if (state.isDirty) {
      if (window.confirm('You have unsaved changes. Save before leaving?')) {
        actions.saveResumeData().then(() => navigate(-1));
        return;
      }
    }
    navigate(-1);
  };

  return (
    <div className="cd-header">

      {/* ── LEFT: back + title ── */}
      <div className="cd-header-left">
        <button className="cd-btn cd-btn-ghost" onClick={handleBack}>
          ← Back
        </button>
        <h2 className="cd-title">
          {state.resumeData.title || 'Resume Editor'}
        </h2>
        {state.isDirty && (
          <span className="cd-name-pill">● unsaved</span>
        )}
      </div>

      {/* ── CENTER: mode switcher ── */}
      <div className="cd-mode-tabs">
        {MODES.map(({ id, label, icon }) => (
          <button
            key={id}
            className={`cd-mode-tab${state.editorMode === id ? ' cd-mode-tab-active' : ''}`}
            onClick={() => actions.setEditorMode(id)}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── RIGHT: save + export ── */}
      <div className="cd-header-right">
        <button
          className={`cd-btn ${state.isDirty ? 'cd-btn-save' : 'cd-btn-ghost'}`}
          onClick={handleSave}
          disabled={!state.isDirty || state.isSaving}
        >
          {state.isSaving ? '◐ Saving…' : '▪ Save'}
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className="cd-btn cd-btn-ghost"
            onClick={() => setShowExport(v => !v)}
          >
            ⬇ Export ▾
          </button>
          {showExport && <ExportMenu onClose={() => setShowExport(false)} />}
        </div>
      </div>
    </div>
  );
}

export default EditorToolbar;
