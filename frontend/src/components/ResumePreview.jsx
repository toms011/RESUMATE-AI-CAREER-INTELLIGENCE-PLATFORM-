import React, { useState, useEffect, useRef } from 'react';
import './ResumePreview.css';
import { mmToPx } from '../utils/resumeStyles';
import TemplateRenderer from './TemplateRenderer';

function ResumePreview({
  data,
  experiences,
  education,
  skills,
  additionalDetails,
  templateId = 1,
  designSettings = {},
  blurMode = false,
  fontScale = 1.0,
  isEditing = false,
  onUpdate
}) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = (entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      const A4_WIDTH_PX = mmToPx(210); // Standard A4 width in screen pixels
      const availableWidth = Math.max(0, width - 40); // minus padding
      let newScale = availableWidth / A4_WIDTH_PX;
      newScale = Math.min(newScale, 1.0); // Never scale up > 100%
      setScale(newScale);
    };

    const observeTarget = containerRef.current; // Copy ref to variable
    const observer = new ResizeObserver(handleResize);
    if (observeTarget) {
      observer.observe(observeTarget);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="preview-container" ref={containerRef}>
      <div
        id="resume-preview-scaler" // ID for capture
        className="preview-scaler"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
      >
        <div
          id="resume-paper" // Specific ID for height measurement
          className={`resume-paper template-${templateId} ${blurMode ? 'blurred' : ''}`}
          style={{
            width: '210mm',
            minHeight: '297mm',
            padding: '20mm', // Standard padding, or dynamic
            boxSizing: 'border-box',
            backgroundColor: 'white',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            margin: '0 auto'
          }}
        >
          <TemplateRenderer
            data={data}
            experiences={experiences}
            education={education}
            skills={skills}
            additionalDetails={additionalDetails}
            templateId={templateId}
            fontScale={fontScale}
            isEditing={isEditing}
            onUpdate={onUpdate}
          />
        </div>
      </div>
    </div>
  );
}

export default ResumePreview;


