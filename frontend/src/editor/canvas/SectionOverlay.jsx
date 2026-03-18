/**
 * SectionOverlay — Bounding outline overlay for sections in Layout Edit mode
 * Shows selection highlight, section label, and hover state
 */
import React from 'react';
import { useEditor } from '../context/EditorContext';

const SECTION_NAMES = {
  HeaderSection: 'Header',
  SummarySection: 'Summary',
  ExperienceSection: 'Experience',
  EducationSection: 'Education',
  SkillsSection: 'Skills',
};

function SectionOverlay({ sectionName, children }) {
  const { state, actions } = useEditor();

  const isLayoutMode = state.editorMode === 'layout';
  const isStyleMode = state.editorMode === 'style';
  const isSelected = state.selectedSection === sectionName;
  const showOverlay = isLayoutMode || isStyleMode;

  if (!showOverlay) {
    return <div className="section-wrapper">{children}</div>;
  }

  return (
    <div
      className={`
        section-overlay relative group transition-all duration-150
        ${isLayoutMode ? 'cursor-pointer' : ''}
        ${isSelected
          ? 'ring-2 ring-blue-400 ring-offset-1 rounded-sm'
          : isLayoutMode
            ? 'hover:ring-1 hover:ring-blue-200 hover:ring-offset-1 rounded-sm'
            : ''
        }
      `}
      onClick={() => actions.setSelectedSection(sectionName)}
    >
      {/* Section label badge */}
      {isLayoutMode && (
        <div className={`
          absolute -top-2.5 left-2 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider rounded z-10
          transition-opacity duration-150
          ${isSelected
            ? 'bg-blue-500 text-white opacity-100'
            : 'bg-slate-200 text-slate-500 opacity-0 group-hover:opacity-100'
          }
        `}>
          {SECTION_NAMES[sectionName] || sectionName}
        </div>
      )}

      {/* Content */}
      <div className={isSelected && isLayoutMode ? 'bg-blue-50/30' : ''}>
        {children}
      </div>
    </div>
  );
}

export default SectionOverlay;
