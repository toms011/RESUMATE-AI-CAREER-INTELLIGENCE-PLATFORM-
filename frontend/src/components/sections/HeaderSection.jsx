import InlineEditor from '../editor/InlineEditor';
import React from 'react';

const HeaderSection = ({ data, styles, isEditing, onUpdate }) => {
    const {
        full_name, job_title, email, phone, location, linkedin, github,
        profile_image_url, profile_image_enabled
    } = data || {};

    // ── Image config from template styles ──────────────────────────────
    const showImage = profile_image_enabled && profile_image_url;
    const imagePosition = styles.imagePosition || 'right';   // 'left' | 'right' | 'center'
    const imageShape    = styles.imageShape    || 'circle';  // 'circle' | 'square'
    const imageSize     = styles.imageSize     || 90;        // px

    const imgStyle = {
        width:        `${imageSize}px`,
        height:       `${imageSize}px`,
        borderRadius: imageShape === 'circle' ? '50%' : '6px',
        objectFit:    'cover',
        display:      'block',
        flexShrink:    0,
        border:       `2px solid ${styles.accentColor || '#e5e7eb'}`,
    };

    // ── Text content block ─────────────────────────────────────────────
    const textBlock = (
        <div
            className="header-content"
            style={{ flex: 1, textAlign: styles.textAlign || 'left' }}
        >
            <div style={{
                fontSize:   'var(--font-size-name)',
                marginBottom: 'var(--space-para)',
                color:      styles.nameColor || 'inherit',
                fontWeight: styles.nameWeight || 'bold'
            }}>
                <InlineEditor
                    value={full_name || 'YOUR NAME'}
                    onChange={(val) => onUpdate && onUpdate('personal_info', null, 'full_name', val)}
                    isEditable={isEditing}
                    tagName="h1"
                />
            </div>

            {(job_title || isEditing) && (
                <div className="job-title" style={{
                    fontSize:     'var(--font-size-title)',
                    color:        styles.accentColor || 'var(--accent-color)',
                    marginBottom: 'var(--space-para)'
                }}>
                    <InlineEditor
                        value={job_title || 'Job Title'}
                        onChange={(val) => onUpdate && onUpdate('personal_info', null, 'job_title', val)}
                        isEditable={isEditing}
                    />
                </div>
            )}

            <div className="contact-info" style={{
                fontSize: 'var(--font-size-meta)',
                display:  'flex',
                flexWrap: 'wrap',
                gap:      '8px',
                justifyContent: styles.textAlign === 'center' ? 'center' : 'flex-start'
            }}>
                {email    && <span>{email}</span>}
                {phone    && <span>• {phone}</span>}
                {location && <span>• {location}</span>}
                {linkedin && <span>• <a href={linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></span>}
                {github   && <span>• <a href={github}   target="_blank" rel="noopener noreferrer">GitHub</a></span>}
            </div>
        </div>
    );

    // ── Image element (aria-hidden so ATS ignores it) ─────────────────
    const imageElement = showImage ? (
        <img
            src={profile_image_url}
            alt=""
            aria-hidden="true"
            style={imgStyle}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
    ) : null;

    // ── Layout: centered image ────────────────────────────────────────
    if (showImage && imagePosition === 'center') {
        return (
            <div
                className="resume-header"
                style={{
                    marginBottom: styles.marginBottom || 'var(--space-section)',
                    display:     'flex',
                    flexDirection: 'column',
                    alignItems:  'center',
                    gap:         '10px',
                    textAlign:   'center'
                }}
            >
                {imageElement}
                <div style={{ flex: 1, width: '100%', textAlign: 'center' }}>
                    {React.cloneElement(textBlock, {
                        style: { ...textBlock.props.style, textAlign: 'center' }
                    })}
                </div>
            </div>
        );
    }

    // ── Layout: left or right image (flex row) ───────────────────────
    if (showImage) {
        return (
            <div
                className="resume-header"
                style={{
                    marginBottom: styles.marginBottom || 'var(--space-section)',
                    display:     'flex',
                    alignItems:  'center',
                    gap:         '16px',
                    flexDirection: imagePosition === 'left' ? 'row' : 'row-reverse',
                }}
            >
                {imageElement}
                {textBlock}
            </div>
        );
    }

    // ── Layout: no image (original behaviour) ────────────────────────
    return (
        <div className="resume-header" style={{ marginBottom: styles.marginBottom || 'var(--space-section)' }}>
            {textBlock}
        </div>
    );
};

export default HeaderSection;
