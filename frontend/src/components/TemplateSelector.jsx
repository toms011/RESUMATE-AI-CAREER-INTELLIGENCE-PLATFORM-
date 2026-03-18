import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { TEMPLATES as LOCAL_TEMPLATES } from '../utils/templates';
import './TemplateSelector.css';
import LoadingSpinner from './LoadingSpinner';

// ── ATS Warning Modal ────────────────────────────────────────────────────────
function ATSWarningModal({ template, onConfirm, onCancel }) {
  return (
    <div className="ats-modal-backdrop" onClick={onCancel}>
      <div className="ats-modal" onClick={e => e.stopPropagation()}>
        <div className="ats-modal-icon">⚠</div>
        <h3 className="ats-modal-title">Design Template Selected</h3>
        <p className="ats-modal-body">
          <strong>"{template.name}"</strong> uses decorative background elements.
          It may reduce ATS (Applicant Tracking System) compatibility.
        </p>
        <p className="ats-modal-body">
          Recommended only for <strong>direct PDF submissions</strong> or
          creative roles where design matters more than ATS parsing.
        </p>
        <div className="ats-modal-actions">
          <button className="ats-modal-cancel" onClick={onCancel}>
            ← Go Back
          </button>
          <button className="ats-modal-confirm" onClick={onConfirm}>
            Use This Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
function TemplateSelector({ resumeId, currentTemplateId, onTemplateSelect }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(currentTemplateId || 1);
  const [loading, setLoading] = useState(true);
  const [showDesign, setShowDesign] = useState(false);
  const [pendingDesignTemplate, setPendingDesignTemplate] = useState(null);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates');
      const data = response.data;
      if (data && Array.isArray(data) && data.length > 0) {
        setTemplates(data);
      } else {
        setTemplates(LOCAL_TEMPLATES);
      }
    } catch {
      setTemplates(LOCAL_TEMPLATES);
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = async (templateId) => {
    try {
      await api.post(`/resume/${resumeId}/template`, { template_id: templateId });
      setSelectedTemplate(templateId);
      if (onTemplateSelect) onTemplateSelect(templateId);
      toast.success('Template updated!');
    } catch {
      toast.error('Failed to update template');
    }
  };

  const handleSelectTemplate = (template) => {
    if ((template.template_type || 'ATS') === 'DESIGN') {
      // Show ATS warning before applying
      setPendingDesignTemplate(template);
    } else {
      applyTemplate(template.id);
    }
  };

  const handleWarningConfirm = () => {
    if (pendingDesignTemplate) applyTemplate(pendingDesignTemplate.id);
    setPendingDesignTemplate(null);
  };

  const handleWarningCancel = () => setPendingDesignTemplate(null);

  if (loading) {
    return <LoadingSpinner fullPage={false} message="Loading templates…" />;
  }

  const atsTemplates    = templates.filter(t => (t.template_type || 'ATS') === 'ATS');
  const designTemplates = templates.filter(t => (t.template_type || 'ATS') === 'DESIGN');

  const renderCard = (template) => {
    const isSelected = selectedTemplate === template.id;
    const isDesign   = (template.template_type || 'ATS') === 'DESIGN';
    const category   = template.category || 'classic';

    return (
      <div
        key={template.id}
        onClick={() => handleSelectTemplate(template)}
        className={`template-card ${isSelected ? 'template-card-selected' : 'template-card-default'} ${isDesign ? 'template-card-design' : ''}`}
      >
        {/* Preview area */}
        <div className={`template-preview template-preview-${category}`}
          style={isDesign && template.background_image ? {
            backgroundImage: `url(http://localhost:5000${template.background_image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
            fontSize: '0',
          } : {}}>
          {!(isDesign && template.background_image) && (
            <>
              {category === 'modern'  && '◆'}
              {category === 'classic' && '≡'}
              {category === 'minimal' && '✦'}
              {!['modern', 'classic', 'minimal'].includes(category) && '▤'}
            </>
          )}
        </div>

        {/* Info */}
        <div className="template-content">
          <div className="template-name-section">
            <h4 className="template-name">{template.name}</h4>
            {isSelected && <span className="template-checkmark">✓</span>}
          </div>
          <p className="template-description">{template.description}</p>

          <div className="template-badge-section">
            {isDesign ? (
              <span className="template-badge template-badge-design">◆ DESIGN</span>
            ) : (
              <span className={`template-badge template-badge-${category}`}>
                ✓ ATS SAFE
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="template-selector-container">
      {/* ATS Warning Modal */}
      {pendingDesignTemplate && (
        <ATSWarningModal
          template={pendingDesignTemplate}
          onConfirm={handleWarningConfirm}
          onCancel={handleWarningCancel}
        />
      )}

      <div className="template-selector-header">
        <h3 className="template-selector-title">
          <span className="template-icon">◆</span> Choose Resume Template
        </h3>
        <p className="template-selector-subtitle">
          Select a professional template. ATS-safe templates are recommended for most applications.
        </p>
      </div>

      {/* ── Section 1: ATS Templates ── */}
      <div className="template-section">
        <div className="template-section-header">
          <span className="template-section-badge ats">✓ ATS Optimized</span>
          <h4 className="template-section-title">Professional ATS Templates</h4>
          <p className="template-section-desc">Clean, structured layouts that pass automated resume screening.</p>
        </div>
        <div className="template-grid">
          {atsTemplates.length > 0 ? atsTemplates.map(renderCard) : (
            <p className="template-empty">No ATS templates available.</p>
          )}
        </div>
      </div>

      {/* ── Section 2: Design Templates (toggle) ── */}
      {designTemplates.length > 0 && (
        <div className="template-section template-section-design">
          <button
            className="more-templates-btn"
            onClick={() => setShowDesign(v => !v)}
          >
            {showDesign ? '▲ Hide Design Templates' : '◆ More Templates (Design)'}
          </button>

          {showDesign && (
            <>
              <div className="template-section-header" style={{ marginTop: '16px' }}>
                <span className="template-section-badge design">◆ Design</span>
                <h4 className="template-section-title">Design Templates</h4>
                <p className="template-section-desc warning-text">
                  ⚠ These templates use decorative backgrounds. May reduce ATS compatibility — best for direct PDF submissions.
                </p>
              </div>
              <div className="template-grid">{designTemplates.map(renderCard)}</div>
            </>
          )}
        </div>
      )}

      {templates.length === 0 && (
        <div className="template-empty"><p>No templates found.</p></div>
      )}
    </div>
  );
}

export default TemplateSelector;
