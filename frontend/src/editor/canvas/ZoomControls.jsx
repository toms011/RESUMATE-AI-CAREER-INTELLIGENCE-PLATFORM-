/**
 * ZoomControls — Zoom in/out/fit controls for the canvas
 */
import React from 'react';
import { useEditor } from '../context/EditorContext';

function ZoomControls() {
  const { state, actions } = useEditor();
  const zoomPercent = Math.round(state.zoom * 100);

  return (
    <div className="zoom-controls flex items-center gap-1 bg-white rounded-lg shadow-md border border-slate-200 px-2 py-1">
      <button
        onClick={actions.zoomOut}
        disabled={state.zoom <= 0.25}
        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors disabled:opacity-30"
        title="Zoom out"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </button>

      <span className="text-xs font-medium text-slate-600 w-10 text-center tabular-nums">
        {zoomPercent}%
      </span>

      <button
        onClick={actions.zoomIn}
        disabled={state.zoom >= 2.0}
        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors disabled:opacity-30"
        title="Zoom in"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <div className="w-px h-4 bg-slate-200 mx-1" />

      <button
        onClick={actions.zoomFit}
        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
        title="Fit to view"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    </div>
  );
}

export default ZoomControls;
