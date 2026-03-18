import React from 'react';

/**
 * Renders all "Additional Details" sections:
 * languages, awards, certifications, activities, websites, references
 *
 * Data shape (additionalDetails):
 *   languages:      [{ language, proficiency }] or [string]
 *   awards:         [string]
 *   certifications: [string]
 *   activities:     [string]
 *   websites:       [{ label, link }]
 *   references:     [{ name, contact }]
 */
const AdditionalSection = ({ data = {}, styles = {} }) => {
    const {
        languages = [],
        awards = [],
        certifications = [],
        activities = [],
        websites = [],
        references = [],
    } = data;

    const hasAny =
        languages.length > 0 ||
        awards.length > 0 ||
        certifications.length > 0 ||
        activities.length > 0 ||
        websites.length > 0 ||
        references.length > 0;

    if (!hasAny) return null;

    // Shared heading style matching other sections
    const headingStyle = {
        fontSize: 'var(--font-size-section)',
        borderBottomWidth: styles.borderBottom ? '1.5px' : '0',
        borderBottomStyle: 'solid',
        borderBottomColor: styles.accentColor || 'var(--accent-color)',
        marginBottom: 'var(--space-para)',
        marginTop: '0',
        color: styles.headerColor || 'inherit',
        textTransform: styles.headerTransform || 'uppercase',
    };

    const sectionStyle = {
        marginBottom: 'var(--space-section)',
        fontSize: 'var(--font-size-body)',
        lineHeight: 'var(--line-height)',
    };

    const itemStyle = {
        marginBottom: '4px',
    };

    return (
        <>
            {/* ── Languages ────────────────────────────── */}
            {languages.length > 0 && (
                <div className="resume-section" style={sectionStyle}>
                    <h2 style={headingStyle}>LANGUAGES</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {languages.map((item, idx) => {
                            const name = typeof item === 'string' ? item : item.language;
                            const level = typeof item === 'object' && item.proficiency ? item.proficiency : null;
                            return (
                                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <strong>{name}</strong>
                                    {level && (
                                        <span style={{ color: '#6b7280', fontSize: '0.9em' }}>({level})</span>
                                    )}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Awards & Honors ───────────────────────── */}
            {awards.length > 0 && (
                <div className="resume-section" style={sectionStyle}>
                    <h2 style={headingStyle}>AWARDS &amp; HONORS</h2>
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {awards.map((item, idx) => (
                            <li key={idx} style={itemStyle}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Certifications ────────────────────────── */}
            {certifications.length > 0 && (
                <div className="resume-section" style={sectionStyle}>
                    <h2 style={headingStyle}>CERTIFICATIONS &amp; LICENSES</h2>
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {certifications.map((item, idx) => (
                            <li key={idx} style={itemStyle}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Activities ───────────────────────────── */}
            {activities.length > 0 && (
                <div className="resume-section" style={sectionStyle}>
                    <h2 style={headingStyle}>ACTIVITIES</h2>
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                        {activities.map((item, idx) => (
                            <li key={idx} style={itemStyle}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Websites & Social Links ──────────────── */}
            {websites.length > 0 && (
                <div className="resume-section" style={sectionStyle}>
                    <h2 style={headingStyle}>WEBSITES &amp; SOCIAL LINKS</h2>
                    <div>
                        {websites.map((item, idx) => {
                            const label = typeof item === 'string' ? item : item.label;
                            const link = typeof item === 'object' ? item.link : null;
                            return (
                                <div key={idx} style={itemStyle}>
                                    {link ? (
                                        <span>
                                            <strong>{label}:</strong>{' '}
                                            <span style={{ color: styles.accentColor || 'var(--accent-color)' }}>
                                                {link}
                                            </span>
                                        </span>
                                    ) : (
                                        <span>{label}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── References ───────────────────────────── */}
            {references.length > 0 && (
                <div className="resume-section" style={sectionStyle}>
                    <h2 style={headingStyle}>REFERENCES</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                        {references.map((item, idx) => {
                            const name = typeof item === 'string' ? item : item.name;
                            const contact = typeof item === 'object' ? item.contact : null;
                            return (
                                <div key={idx} style={{ minWidth: '150px' }}>
                                    <strong>{name}</strong>
                                    {contact && (
                                        <div style={{ fontSize: '0.9em', color: '#6b7280' }}>{contact}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
};

export default AdditionalSection;
