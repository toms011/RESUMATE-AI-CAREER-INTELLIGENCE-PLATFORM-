import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import HeaderSection from './sections/HeaderSection';
import SummarySection from './sections/SummarySection';
import ExperienceSection from './sections/ExperienceSection';
import EducationSection from './sections/EducationSection';
import SkillsSection from './sections/SkillsSection';
import AdditionalSection from './sections/AdditionalSection';
import { RESUME_STYLES, ptToPx } from '../utils/resumeStyles';
import { TEMPLATES as LOCAL_TEMPLATES } from '../utils/templates';

// Map string names to actual components
const SECTION_COMPONENTS = {
    HeaderSection,
    SummarySection,
    ExperienceSection,
    EducationSection,
    SkillsSection,
    AdditionalSection,
};

const BACKEND_BASE = 'http://localhost:5000';

const TemplateRenderer = ({ data, experiences, education, skills, additionalDetails = {}, templateId, fontScale = 1.0, isEditing = false, onUpdate }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usedFallback, setUsedFallback] = useState(false);
    const [bgError, setBgError] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await api.get('/templates');
                if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                    setTemplates(response.data);
                } else {
                    console.warn('API returned empty templates, using local fallback');
                    setTemplates(LOCAL_TEMPLATES);
                    setUsedFallback(true);
                }
            } catch (error) {
                console.error("Error fetching templates, using local fallback:", error);
                setTemplates(LOCAL_TEMPLATES);
                setUsedFallback(true);
            } finally {
                setLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    if (loading) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', minHeight: '200px', color: '#94a3b8', fontSize: '14px'
            }}>
                <span style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }}>◐</span>
                Loading template...
            </div>
        );
    }

    // Resolve template: by ID → first available → hardcoded default
    let template = templates.find(t => t.id === Number(templateId));
    if (!template) template = templates[0];
    if (!template) {
        template = LOCAL_TEMPLATES[0];
    }

    const styles = template.styles || {};
    const isDesign = (template.template_type || 'ATS') === 'DESIGN';
    const padding  = template.content_padding || { top: 15, left: 18, right: 18, bottom: 15 };

    // Helper for scaling
    const s = (val) => ptToPx(val * fontScale);

    // CSS Variables for dynamic styling
    const containerStyle = {
        fontFamily: styles.fontFamily || 'Calibri, sans-serif',
        '--accent-color': styles.accentColor || '#2563eb',
        '--font-size-name': `${s(RESUME_STYLES.baseSizes.headerName)}px`,
        '--font-size-title': `${s(RESUME_STYLES.baseSizes.headerTitle)}px`,
        '--font-size-section': `${s(RESUME_STYLES.baseSizes.sectionTitle)}px`,
        '--font-size-body': `${s(RESUME_STYLES.baseSizes.body)}px`,
        '--font-size-meta': `${s(RESUME_STYLES.baseSizes.meta)}px`,
        '--line-height': RESUME_STYLES.spacing.lineHeight,
        '--space-para': `${s(RESUME_STYLES.spacing.paragraphBottom)}px`,
        '--space-section': `${s(RESUME_STYLES.spacing.sectionBottom)}px`,
        width: '100%',
        height: '100%',
        color: '#000000'
    };

    // Prepare data map
    const dataMap = {
        HeaderSection: data,
        SummarySection: data?.summary,
        ExperienceSection: experiences,
        EducationSection: education,
        SkillsSection: skills,
        AdditionalSection: additionalDetails,
    };

    // Use section_order only if it is non-empty
    const rawOrder = template.sectionOrder || template.section_order;
    const baseSectionOrder = (rawOrder && rawOrder.length > 0)
        ? rawOrder
        : ['HeaderSection', 'SummarySection', 'ExperienceSection', 'EducationSection', 'SkillsSection'];
    const sectionOrder = baseSectionOrder.includes('AdditionalSection')
        ? baseSectionOrder
        : [...baseSectionOrder, 'AdditionalSection'];

    const sections = sectionOrder.map((sectionName, index) => {
        const Component = SECTION_COMPONENTS[sectionName];
        const sectionData = dataMap[sectionName];
        if (!Component) return null;
        return (
            <Component
                key={`${sectionName}-${index}`}
                data={sectionData}
                styles={styles}
                isEditing={isEditing}
                onUpdate={onUpdate}
            />
        );
    });

    // ── DESIGN template: background image + content overlay ────────────────
    if (isDesign) {
        const bgSrc = template.background_image
            ? (template.background_image.startsWith('http')
                ? template.background_image
                : `${BACKEND_BASE}${template.background_image}`)
            : null;

        const contentStyle = {
            position: 'relative',
            zIndex: 1,
            paddingTop:    `${padding.top}mm`,
            paddingLeft:   `${padding.left}mm`,
            paddingRight:  `${padding.right}mm`,
            paddingBottom: `${padding.bottom}mm`,
            boxSizing: 'border-box',
            minHeight: '297mm',
        };

        return (
            <div
                className="template-renderer design-template"
                style={{ ...containerStyle, position: 'relative', overflow: 'hidden', minHeight: '297mm' }}
            >
                {/* Background image layer */}
                {bgSrc && !bgError && (
                    <img
                        src={bgSrc}
                        alt=""
                        aria-hidden="true"
                        className="design-template-bg"
                        onError={() => setBgError(true)}
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'top left',
                            zIndex: 0,
                            pointerEvents: 'none',
                            // Ensure bg prints correctly
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                        }}
                    />
                )}
                {/* Content layer */}
                <div className="design-template-content" style={contentStyle}>
                    {sections}
                </div>
            </div>
        );
    }

    // ── ATS / standard template ─────────────────────────────────────────────
    return (
        <div className="template-renderer" style={containerStyle}>
            {sections}
        </div>
    );
};

export default TemplateRenderer;
