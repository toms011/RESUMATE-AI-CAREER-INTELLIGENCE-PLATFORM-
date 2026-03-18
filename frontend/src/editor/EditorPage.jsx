/**
 * EditorPage — Main editor route component
 * Route: /resume/:id/editor
 *
 * Shell uses cd-* classes to exactly match CertificateDesigner layout:
 *   EditorProvider (context / state management)
 *   ├─ cd-header  (EditorToolbar)
 *   └─ cd-body   3-column grid
 *      ├─ cd-side cd-left  (LeftPanel: sections, templates)
 *      ├─ EditorCanvas     (A4 preview with zoom & overlays)
 *      └─ cd-side cd-right (RightPanel: typography, colors, spacing)
 */
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { EditorProvider, useEditor } from './context/EditorContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EditorToolbar from './toolbar/EditorToolbar';
import LeftPanel from './panels/LeftPanel';
import RightPanel from './panels/RightPanel';
import EditorCanvas from './canvas/EditorCanvas';
import '../styles/CertificateDesigner.css';
import './EditorPage.css';

function EditorLayout() {
  const { state } = useEditor();

  if (state.isLoading) {
    return <LoadingSpinner message="Loading Editor" sub="Preparing your resume…" />;
  }

  if (state.error) {
    return (
      <div className="editor-error">
        <div className="editor-error-content">
          <span className="editor-error-icon">⚠</span>
          <h2>Failed to Load Resume</h2>
          <p>{state.error}</p>
          <button onClick={() => window.history.back()} className="editor-error-btn">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cd-root">
      {/* ── Dark header toolbar (cd-header inside EditorToolbar) ── */}
      <EditorToolbar />

      {/* ── Fixed 3-column workspace matching CertificateDesigner ── */}
      <div className="cd-body">
        {/* Left panel: sections & templates */}
        <div className="cd-side cd-left">
          <LeftPanel />
        </div>

        {/* Center: A4 resume preview */}
        <EditorCanvas />

        {/* Right panel: typography, colors, spacing */}
        <div className="cd-side cd-right">
          <RightPanel />
        </div>
      </div>
    </div>
  );
}

function EditorPage() {
  const { id } = useParams();

  // Auth check
  const user = localStorage.getItem('user');
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!id) {
    return <Navigate to="/my-resumes" replace />;
  }

  return (
    <EditorProvider resumeId={id}>
      <EditorLayout />
    </EditorProvider>
  );
}

export default EditorPage;
