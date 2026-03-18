/**
 * SectionList — Drag-to-reorder section list with visibility toggles
 * Used in the Left Panel of the editor.
 */
import React, { useState, useRef } from 'react';
import { useEditor } from '../context/EditorContext';

const SECTION_LABELS = {
  HeaderSection: { label: 'Header', icon: '●', description: 'Name, title, contact info' },
  SummarySection: { label: 'Summary', icon: '✎', description: 'Professional summary' },
  ExperienceSection: { label: 'Experience', icon: '◼', description: 'Work history' },
  EducationSection: { label: 'Education', icon: '△', description: 'Education background' },
  SkillsSection: { label: 'Skills', icon: '⚡', description: 'Technical & soft skills' },
};

function SectionList() {
  const { state, actions, mergedSectionOrder } = useEditor();
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragNodeRef = useRef(null);

  const isLayoutMode = state.editorMode === 'layout';

  const handleDragStart = (e, index) => {
    if (!isLayoutMode) return;
    dragNodeRef.current = index;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image
    const ghost = document.createElement('div');
    ghost.style.opacity = '0';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    actions.moveSection(dragIndex, index);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Arrow-based reorder for accessibility
  const handleMoveUp = (index) => {
    if (index <= 0) return;
    actions.moveSection(index, index - 1);
  };

  const handleMoveDown = (index) => {
    if (index >= mergedSectionOrder.length - 1) return;
    actions.moveSection(index, index + 1);
  };

  return (
    <div className="section-list">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
        Sections
      </h3>
      <div className="space-y-1">
        {mergedSectionOrder.map((sectionName, index) => {
          const meta = SECTION_LABELS[sectionName] || { label: sectionName, icon: '▤', description: '' };
          const isVisible = state.layoutOverrides.sectionVisibility[sectionName] !== false;
          const isSelected = state.selectedSection === sectionName;
          const isDragging = dragIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={sectionName}
              className={`
                section-list-item group flex items-center gap-2 px-3 py-2.5 rounded-lg
                transition-all duration-150 cursor-pointer select-none
                ${isSelected ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}
                ${isDragging ? 'opacity-40' : ''}
                ${isDragOver ? 'border-t-2 border-t-blue-400' : ''}
                ${!isVisible ? 'opacity-50' : ''}
              `}
              draggable={isLayoutMode}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => actions.setSelectedSection(sectionName)}
            >
              {/* Drag handle */}
              {isLayoutMode && (
                <span className="text-slate-300 cursor-grab active:cursor-grabbing text-sm flex-shrink-0" title="Drag to reorder">
                  ⠿
                </span>
              )}

              {/* Icon */}
              <span className="text-base flex-shrink-0">{meta.icon}</span>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                  {meta.label}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{meta.description}</p>
              </div>

              {/* Reorder arrows (layout mode) */}
              {isLayoutMode && (
                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                    disabled={index === 0}
                    className="text-[10px] text-slate-400 hover:text-blue-500 disabled:opacity-30 leading-none"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                    disabled={index === mergedSectionOrder.length - 1}
                    className="text-[10px] text-slate-400 hover:text-blue-500 disabled:opacity-30 leading-none"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>
              )}

              {/* Visibility toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  actions.toggleSectionVisibility(sectionName);
                }}
                className={`
                  flex-shrink-0 w-8 h-5 rounded-full transition-colors duration-200 relative
                  ${isVisible ? 'bg-blue-500' : 'bg-slate-200'}
                `}
                title={isVisible ? 'Hide section' : 'Show section'}
              >
                <span className={`
                  absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
                  ${isVisible ? 'left-3.5' : 'left-0.5'}
                `} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SectionList;
