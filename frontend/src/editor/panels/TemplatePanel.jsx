/**
 * TemplatePanel — Template selector for the editor's left panel
 * Reuses backend template data via EditorContext
 */
import React from 'react';
import { useEditor } from '../context/EditorContext';

function TemplatePanel() {
  const { state, actions } = useEditor();
  const { availableTemplates, templateConfig } = state;

  if (!availableTemplates.length) {
    return (
      <div className="template-panel">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Templates
        </h3>
        <p className="text-xs text-slate-400 px-1">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="template-panel">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
        Templates
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {availableTemplates.map(template => {
          const isActive = templateConfig.id === template.id;
          return (
            <button
              key={template.id}
              onClick={() => actions.setTemplate(template.id)}
              className={`
                relative group rounded-lg border-2 p-2 transition-all duration-200 text-left
                ${isActive
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white'
                }
              `}
            >
              {/* Mini preview */}
              <div className={`
                w-full aspect-[210/297] rounded bg-white border border-slate-100 mb-2
                flex flex-col items-center justify-start p-2 overflow-hidden
                ${isActive ? 'border-blue-200' : ''}
              `}>
                {/* Mini A4 skeleton */}
                <div className="w-full space-y-1">
                  <div className="h-1.5 bg-slate-200 rounded w-3/4 mx-auto" />
                  <div className="h-1 bg-slate-100 rounded w-1/2 mx-auto" />
                  <div className="h-0.5 bg-slate-100 rounded w-full mt-1.5" />
                  <div className="space-y-0.5 mt-1">
                    <div className="h-0.5 bg-slate-100 rounded w-full" />
                    <div className="h-0.5 bg-slate-100 rounded w-5/6" />
                    <div className="h-0.5 bg-slate-100 rounded w-4/6" />
                  </div>
                  <div className="h-0.5 bg-slate-100 rounded w-full mt-1.5" />
                  <div className="space-y-0.5 mt-1">
                    <div className="h-0.5 bg-slate-100 rounded w-full" />
                    <div className="h-0.5 bg-slate-100 rounded w-3/4" />
                  </div>
                </div>
                {/* Accent stripe */}
                <div
                  className="absolute top-2 left-2 w-1 h-6 rounded-full opacity-60"
                  style={{ backgroundColor: template.styles?.accentColor || '#3b82f6' }}
                />
              </div>

              {/* Name */}
              <p className={`text-[11px] font-medium truncate ${isActive ? 'text-blue-700' : 'text-slate-600'}`}>
                {template.name}
              </p>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TemplatePanel;
