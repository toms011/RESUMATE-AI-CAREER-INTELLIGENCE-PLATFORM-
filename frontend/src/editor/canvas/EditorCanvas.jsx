/**
 * EditorCanvas — Center panel with A4 paper, zoom, and section overlays
 *
 * Renders the resume using the existing TemplateRenderer pipeline
 * but wraps sections with SectionOverlay for layout editing mode.
 * Does NOT use free pixel-level dragging.
 */
import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from '../context/EditorContext';
import { useOverflowDetection } from '../hooks/useOverflowDetection';
import SectionOverlay from './SectionOverlay';
import ZoomControls from './ZoomControls';
import { mmToPx, ptToPx, RESUME_STYLES } from '../../utils/resumeStyles';

// Section components (reused from existing codebase)
import HeaderSection from '../../components/sections/HeaderSection';
import SummarySection from '../../components/sections/SummarySection';
import ExperienceSection from '../../components/sections/ExperienceSection';
import EducationSection from '../../components/sections/EducationSection';
import SkillsSection from '../../components/sections/SkillsSection';

const SECTION_COMPONENTS = {
  HeaderSection,
  SummarySection,
  ExperienceSection,
  EducationSection,
  SkillsSection,
};

function EditorCanvas() {
  const {
    state,
    actions,
    visibleSections,
    mergedStyles,
    effectiveFontScale,
    effectiveLineHeight,
    effectiveMargins,
  } = useEditor();

  const containerRef = useRef(null);
  const [containerScale, setContainerScale] = useState(1);

  // Auto-fit overflow detection
  useOverflowDetection({
    currentFontScale: effectiveFontScale,
    setFontScale: (scale) => actions.setStyleOverride('fontScale', scale),
    autoFit: state.styleOverrides.autoFit || false,
  });

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const A4_WIDTH_PX = mmToPx(A4_WIDTH_MM);
  const A4_HEIGHT_PX = mmToPx(A4_HEIGHT_MM);

  // Responsive scaling to fit container
  useEffect(() => {
    const handleResize = (entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      const padding = 60; // px padding around paper
      const availWidth = Math.max(0, width - padding);
      const availHeight = Math.max(0, height - padding);

      const scaleW = availWidth / A4_WIDTH_PX;
      const scaleH = availHeight / A4_HEIGHT_PX;
      const fitScale = Math.min(scaleW, scaleH, 1.0); // never scale > 100%
      setContainerScale(fitScale);
    };

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Final scale = container fit * user zoom
  const finalScale = containerScale * state.zoom;

  // Font scaling helper
  const s = (val) => ptToPx(val * effectiveFontScale);

  // Build data map for section components
  const { personalInfo, experiences, education, skills } = state.resumeData;
  const dataMap = {
    HeaderSection: personalInfo,
    SummarySection: personalInfo?.summary,
    ExperienceSection: experiences,
    EducationSection: education,
    SkillsSection: skills,
  };

  // Is inline editing enabled (only in layout mode with a selection)
  const allowInlineEdit = state.editorMode === 'layout';

  // CSS custom properties for template styling
  const paperStyles = {
    fontFamily: mergedStyles.fontFamily || RESUME_STYLES.fonts.body,
    '--accent-color': mergedStyles.accentColor || '#2563eb',
    '--font-size-name': `${s(RESUME_STYLES.baseSizes.headerName)}px`,
    '--font-size-title': `${s(RESUME_STYLES.baseSizes.headerTitle)}px`,
    '--font-size-section': `${s(RESUME_STYLES.baseSizes.sectionTitle)}px`,
    '--font-size-body': `${s(RESUME_STYLES.baseSizes.body)}px`,
    '--font-size-meta': `${s(RESUME_STYLES.baseSizes.meta)}px`,
    '--line-height': effectiveLineHeight,
    '--space-para': `${s(RESUME_STYLES.spacing.paragraphBottom)}px`,
    '--space-section': `${s(RESUME_STYLES.spacing.sectionBottom)}px`,
    width: `${A4_WIDTH_MM}mm`,
    minHeight: `${A4_HEIGHT_MM}mm`,
    padding: `${effectiveMargins.top}mm ${effectiveMargins.right}mm ${effectiveMargins.bottom}mm ${effectiveMargins.left}mm`,
    boxSizing: 'border-box',
    backgroundColor: 'white',
    color: '#000000',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)',
    margin: '0 auto',
    position: 'relative',
  };

  return (
    <div className="editor-canvas-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', position: 'relative', background: '#e2e8f0' }}>
      {/* Zoom controls overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <ZoomControls />
      </div>

      {/* Safe margin guides (optional visual) */}
      {state.editorMode === 'layout' && (
        <div className="absolute top-2 right-3 z-10">
          <span className="text-[9px] text-slate-400 bg-slate-200/80 px-1.5 py-0.5 rounded">
            {effectiveMargins.top}mm margins
          </span>
        </div>
      )}

      {/* Scrollable canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-start justify-center p-8"
        style={{ minHeight: 0 }}
      >
        <div
          className="canvas-scaler"
          style={{
            transform: `scale(${finalScale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
          }}
        >
          {/* A4 Paper */}
          <div
            id="editor-resume-paper"
            className={`resume-paper template-${state.templateConfig.id}`}
            style={paperStyles}
          >
            {visibleSections.map((sectionName, index) => {
              const Component = SECTION_COMPONENTS[sectionName];
              const sectionData = dataMap[sectionName];
              if (!Component) return null;

              return (
                <SectionOverlay key={sectionName} sectionName={sectionName}>
                  <Component
                    data={sectionData}
                    styles={mergedStyles}
                    isEditing={allowInlineEdit}
                    onUpdate={actions.handleInlineUpdate}
                  />
                </SectionOverlay>
              );
            })}

            {/* Empty state */}
            {visibleSections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium">All sections are hidden</p>
                <p className="text-xs mt-1">Toggle section visibility in the left panel</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorCanvas;
